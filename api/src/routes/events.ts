import { Hono } from 'hono'
import type { Bindings } from '../index'

export const events = new Hono<{ Bindings: Bindings }>()

// List all events
events.get('/', async (c) => {
  const { status, limit = '10', offset = '0' } = c.req.query()

  let query = 'SELECT * FROM events'
  const params: string[] = []

  if (status) {
    query += ' WHERE status = ?'
    params.push(status)
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const result = await c.env.DB.prepare(query).bind(...params).all()

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM events'
  if (status) {
    countQuery += ' WHERE status = ?'
  }
  const countResult = await c.env.DB.prepare(countQuery).bind(...(status ? [status] : [])).first()

  return c.json({
    data: result.results,
    total: countResult?.total || 0,
    limit: parseInt(limit),
    offset: parseInt(offset)
  })
})

// Get single event
events.get('/:id', async (c) => {
  const { id } = c.req.param()

  const event = await c.env.DB.prepare(
    'SELECT * FROM events WHERE id = ?'
  ).bind(id).first()

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
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid
    FROM participants WHERE event_id = ?
  `).bind(id).first()

  return c.json({
    ...event,
    ticket_types: tickets.results,
    stats
  })
})

// Create event
events.post('/', async (c) => {
  const body = await c.req.json()
  const { title, description, event_date, event_time, location, capacity, event_mode, payment_mode, whatsapp_cs, visibility, images } = body

  if (!title || !event_date) {
    return c.json({ error: 'Title and event date required' }, 400)
  }

  const eventId = `evt_${crypto.randomUUID().slice(0, 8)}`
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const imageUrl = images && Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : null

  await c.env.DB.prepare(`
    INSERT INTO events (id, title, description, event_date, event_time, location, capacity, event_mode, payment_mode, whatsapp_cs, visibility, status, slug, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `).bind(eventId, title, description || null, event_date, event_time || null, location || null, capacity || null, event_mode || 'free', payment_mode || 'manual', whatsapp_cs || null, visibility || 'public', slug, imageUrl).run()

  return c.json({ id: eventId, slug }, 201)
})

// Update event
events.put('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const { title, description, event_date, event_time, location, capacity, event_mode, payment_mode, whatsapp_cs, visibility, status, images, ticket_types } = body

  const existing = await c.env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: 'Event not found' }, 404)
  }

  // Update event basic info
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
      visibility = COALESCE(?, visibility),
      status = COALESCE(?, status),
      image_url = COALESCE(?, image_url)
    WHERE id = ?
  `).bind(title, description, event_date, event_time, location, capacity, event_mode, payment_mode, whatsapp_cs, visibility, status, images ? JSON.stringify(images) : null, id).run()

  // Update ticket types if provided
  if (ticket_types && Array.isArray(ticket_types)) {
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

// Delete event
events.delete('/:id', async (c) => {
  const { id } = c.req.param()

  await c.env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run()

  return c.json({ message: 'Event deleted' })
})

// Get event stats
events.get('/:id/stats', async (c) => {
  const { id } = c.req.param()

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_registered,
      SUM(CASE WHEN check_in_status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN check_in_status = 'not_arrived' THEN 1 ELSE 0 END) as pending_checkin,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payment,
      SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_payment
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
