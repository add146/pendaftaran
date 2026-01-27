import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'
import { sendWhatsAppMessage } from '../lib/whatsapp'

export const events = new Hono<{ Bindings: Bindings }>()

// List all events (organization-scoped)
events.get('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const { status, limit = '10', offset = '0' } = c.req.query()

  let query = 'SELECT * FROM events WHERE organization_id = ?'
  const params: (string | number)[] = [user.orgId]

  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))

  const result = await c.env.DB.prepare(query).bind(...params).all()

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM events WHERE organization_id = ?'
  const countParams: string[] = [user.orgId]
  if (status) {
    countQuery += ' AND status = ?'
    countParams.push(status)
  }
  const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()

  return c.json({
    data: result.results,
    total: countResult?.total || 0,
    limit: parseInt(limit),
    offset: parseInt(offset)
  })
})

// Get single event (organization-scoped)
events.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  const event = await c.env.DB.prepare(
    'SELECT * FROM events WHERE id = ? AND organization_id = ?'
  ).bind(id, user.orgId).first()
  console.log('[DEBUG] Fetched event:', event)

  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }

  // Get ticket types
  const tickets = await c.env.DB.prepare(
    'SELECT * FROM ticket_types WHERE event_id = ?'
  ).bind(id).all()

  // Get participant stats
  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_registered,
      SUM(CASE WHEN check_in_status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN attendance_type = 'offline' THEN 1 ELSE 0 END) as attendance_offline_total,
      SUM(CASE WHEN attendance_type = 'online' THEN 1 ELSE 0 END) as attendance_online_total,
      SUM(CASE WHEN attendance_type = 'offline' AND check_in_status = 'checked_in' THEN 1 ELSE 0 END) as attendance_offline_checked_in,
      SUM(CASE WHEN attendance_type = 'online' AND check_in_status = 'checked_in' THEN 1 ELSE 0 END) as attendance_online_checked_in,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid
    FROM participants WHERE event_id = ?
  `).bind(id).first()

  return c.json({
    ...event,
    ticket_types: tickets.results,
    stats
  })
})

// Create event (inject organization_id from JWT)
events.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { title, description, event_date, event_time, location, capacity, event_mode, payment_mode, whatsapp_cs, bank_name, account_holder_name, account_number, visibility, images, event_type, online_platform, online_url, online_password, online_instructions } = body

  if (!title || !event_date) {
    return c.json({ error: 'Title and event date required' }, 400)
  }

  const eventId = `evt_${crypto.randomUUID().slice(0, 8)}`
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` // Add unique suffix
  const imageUrl = images && Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : null

  await c.env.DB.prepare(`
    INSERT INTO events (id, organization_id, title, description, event_date, event_time, location, capacity, event_mode, payment_mode, whatsapp_cs, bank_name, account_holder_name, account_number, visibility, status, slug, image_url, event_type, online_platform, online_url, online_password, online_instructions, note, icon_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(eventId, user.orgId, title, description || null, event_date, event_time || null, location || null, capacity || null, event_mode || 'free', payment_mode || 'manual', whatsapp_cs || null, bank_name || null, account_holder_name || null, account_number || null, visibility || 'public', slug, imageUrl, event_type || 'offline', online_platform || null, online_url || null, online_password || null, online_instructions || null, body.note || null, body.icon_type || 'info').run()

  return c.json({ id: eventId, slug }, 201)
})

// Update event (organization-scoped)
events.put('/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json()
  const { title, description, event_date, event_time, location, capacity, event_mode, payment_mode, whatsapp_cs, bank_name, account_holder_name, account_number, visibility, status, images, ticket_types, event_type, online_platform, online_url, online_password, online_instructions, note, icon_type } = body
  console.log('[DEBUG] Update event payload:', { id, event_type, online_platform })

  const existing = await c.env.DB.prepare('SELECT id FROM events WHERE id = ? AND organization_id = ?').bind(id, user.orgId).first()
  if (!existing) {
    return c.json({ error: 'Event not found' }, 404)
  }

  // Update event basic info
  const imageUrl = images && Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : null

  await c.env.DB.prepare(`
    UPDATE events SET 
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      event_date = COALESCE(?, event_date),
      event_time = COALESCE(?, event_time),
      location = COALESCE(?, location),
      capacity = COALESCE(?, capacity),
      event_mode = COALESCE(?, event_mode),
      payment_mode = COALESCE(?, payment_mode),
      whatsapp_cs = COALESCE(?, whatsapp_cs),
      bank_name = COALESCE(?, bank_name),
      account_holder_name = COALESCE(?, account_holder_name),
      account_number = COALESCE(?, account_number),
      visibility = COALESCE(?, visibility),
      status = COALESCE(?, status),
      image_url = COALESCE(?, image_url),
      event_type = ?,
      online_platform = COALESCE(?, online_platform),
      online_url = COALESCE(?, online_url),
      online_password = COALESCE(?, online_password),
      online_instructions = COALESCE(?, online_instructions),
      note = COALESCE(?, note),
      icon_type = COALESCE(?, icon_type),
      certificate_config = COALESCE(?, certificate_config)
    WHERE id = ?
  `).bind(
    title ?? null,
    description ?? null,
    event_date ?? null,
    event_time ?? null,
    location ?? null,
    capacity ?? null,
    event_mode ?? null,
    payment_mode ?? null,
    whatsapp_cs ?? null,
    bank_name ?? null,
    account_holder_name ?? null,
    account_number ?? null,
    visibility ?? null,
    status ?? null,
    imageUrl,
    event_type || 'offline',
    online_platform ?? null,
    online_url ?? null,
    online_password ?? null,
    online_instructions ?? null,
    note ?? null,
    icon_type ?? 'info',
    body.certificate_config ?? null,
    id
  ).run()

  // Update ticket types if provided
  if (ticket_types && Array.isArray(ticket_types)) {
    // First, set ticket_type_id to NULL for all participants of this event to avoid FK constraint
    await c.env.DB.prepare('UPDATE participants SET ticket_type_id = NULL WHERE event_id = ?').bind(id).run()

    // Delete existing ticket types
    await c.env.DB.prepare('DELETE FROM ticket_types WHERE event_id = ?').bind(id).run()

    // Insert new ticket types
    for (const ticket of ticket_types) {
      const ticketId = `tkt_${crypto.randomUUID().slice(0, 8)}`
      await c.env.DB.prepare(`
                INSERT INTO ticket_types (id, event_id, name, price, quota)
                VALUES (?, ?, ?, ?, ?)
            `).bind(ticketId, id, ticket.name, parseInt(ticket.price) || 0, ticket.quota ? parseInt(ticket.quota) : null).run()
    }
  }

  return c.json({ message: 'Event updated' })
})

// Delete event (organization-scoped)
events.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  /* 
   * Strict Role Check: Only Admin and Super Admin can delete events.
   * Regular users (staff) specific to organization cannot delete.
   */
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return c.json({ error: 'Unauthorized: Only Admins can delete events' }, 403)
  }

  // Verify event belongs to organization before deleting
  const event = await c.env.DB.prepare('SELECT id FROM events WHERE id = ? AND organization_id = ?').bind(id, user.orgId).first()
  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }

  await c.env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run()

  return c.json({ message: 'Event deleted' })
})

// Get event stats (organization-scoped)
events.get('/:id/stats', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  // Verify event belongs to organization
  const event = await c.env.DB.prepare('SELECT id FROM events WHERE id = ? AND organization_id = ?').bind(id, user.orgId).first()
  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_registered,
      SUM(CASE WHEN check_in_status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN check_in_status = 'not_arrived' THEN 1 ELSE 0 END) as pending_checkin,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payment,
      SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_payment,
      SUM(CASE WHEN attendance_type = 'offline' THEN 1 ELSE 0 END) as attendance_offline_total,
      SUM(CASE WHEN attendance_type = 'online' THEN 1 ELSE 0 END) as attendance_online_total,
      SUM(CASE WHEN attendance_type = 'offline' AND check_in_status = 'checked_in' THEN 1 ELSE 0 END) as attendance_offline_checked_in,
      SUM(CASE WHEN attendance_type = 'online' AND check_in_status = 'checked_in' THEN 1 ELSE 0 END) as attendance_online_checked_in
    FROM participants WHERE event_id = ?
  `).bind(id).first()

  // Get revenue
  const revenue = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(p.amount), 0) as total_revenue
    FROM payments p
    JOIN participants pt ON p.participant_id = pt.id
    WHERE pt.event_id = ? AND p.status = 'paid'
  `).bind(id).first()

  return c.json({
    ...stats,
    revenue: revenue?.total_revenue || 0
  })
})

// Save ID card design for event (organization-scoped)
events.patch('/:id/id-card-design', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json()

  // Verify event belongs to organization
  const event = await c.env.DB.prepare('SELECT id FROM events WHERE id = ? AND organization_id = ?').bind(id, user.orgId).first()
  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }

  const { primaryColor, backgroundColor, sponsorLogo } = body
  const designJson = JSON.stringify({
    primaryColor: primaryColor || '#1e7b49',
    backgroundColor: backgroundColor || '#ffffff',
    sponsorLogo: sponsorLogo || null
  })

  await c.env.DB.prepare(`
    UPDATE events SET id_card_design = ? WHERE id = ?
  `).bind(designJson, id).run()

  return c.json({ message: 'ID card design saved', design: JSON.parse(designJson) })
})

// Get ID card design for event (organization-scoped)
events.get('/:id/id-card-design', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  const event = await c.env.DB.prepare('SELECT id_card_design FROM events WHERE id = ? AND organization_id = ?').bind(id, user.orgId).first()
  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }

  const defaultDesign = {
    primaryColor: '#1e7b49',
    backgroundColor: '#ffffff',
    sponsorLogo: null
  }

  if (event.id_card_design) {
    try {
      return c.json(JSON.parse(event.id_card_design as string))
    } catch {
      return c.json(defaultDesign)
    }
  }

  return c.json(defaultDesign)
})

// Get broadcast targets (paid participants) for Client-Side Bot
events.get('/:id/broadcast-targets', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  // 1. Fetch Event
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ? AND organization_id = ?').bind(id, user.orgId).first()
  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }

  // 2. Validate
  if (event.event_type === 'offline') {
    return c.json({ error: 'Cannot broadcast link for offline events' }, 400)
  }
  if (!event.online_url) {
    return c.json({ error: 'Online URL is not set.' }, 400)
  }

  // 3. Get Paid Participants
  const participants = await c.env.DB.prepare(`
    SELECT id, registration_id, full_name, phone, whatsapp_status 
    FROM participants 
    WHERE event_id = ? AND payment_status = 'paid' AND phone IS NOT NULL
  `).bind(id).all()

  return c.json({
    event: {
      title: event.title,
      date: event.event_date,
      time: event.event_time,
      online_platform: event.online_platform,
      online_url: event.online_url,
      meeting_link_sent: event.meeting_link_sent
    },
    targets: participants.results
  })
})

// Send single broadcast message (Client-Side Bot Step)
events.post('/:id/broadcast-single', authMiddleware, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const { registrationId } = await c.req.json()

  // 1. Fetch Event & Participant
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ? AND organization_id = ?').bind(id, user.orgId).first()
  const participant = await c.env.DB.prepare('SELECT * FROM participants WHERE registration_id = ?').bind(registrationId).first()

  if (!event || !participant) {
    return c.json({ error: 'Event or Participant not found' }, 404)
  }

  // 2. Construct Personalized Message
  const platformName = (event.online_platform as string || 'Online').replace('_', ' ')
  let message = `Halo Kak ${participant.full_name}, 👋\n\n🔔 *UPDATE: Link Meeting Tersedia!*

📌 *Event:* ${event.title}
📅 *Waktu:* ${event.event_date} ${event.event_time || ''}

💻 *Join via:* ${platformName.charAt(0).toUpperCase() + platformName.slice(1)}
🔗 *Link:* ${event.online_url}`

  if (event.online_password) {
    message += `\n🔑 *Password:* ${event.online_password}`
  }

  if (event.online_instructions) {
    message += `\n\n📋 *Instruksi:*\n${event.online_instructions}`
  }

  message += `\n\nSampai jumpa di acara! 👋`

  // 3. Send Message
  const result = await sendWhatsAppMessage(c.env.DB, user.orgId, participant.phone as string, message)

  if (result.success) {
    // Mark event as "sent" (1) implicitly so button state updates on refresh
    await c.env.DB.prepare('UPDATE events SET meeting_link_sent = 1 WHERE id = ?').bind(id).run()
  }

  return c.json(result)
})
