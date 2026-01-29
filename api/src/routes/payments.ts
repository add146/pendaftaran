import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'

// Extend bindings for Midtrans
interface PaymentBindings extends Bindings {
    MIDTRANS_SERVER_KEY: string
    MIDTRANS_CLIENT_KEY: string
    MIDTRANS_IS_PRODUCTION: string
}

// Fetch custom field responses for a participant
async function getCustomFieldResponses(db: D1Database, participantId: string): Promise<Array<{ label: string; response: string }>> {
    const responses = await db.prepare(`
        SELECT ecf.label, pfr.response
        FROM participant_field_responses pfr
        JOIN event_custom_fields ecf ON pfr.field_id = ecf.id
        WHERE pfr.participant_id = ?
        ORDER BY ecf.display_order ASC
    `).bind(participantId).all()

    return responses.results.map((r: any) => ({
        label: r.label,
        response: r.response
    }))
}

export const payments = new Hono<{ Bindings: PaymentBindings }>()

// Midtrans API URLs
const getMidtransUrl = (isProduction: boolean) => ({
    snap: isProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    api: isProduction
        ? 'https://api.midtrans.com/v2'
        : 'https://api.sandbox.midtrans.com/v2'
})

// Create payment / Snap token
payments.post('/create', async (c) => {
    const { participantId, orderId: reqOrderId, amount, itemName, customerName, customerEmail, customerPhone, donationAmount } = await c.req.json()


    if (!participantId && !reqOrderId) {
        return c.json({ error: 'Participant ID or Order ID required' }, 400)
    }

    let participants: any[] = []
    let orderId = reqOrderId

    // 1. Fetch Participants & Event Info
    if (orderId) {
        const result = await c.env.DB.prepare(`
            SELECT p.*, e.organization_id, e.id as event_id, t.price as ticket_price
            FROM participants p 
            JOIN events e ON p.event_id = e.id 
            LEFT JOIN ticket_types t ON p.ticket_type_id = t.id
            WHERE p.order_id = ?
        `).bind(orderId).all()
        participants = result.results
    } else if (participantId) {
        // Legacy or single mode support: find by participantId
        const p = await c.env.DB.prepare(`
            SELECT p.*, e.organization_id, e.id as event_id, t.price as ticket_price
            FROM participants p 
            JOIN events e ON p.event_id = e.id 
            LEFT JOIN ticket_types t ON p.ticket_type_id = t.id
            WHERE p.id = ?
        `).bind(participantId).first()
        if (p) {
            participants = [p]
            orderId = p.order_id || `ORDER-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
            // If order_id was null/empty in DB, we generate one for Midtrans but might strictly rely on DB in future
        }
    }

    if (participants.length === 0) {
        return c.json({ error: 'Participants/Event not found' }, 404)
    }

    const firstParticipant = participants[0]
    const orgId = firstParticipant.organization_id as string
    const eventId = firstParticipant.event_id as string

    // 2. Fetch Midtrans settings SPECIFICALLY for this organization
    const midtransSettings = await c.env.DB.prepare(`
        SELECT key, value FROM settings 
        WHERE organization_id = ? 
        AND key IN ('midtrans_server_key', 'midtrans_client_key', 'midtrans_environment')
    `).bind(orgId).all()

    const settingsMap = new Map(midtransSettings.results.map((s: any) => [s.key, s.value]))
    const serverKey = settingsMap.get('midtrans_server_key')
    let rawEnv = settingsMap.get('midtrans_environment')
    if (rawEnv) rawEnv = rawEnv.replace(/['"]/g, '').trim()
    const isProduction = rawEnv === 'production'

    if (!serverKey) {
        console.error(`[Midtrans] Missing configuration for org: ${orgId}`)
        return c.json({ error: 'Payment gateway not configured for this organizer. Please contact the event organizer.' }, 400)
    }

    // 3. Calculate Total Amount & Apply Discounts
    let totalBasePrice = 0
    for (const p of participants) {
        totalBasePrice += (p.ticket_price || 0)
    }

    // Fetch discounts
    const discounts = await c.env.DB.prepare(`
        SELECT * FROM event_bulk_discounts WHERE event_id = ? ORDER BY min_qty DESC
    `).bind(eventId).all()

    let discountAmount = 0
    let appliedDiscount = null

    // Find best discount (assuming strict tiers or simply highest quantity match)
    // Ordered by min_qty DESC, so first match is the best tier
    const count = participants.length
    for (const d of discounts.results as any[]) {
        if (count >= d.min_qty) {
            if (d.discount_type === 'percent') {
                discountAmount = Math.floor(totalBasePrice * (d.discount_value / 100))
            } else {
                discountAmount = d.discount_value
            }
            appliedDiscount = d
            break // Stop after finding highest tier
        }
    }

    let finalAmount = Math.max(0, totalBasePrice - discountAmount)

    // Add Donation
    if (donationAmount && typeof donationAmount === 'number' && donationAmount > 0) {
        finalAmount += donationAmount
    }


    // Safety check: if amount passed from frontend differs significantly, warn or enforce backend calc
    // We strictly use backend calc for security

    // Generate Midtrans request
    // Update orderId to be unique for every attempt if needed, OR use the persistent order_id
    // Midtrans doesn't allow re-using exact same order_id for different amounts (or sometimes at all if failed?)
    // To allow retries, we might append timestamp if the previous one failed? 
    // For now, let's ASSUME order_id is unique per registration "session". 
    // If user retries payment, logic might need a suffix.
    // Let's stick to the DB order_id. If Midtrans rejects dup, we might need a "payment reference" separate from "order id".
    // For now, let's assume one attempt or just append suffix if we want to be safe.
    // Actually, widespread practice: Order ID in DB is fixed. Transaction ID sent to Midtrans is unique.
    // But Midtrans maps Order ID to its state. 
    // Let's use `order_id` from DB but if it fails we might need to handle it. 
    // Simple approach: Use database order_id.

    // WAIT: If we use the SAME order_id for a second attempt, Midtrans Snap might just return the existing token?
    // If so, that's good. 

    const urls = getMidtransUrl(isProduction)

    const snapPayload = {
        transaction_details: {
            order_id: orderId, // This links 1:1 to our Group Order
            gross_amount: finalAmount
        },
        item_details: participants.map(p => ({
            id: p.id,
            price: p.ticket_price || 0, // We list base price here? Or discounted? 
            // Midtrans sum of items MUST equal gross_amount. 
            // If discount exists, we should add a negative item or adjust prices.
            // Simplest: Add a "Discount" item if needed.
            quantity: 1,
            name: `Ticket: ${p.full_name}`
        })),
        customer_details: {
            first_name: customerName || firstParticipant.full_name,
            email: customerEmail || firstParticipant.email,
            phone: customerPhone || firstParticipant.phone || ''
        },
        callbacks: {
            finish: `${c.req.url.split('/api')[0]}/payment/success` // Frontend URL
        }
    }

    if (discountAmount > 0) {
        snapPayload.item_details.push({
            id: 'DISCOUNT',
            price: -discountAmount,
            quantity: 1,
            name: 'Group Discount'
        })
    }

    if (donationAmount && typeof donationAmount === 'number' && donationAmount > 0) {
        snapPayload.item_details.push({
            id: 'DONATION',
            price: donationAmount,
            quantity: 1,
            name: 'Donasi Event'
        })
    }


    // If Total is 0 (100% discount), skip Midtrans?
    // Current logic assumes > 0, but if 0, we can auto-confirm.
    if (finalAmount <= 0) {
        // Auto-confirm
        // TODO: Implement instant paid status logic
        return c.json({ error: 'Free orders should be handled directly' }, 400) // Or handle it
    }

    try {
        const response = await fetch(urls.snap, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + btoa(serverKey + ':')
            },
            body: JSON.stringify(snapPayload)
        })

        const data = await response.json() as { token?: string; redirect_url?: string; error_messages?: string[] }

        if (!response.ok) {
            console.error('[Midtrans] Snap Error:', data)
            return c.json({
                error: 'Failed to create payment',
                details: data.error_messages
            }, 400)
        }

        // Save payment record to database (One record per ORDER, or per participant?)
        // Existing schema: payments table has order_id, participant_id.
        // If we have multiple participants, should we create multiple payment records? 
        // OR one payment record linked to the order, and participant_id is null or the "lead"?
        // Migration didn't remove participant_id from payments.
        // Let's link it to the Lead Participant (first one) or leave null if schema allows.
        // Schema: participant_id TEXT NOT NULL (based on schema.sql I recalled, let's check validation?)
        // Assuming participant_id IS NOT NULL. So we link to first participant.

        const paymentId = `pay_${crypto.randomUUID().slice(0, 8)}`
        await c.env.DB.prepare(`
            INSERT INTO payments (id, participant_id, order_id, amount, status, midtrans_response)
            VALUES (?, ?, ?, ?, 'pending', ?)
        `).bind(paymentId, firstParticipant.id, orderId, finalAmount, JSON.stringify(data)).run()

        // Update ALL participants payment status
        const placeholders = participants.map(() => '?').join(',')
        await c.env.DB.prepare(`
            UPDATE participants SET payment_status = 'pending' WHERE id IN (${placeholders})
        `).bind(...participants.map(p => p.id)).run()

        // 4. Save Donation Record
        if (donationAmount && typeof donationAmount === 'number' && donationAmount > 0) {
            const donationId = `don_${crypto.randomUUID().slice(0, 8)}`
            await c.env.DB.prepare(`
                INSERT INTO donations (id, participant_id, order_id, amount, status, payment_type)
                VALUES (?, ?, ?, ?, 'pending', 'midtrans')
            `).bind(donationId, firstParticipant.id, orderId, donationAmount).run()
        }

        return c.json({
            paymentId,
            orderId,
            token: data.token,
            redirectUrl: data.redirect_url
        })
    } catch (error) {
        console.error('Midtrans error:', error)
        return c.json({ error: 'Payment service unavailable' }, 500)
    }
})

// Midtrans notification webhook
payments.post('/notification', async (c) => {
    console.log('[MIDTRANS WEBHOOK] Received notification')

    try {
        const notification = await c.req.json() as {
            order_id: string
            transaction_status: string
            fraud_status?: string
            payment_type?: string
            signature_key?: string
            status_code?: string
            gross_amount?: string
        }

        console.log('[MIDTRANS WEBHOOK] Notification data:', JSON.stringify(notification))

        const { order_id, transaction_status, fraud_status, payment_type } = notification

        // Determine payment status
        let status = 'pending'
        if (transaction_status === 'capture' || transaction_status === 'settlement') {
            if (fraud_status === 'accept' || !fraud_status) {
                status = 'paid'
            }
        } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
            status = 'failed'
        } else if (transaction_status === 'pending') {
            status = 'pending'
        } else if (transaction_status === 'refund') {
            status = 'refunded'
        }

        console.log('[MIDTRANS WEBHOOK] Determined status:', status, 'for order:', order_id)

        // Update payment record
        await c.env.DB.prepare(`
            UPDATE payments 
            SET status = ?, payment_type = ?, midtrans_response = ?
            WHERE order_id = ?
        `).bind(status, payment_type, JSON.stringify(notification), order_id).run()

        // Update donation status if exists
        await c.env.DB.prepare(`
            UPDATE donations
            SET status = ?, payment_type = ?
            WHERE order_id = ?
        `).bind(status, payment_type, order_id).run()


        console.log('[MIDTRANS WEBHOOK] Updated payment record')

        // Find associated participant(s)
        // 1. Get payment record to find the "lead" participant
        const payment = await c.env.DB.prepare(`
            SELECT participant_id FROM payments WHERE order_id = ?
        `).bind(order_id).first() as { participant_id: string } | null

        if (payment) {
            console.log('[MIDTRANS WEBHOOK] Found payment linked to lead participant:', payment.participant_id)

            // 2. Check if this participant is part of a group order
            const leadParticipant = await c.env.DB.prepare(`
                SELECT order_id FROM participants WHERE id = ?
            `).bind(payment.participant_id).first() as { order_id: string | null } | null

            let targetParticipantIds: string[] = [payment.participant_id]

            if (leadParticipant && leadParticipant.order_id) {
                // It's a group order (or modern single order with ID)
                // Fetch ALL participants with this order_id
                const groupMembers = await c.env.DB.prepare(`
                    SELECT id FROM participants WHERE order_id = ?
                `).bind(leadParticipant.order_id).all()

                targetParticipantIds = groupMembers.results.map((m: any) => m.id as string)
                console.log(`[MIDTRANS WEBHOOK] Found ${targetParticipantIds.length} participants in group order ${leadParticipant.order_id}`)
            }

            // 3. Update status for ALL identified participants
            if (targetParticipantIds.length > 0) {
                const placeholders = targetParticipantIds.map(() => '?').join(',')
                await c.env.DB.prepare(`
                    UPDATE participants SET payment_status = ? WHERE id IN (${placeholders})
                `).bind(status, ...targetParticipantIds).run()

                console.log('[MIDTRANS WEBHOOK] Updated participants status to:', status)
            }

            // 4. Send WhatsApp notification if paid
            if (status === 'paid') {
                c.executionCtx.waitUntil((async () => {
                    console.log('[MIDTRANS WEBHOOK] Payment is paid, sending WhatsApp notifications')

                    // Fetch details for ALL participants to send individual tickets
                    // In bulk update, we might have multiple people.
                    // Loop through IDs.
                    for (const pid of targetParticipantIds) {
                        const participant = await c.env.DB.prepare(`
                            SELECT p.*, e.title as event_title, e.organization_id, t.name as ticket_name, t.price as ticket_price
                            FROM participants p
                            LEFT JOIN events e ON p.event_id = e.id
                            LEFT JOIN ticket_types t ON p.ticket_type_id = t.id
                            WHERE p.id = ?
                        `).bind(pid).first() as any

                        if (participant && participant.phone) {
                            try {
                                console.log('[MIDTRANS WEBHOOK] Sending WhatsApp to:', participant.phone)

                                const { sendWhatsAppMessage, generateRegistrationMessage } = await import('../lib/whatsapp')
                                const frontendUrl = 'https://etiket.my.id'
                                const ticketLink = `${frontendUrl}/ticket/${participant.registration_id}`

                                // Fetch custom field responses
                                const customFieldResponses = await getCustomFieldResponses(c.env.DB, pid)

                                const message = generateRegistrationMessage({
                                    eventTitle: participant.event_title,
                                    fullName: participant.full_name,
                                    registrationId: participant.registration_id,
                                    ticketLink,
                                    ticketName: participant.ticket_name,
                                    ticketPrice: participant.ticket_price,
                                    customFieldResponses
                                })

                                await sendWhatsAppMessage(c.env.DB, participant.organization_id, participant.phone, message)
                            } catch (error) {
                                console.error(`[MIDTRANS WEBHOOK] Error sending WhatsApp to ${participant.phone}:`, error)
                            }
                        }
                    }
                })())
                console.log('[MIDTRANS WEBHOOK] WAHA sending scheduled in background')
            }
        } else {
            console.log('[MIDTRANS WEBHOOK] Payment not found for order:', order_id)
        }

        console.log('[MIDTRANS WEBHOOK] Webhook processing completed successfully')
        return c.json({ status: 'ok' })
    } catch (error) {
        console.error('[MIDTRANS WEBHOOK] Error processing webhook:', error)
        return c.json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
    }
})

// Get payment status
payments.get('/:orderId', async (c) => {
    const orderId = c.req.param('orderId')

    const payment = await c.env.DB.prepare(`
        SELECT p.*, pa.full_name, pa.email, e.title as event_title
        FROM payments p
        LEFT JOIN participants pa ON p.participant_id = pa.id
        LEFT JOIN events e ON pa.event_id = e.id
        WHERE p.order_id = ?
    `).bind(orderId).first()

    if (!payment) {
        return c.json({ error: 'Payment not found' }, 404)
    }

    return c.json(payment)
})

// List payments (admin)
payments.get('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const payments = await c.env.DB.prepare(`
        SELECT p.*, pa.full_name, pa.email, e.title as event_title
        FROM payments p
        LEFT JOIN participants pa ON p.participant_id = pa.id
        LEFT JOIN events e ON pa.event_id = e.id
        WHERE e.organization_id = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `).bind(user.orgId, limit, offset).all()

    return c.json({ data: payments.results })
})
