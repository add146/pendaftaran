import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'

// Extend bindings for Midtrans
interface PaymentBindings extends Bindings {
    MIDTRANS_SERVER_KEY: string
    MIDTRANS_CLIENT_KEY: string
    MIDTRANS_IS_PRODUCTION: string
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
    const { participantId, amount, itemName, customerName, customerEmail, customerPhone } = await c.req.json()

    if (!participantId || !amount) {
        return c.json({ error: 'Participant ID and amount required' }, 400)
    }

    // Fetch Midtrans settings from database
    const midtransSettings = await c.env.DB.prepare(`
        SELECT key, value FROM settings WHERE key IN ('midtrans_server_key', 'midtrans_client_key', 'midtrans_environment')
    `).all()

    const settingsMap = new Map(midtransSettings.results.map((s: any) => [s.key, s.value]))
    const serverKey = settingsMap.get('midtrans_server_key') || c.env.MIDTRANS_SERVER_KEY
    const isProduction = settingsMap.get('midtrans_environment') === 'production'

    if (!serverKey) {
        return c.json({ error: 'Midtrans not configured. Please configure in Settings.' }, 400)
    }

    const orderId = `ORDER-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const urls = getMidtransUrl(isProduction)

    // Create Midtrans Snap transaction
    const snapPayload = {
        transaction_details: {
            order_id: orderId,
            gross_amount: amount
        },
        item_details: [{
            id: participantId,
            price: amount,
            quantity: 1,
            name: itemName || 'Event Registration'
        }],
        customer_details: {
            first_name: customerName || 'Customer',
            email: customerEmail || '',
            phone: customerPhone || ''
        },
        callbacks: {
            finish: `${c.req.url.split('/api')[0]}/payment/success`
        }
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
            return c.json({
                error: 'Failed to create payment',
                details: data.error_messages
            }, 400)
        }

        // Save payment record to database
        const paymentId = `pay_${crypto.randomUUID().slice(0, 8)}`
        await c.env.DB.prepare(`
            INSERT INTO payments (id, participant_id, order_id, amount, status, midtrans_response)
            VALUES (?, ?, ?, ?, 'pending', ?)
        `).bind(paymentId, participantId, orderId, amount, JSON.stringify(data)).run()

        // Update participant payment status
        await c.env.DB.prepare(`
            UPDATE participants SET payment_status = 'pending' WHERE id = ?
        `).bind(participantId).run()

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

        // Verify signature (optional but recommended)
        // const signatureKey = notification.signature_key
        // const serverKey = c.env.MIDTRANS_SERVER_KEY
        // Verify: SHA512(order_id + status_code + gross_amount + serverKey)

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

        console.log('[MIDTRANS WEBHOOK] Updated payment record')

        // Get participant ID and update status
        const payment = await c.env.DB.prepare(`
            SELECT participant_id FROM payments WHERE order_id = ?
        `).bind(order_id).first() as { participant_id: string } | null

        if (payment) {
            console.log('[MIDTRANS WEBHOOK] Found participant:', payment.participant_id)

            await c.env.DB.prepare(`
                UPDATE participants SET payment_status = ? WHERE id = ?
            `).bind(status, payment.participant_id).run()

            console.log('[MIDTRANS WEBHOOK] Updated participant status to:', status)

            // Send WhatsApp notification if payment is successful
            if (status === 'paid') {
                console.log('[MIDTRANS WEBHOOK] Payment is paid, fetching participant details for WhatsApp')

                const participant = await c.env.DB.prepare(`
                    SELECT p.*, e.title as event_title, e.organization_id, t.name as ticket_name, t.price as ticket_price
                    FROM participants p
                    LEFT JOIN events e ON p.event_id = e.id
                    LEFT JOIN ticket_types t ON p.ticket_type_id = t.id
                    WHERE p.id = ?
                `).bind(payment.participant_id).first() as any

                if (participant && participant.phone) {
                    console.log('[MIDTRANS WEBHOOK] Sending WhatsApp to:', participant.phone)

                    const { sendWhatsAppMessage, generateRegistrationMessage } = await import('../lib/whatsapp')
                    const frontendUrl = 'https://etiket.my.id'
                    const ticketLink = `${frontendUrl}/ticket/${participant.registration_id}`

                    const message = generateRegistrationMessage({
                        eventTitle: participant.event_title,
                        fullName: participant.full_name,
                        registrationId: participant.registration_id,
                        ticketLink,
                        ticketName: participant.ticket_name,
                        ticketPrice: participant.ticket_price
                    })

                    const result = await sendWhatsAppMessage(c.env.DB, participant.organization_id, participant.phone, message)
                    console.log('[MIDTRANS WEBHOOK] WhatsApp send result:', result)

                    if (result.success) {
                        await c.env.DB.prepare(`
                            UPDATE participants 
                            SET whatsapp_status = 'sent', whatsapp_sent_at = CURRENT_TIMESTAMP 
                            WHERE id = ?
                        `).bind(payment.participant_id).run()
                    } else {
                        await c.env.DB.prepare(`
                            UPDATE participants 
                            SET whatsapp_status = 'failed', whatsapp_sent_at = CURRENT_TIMESTAMP 
                            WHERE id = ?
                        `).bind(payment.participant_id).run()
                    }
                } else {
                    console.log('[MIDTRANS WEBHOOK] No phone number found for participant')
                }
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
