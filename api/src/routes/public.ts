import { Hono } from 'hono'
import type { Bindings } from '../index'

export const publicRoutes = new Hono<{ Bindings: Bindings }>()

// List public events
publicRoutes.get('/events', async (c) => {
  const { limit = '10', offset = '0' } = c.req.query()

  const result = await c.env.DB.prepare(`
    SELECT id, title, description, event_date, event_time, location, capacity, event_mode, image_url, slug,
      (SELECT COUNT(*) FROM participants WHERE event_id = events.id) as registered_count
    FROM events 
    WHERE visibility = 'public' AND status = 'open'
    ORDER BY event_date ASC
    LIMIT ? OFFSET ?
  `).bind(parseInt(limit), parseInt(offset)).all()

  return c.json({
    data: result.results
  })
})

// Get public event by slug
publicRoutes.get('/events/:slug', async (c) => {
  const { slug } = c.req.param()

  const event = await c.env.DB.prepare(`
    SELECT e.*, o.name as organization_name,
      (SELECT COUNT(*) FROM participants WHERE event_id = e.id) as registered_count
    FROM events e
    LEFT JOIN organizations o ON e.organization_id = o.id
    WHERE (e.slug = ? OR e.id = ?) AND e.visibility = 'public'
  `).bind(slug, slug).first()

  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }

  // Get ticket types
  const tickets = await c.env.DB.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM participants WHERE ticket_type_id = t.id) as sold_count
    FROM ticket_types t 
    WHERE t.event_id = ?
  `).bind(event.id).all()

  // Check if registration is still available
  const isAvailable = event.status === 'open' &&
    (!event.capacity || (event.registered_count as number) < (event.capacity as number))

  // Get Midtrans config
  const midtransSettings = await c.env.DB.prepare(`
    SELECT key, value FROM settings WHERE key IN ('midtrans_client_key', 'midtrans_environment')
  `).all()
  const settingsMap = new Map(midtransSettings.results.map((s: any) => [s.key, s.value]))

  const midtransClientKey = settingsMap.get('midtrans_client_key') || c.env.MIDTRANS_CLIENT_KEY
  const midtransEnvironment = settingsMap.get('midtrans_environment') || (c.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'production' : 'sandbox')

  return c.json({
    ...event,
    ticket_types: tickets.results,
    registration_available: isAvailable,
    midtrans_client_key: midtransClientKey,
    midtrans_environment: midtransEnvironment
  })
})

// Dashboard stats (for admin)
publicRoutes.get('/dashboard/stats', async (c) => {
  // Get active events count
  const activeEvents = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM events WHERE status = 'open'"
  ).first()

  // Get total participants
  const totalParticipants = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM participants'
  ).first()

  // Get total revenue
  const totalRevenue = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'"
  ).first()

  // Get recent events
  const recentEvents = await c.env.DB.prepare(`
    SELECT e.*, 
      (SELECT COUNT(*) FROM participants WHERE event_id = e.id) as registered_count
    FROM events e
    ORDER BY e.created_at DESC
    LIMIT 5
  `).all()

  return c.json({
    active_events: activeEvents?.count || 0,
    total_participants: totalParticipants?.count || 0,
    total_revenue: totalRevenue?.total || 0,
    recent_events: recentEvents.results
  })
})

// Get public ticket by registration ID
publicRoutes.get('/ticket/:registrationId', async (c) => {
  const { registrationId } = c.req.param()

  const participant = await c.env.DB.prepare(`
    SELECT p.*, t.name as ticket_name, t.price as ticket_price,
           e.title as event_title, e.event_date, e.event_time, e.location
    FROM participants p
    LEFT JOIN ticket_types t ON p.ticket_type_id = t.id
    JOIN events e ON p.event_id = e.id
    WHERE p.registration_id = ?
  `).bind(registrationId).first()

  if (!participant) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  return c.json({
    registration_id: participant.registration_id,
    full_name: participant.full_name,
    email: participant.email,
    phone: participant.phone,
    city: participant.city,
    ticket_name: participant.ticket_name,
    qr_code: participant.qr_code,
    payment_status: participant.payment_status,
    event_title: participant.event_title,
    event_date: participant.event_date,
    event_time: participant.event_time,
    location: participant.location
  })
})
