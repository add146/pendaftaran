import { Hono } from 'hono'
import type { Bindings } from '../index'

export const participants = new Hono<{ Bindings: Bindings }>()

// Generate registration ID
function generateRegId(): string {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0')
    return `REG-${year}-${random}`
}

// List participants for an event
participants.get('/event/:eventId', async (c) => {
    const { eventId } = c.req.param()
    const { status, payment, search, limit = '20', offset = '0' } = c.req.query()

    let query = 'SELECT p.*, t.name as ticket_name, t.price as ticket_price FROM participants p LEFT JOIN ticket_types t ON p.ticket_type_id = t.id WHERE p.event_id = ?'
    const params: (string | number)[] = [eventId]

    if (status) {
        query += ' AND p.check_in_status = ?'
        params.push(status)
    }

    if (payment) {
        query += ' AND p.payment_status = ?'
        params.push(payment)
    }

    if (search) {
        query += ' AND (p.full_name LIKE ? OR p.email LIKE ? OR p.registration_id LIKE ?)'
        const searchTerm = `%${search}%`
        params.push(searchTerm, searchTerm, searchTerm)
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const result = await c.env.DB.prepare(query).bind(...params).all()

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM participants WHERE event_id = ?'
    const countParams: string[] = [eventId]
    if (status) {
        countQuery += ' AND check_in_status = ?'
        countParams.push(status)
    }
    if (payment) {
        countQuery += ' AND payment_status = ?'
        countParams.push(payment)
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()

    return c.json({
        data: result.results,
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
    })
})

// Get single participant
participants.get('/:id', async (c) => {
    const { id } = c.req.param()

    const participant = await c.env.DB.prepare(`
    SELECT p.*, t.name as ticket_name, t.price as ticket_price, e.title as event_title
    FROM participants p 
    LEFT JOIN ticket_types t ON p.ticket_type_id = t.id
    LEFT JOIN events e ON p.event_id = e.id
    WHERE p.id = ? OR p.registration_id = ?
  `).bind(id, id).first()

    if (!participant) {
        return c.json({ error: 'Participant not found' }, 404)
    }

    return c.json(participant)
})

// Register for event (public)
participants.post('/register', async (c) => {
    const body = await c.req.json()
    const { event_id, ticket_type_id, full_name, email, phone, city, gender } = body

    if (!event_id || !full_name || !email) {
        return c.json({ error: 'Event ID, full name, and email required' }, 400)
    }

    // Check event exists and is open
    const event = await c.env.DB.prepare(
        'SELECT id, capacity, event_mode, payment_mode, whatsapp_cs, bank_name, account_holder_name, account_number, title FROM events WHERE id = ? AND status = ?'
    ).bind(event_id, 'open').first() as {
        id: string;
        capacity: number;
        event_mode: string;
        payment_mode: string;
        whatsapp_cs: string;
        bank_name: string | null;
        account_holder_name: string | null;
        account_number: string | null;
        title: string
    } | null

    if (!event) {
        return c.json({ error: 'Event not found or not accepting registrations' }, 400)
    }

    // Check capacity
    if (event.capacity) {
        const participantCount = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM participants WHERE event_id = ?'
        ).bind(event_id).first()

        if (participantCount && (participantCount.count as number) >= event.capacity) {
            return c.json({ error: 'Event is full' }, 400)
        }
    }

    // Check if already registered
    const existing = await c.env.DB.prepare(
        'SELECT id FROM participants WHERE event_id = ? AND email = ?'
    ).bind(event_id, email).first()

    if (existing) {
        return c.json({ error: 'Already registered for this event' }, 400)
    }

    const participantId = `prt_${crypto.randomUUID().slice(0, 8)}`
    const registrationId = generateRegId()
    const qrCode = `${event_id}:${participantId}:${registrationId}`

    // Determine payment status based on event mode
    const paymentStatus = event.event_mode === 'free' ? 'paid' : 'pending'

    // Get ticket price if paid event
    let ticketPrice = 0
    let ticketName = ''
    if (ticket_type_id) {
        const ticket = await c.env.DB.prepare(
            'SELECT name, price FROM ticket_types WHERE id = ?'
        ).bind(ticket_type_id).first() as { name: string; price: number } | null
        if (ticket) {
            ticketPrice = ticket.price
            ticketName = ticket.name
        }
    }

    await c.env.DB.prepare(`
    INSERT INTO participants (id, event_id, ticket_type_id, registration_id, full_name, email, phone, city, gender, payment_status, qr_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(participantId, event_id, ticket_type_id || null, registrationId, full_name, email, phone || null, city || null, gender || null, paymentStatus, qrCode).run()

    // Send WhatsApp notification if phone number provided
    if (phone) {
        try {
            console.log('[WAHA] Starting WhatsApp notification for:', phone)
            const { sendWhatsAppMessage, generateRegistrationMessage, generatePaymentPendingMessage } = await import('../lib/whatsapp')
            console.log('[WAHA] WhatsApp module imported successfully')

            const ticketLink = `${c.req.url.split('/api')[0]}/ticket/${registrationId}`
            console.log('[WAHA] Ticket link:', ticketLink)

            if (paymentStatus === 'paid') {
                // Free event - send registration success with QR link
                console.log('[WAHA] Generating registration success message')
                const message = generateRegistrationMessage({
                    eventTitle: event.title,
                    fullName: full_name,
                    registrationId,
                    ticketLink,
                    ticketName,
                    ticketPrice
                })
                console.log('[WAHA] Sending WhatsApp message...')
                const result = await sendWhatsAppMessage(c.env.DB, phone, message)
                console.log('[WAHA] Send result:', result)
            } else {
                // Paid event - send payment pending message
                console.log('[WAHA] Generating payment pending message')
                const message = generatePaymentPendingMessage({
                    eventTitle: event.title,
                    fullName: full_name,
                    ticketPrice,
                    bankName: event.bank_name || undefined,
                    accountHolder: event.account_holder_name || undefined,
                    accountNumber: event.account_number || undefined
                })
                console.log('[WAHA] Sending WhatsApp message...')
                const result = await sendWhatsAppMessage(c.env.DB, phone, message)
                console.log('[WAHA] Send result:', result)
            }
        } catch (error) {
            console.error('[WAHA] Error sending WhatsApp notification:', error)
            // Don't fail registration if WhatsApp fails
        }
    }

    return c.json({
        id: participantId,
        registration_id: registrationId,
        qr_code: qrCode,
        payment_status: paymentStatus,
        event_title: event.title,
        // Payment info for frontend flow
        payment_mode: event.payment_mode || 'manual',
        whatsapp_cs: event.whatsapp_cs || null,
        bank_name: event.bank_name || null,
        account_holder_name: event.account_holder_name || null,
        account_number: event.account_number || null,
        ticket_name: ticketName,
        ticket_price: ticketPrice,
        message: paymentStatus === 'paid' ? 'Registration successful!' : 'Please complete payment'
    }, 201)
})

// Check-in participant (with event validation)
participants.post('/:id/check-in', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json().catch(() => ({}))
    const { event_id } = body as { event_id?: string }

    // Find participant by ID or registration ID or QR code
    const participant = await c.env.DB.prepare(`
    SELECT * FROM participants WHERE id = ? OR registration_id = ? OR qr_code = ?
  `).bind(id, id, id).first()

    if (!participant) {
        return c.json({ error: 'Participant not found' }, 404)
    }

    // Validate event_id if provided
    if (event_id && participant.event_id !== event_id) {
        return c.json({
            error: 'Peserta ini terdaftar di event lain',
            participant_event_id: participant.event_id
        }, 400)
    }

    // Fetch event to check timing
    const event = await c.env.DB.prepare(`
    SELECT * FROM events WHERE id = ?
  `).bind(participant.event_id).first()

    if (event) {
        // Parse event date and time
        const eventDate = event.event_date as string
        const eventTime = (event.event_time as string) || '00:00'

        // Create event datetime
        const [year, month, day] = eventDate.split('-').map(Number)
        const [hours, minutes] = eventTime.split(':').map(Number)
        const eventDateTime = new Date(year, month - 1, day, hours, minutes)

        // Check-in allowed 1 hour before event
        const checkInOpenTime = new Date(eventDateTime.getTime() - 60 * 60 * 1000)
        const now = new Date()

        if (now < checkInOpenTime) {
            const formattedEventTime = eventDateTime.toLocaleString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            return c.json({
                error: `Check-in belum dibuka. Event dimulai ${formattedEventTime}. Check-in dapat dilakukan 1 jam sebelum acara.`,
                event_start: eventDateTime.toISOString(),
                check_in_opens: checkInOpenTime.toISOString()
            }, 400)
        }
    }

    if (participant.check_in_status === 'checked_in') {
        return c.json({
            error: 'Sudah check-in sebelumnya',
            check_in_time: participant.check_in_time
        }, 400)
    }

    if (participant.payment_status !== 'paid') {
        return c.json({ error: 'Pembayaran belum dikonfirmasi' }, 400)
    }

    const checkInTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    await c.env.DB.prepare(`
    UPDATE participants SET check_in_status = 'checked_in', check_in_time = ? WHERE id = ?
  `).bind(checkInTime, participant.id).run()

    return c.json({
        message: 'Check-in successful',
        participant: {
            id: participant.id,
            full_name: participant.full_name,
            registration_id: participant.registration_id,
            check_in_time: checkInTime
        }
    })
})

// Get QR code data
participants.get('/:id/qr', async (c) => {
    const { id } = c.req.param()

    const participant = await c.env.DB.prepare(`
    SELECT p.*, e.title as event_title, e.event_date
    FROM participants p 
    JOIN events e ON p.event_id = e.id
    WHERE p.id = ? OR p.registration_id = ?
  `).bind(id, id).first()

    if (!participant) {
        return c.json({ error: 'Participant not found' }, 404)
    }

    return c.json({
        qr_data: participant.qr_code,
        participant: {
            name: participant.full_name,
            registration_id: participant.registration_id,
            event: participant.event_title,
            date: participant.event_date
        }
    })
})

// Approve payment (manual payment approval)
participants.post('/:id/approve-payment', async (c) => {
    const { id } = c.req.param()

    const participant = await c.env.DB.prepare(`
    SELECT * FROM participants WHERE id = ? OR registration_id = ?
  `).bind(id, id).first()

    if (!participant) {
        return c.json({ error: 'Participant not found' }, 404)
    }

    if (participant.payment_status === 'paid') {
        return c.json({ error: 'Payment already confirmed' }, 400)
    }

    await c.env.DB.prepare(`
    UPDATE participants SET payment_status = 'paid' WHERE id = ?
  `).bind(participant.id).run()

    return c.json({
        message: 'Payment approved',
        participant: {
            id: participant.id,
            full_name: participant.full_name,
            registration_id: participant.registration_id,
            payment_status: 'paid',
            qr_code: participant.qr_code
        }
    })
})

// Delete participant
participants.delete('/:id', async (c) => {
    const { id } = c.req.param()

    const participant = await c.env.DB.prepare(`
    SELECT * FROM participants WHERE id = ? OR registration_id = ?
  `).bind(id, id).first()

    if (!participant) {
        return c.json({ error: 'Participant not found' }, 404)
    }

    await c.env.DB.prepare(`
    DELETE FROM participants WHERE id = ?
  `).bind(participant.id).run()

    return c.json({
        message: 'Participant deleted successfully'
    })
})
