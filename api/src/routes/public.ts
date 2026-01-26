import { Hono } from 'hono'
import type { Bindings } from '../index'

export const publicRoutes = new Hono<{ Bindings: Bindings }>()

// List public events
publicRoutes.get('/events', async (c) => {
  const { limit = '10', offset = '0' } = c.req.query()

  const result = await c.env.DB.prepare(`
    SELECT id, title, description, event_date, event_time, location, capacity, event_mode, image_url, slug,
      (SELECT COUNT(*) FROM participants WHERE event_id = events.id AND payment_status = 'paid') as registered_count
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
      (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND payment_status = 'paid') as registered_count
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

  // Get Midtrans config for the EVENT'S Organization
  const midtransSettings = await c.env.DB.prepare(`
    SELECT key, value FROM settings 
    WHERE organization_id = ? 
    AND key IN ('midtrans_client_key', 'midtrans_environment')
  `).bind(event.organization_id).all()

  const settingsMap = new Map(midtransSettings.results.map((s: any) => [s.key, s.value]))

  // Strict isolation: Only use Organization's configured keys.
  const midtransClientKey = settingsMap.get('midtrans_client_key')
  // Clean the environment string to avoid quote/whitespace issues
  let rawEnv = settingsMap.get('midtrans_environment')
  if (rawEnv) rawEnv = rawEnv.replace(/['"]/g, '').trim()

  const midtransEnvironment = rawEnv || 'sandbox'

  return c.json({
    ...event,
    ticket_types: tickets.results,
    registration_available: isAvailable,
    midtrans_client_key: midtransClientKey,
    midtrans_environment: midtransEnvironment
  })
})

// Dashboard stats (for authenticated admin) - REQUIRES AUTH
import { authMiddleware } from '../middleware/auth'
export const dashboardStatsRoute = new Hono<{ Bindings: Bindings }>()

dashboardStatsRoute.get('/stats', authMiddleware, async (c) => {
  const user = c.get('user')

  // Get active events count for this organization
  const activeEvents = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM events WHERE status = 'open' AND organization_id = ?"
  ).bind(user.orgId).first()

  // Get total participants for this organization's events
  const totalParticipants = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM participants p
    JOIN events e ON p.event_id = e.id
    WHERE e.organization_id = ?
  `).bind(user.orgId).first()

  // Get total revenue for this organization's events
  const totalRevenue = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(pay.amount), 0) as total 
    FROM payments pay
    JOIN participants p ON pay.participant_id = p.id
    JOIN events e ON p.event_id = e.id
    WHERE pay.status = 'paid' AND e.organization_id = ?
  `).bind(user.orgId).first()

  // Get recent events for this organization
  const recentEvents = await c.env.DB.prepare(`
    SELECT e.*, 
      (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND payment_status = 'paid') as registered_count
    FROM events e
    WHERE e.organization_id = ?
    ORDER BY e.created_at DESC
    LIMIT 5
  `).bind(user.orgId).all()

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
           e.title as event_title, e.event_date, e.event_time, e.location, e.id_card_design
    FROM participants p
    LEFT JOIN ticket_types t ON p.ticket_type_id = t.id
    JOIN events e ON p.event_id = e.id
    WHERE p.registration_id = ?
  `).bind(registrationId).first()

  if (!participant) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  // Parse id_card_design or use defaults
  let idCardDesign = {
    primaryColor: '#1e7b49',
    backgroundColor: '#ffffff',
    sponsorLogo: null as string | null
  }

  if (participant.id_card_design) {
    try {
      idCardDesign = JSON.parse(participant.id_card_design as string)
    } catch {
      // Use defaults
    }
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
    location: participant.location,
    id_card_design: idCardDesign
  })
})
// Get landing page configuration
publicRoutes.get('/landing-config', async (c) => {
  console.log('[Public API] Fetching landing config & registration settings')
  const settings = await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('landing_page_config', 'public_registration_enabled') AND organization_id = 'org_system'"
  ).all()

  console.log('[Public API] Settings found:', settings.results)

  const configMap = new Map(settings.results.map((s: any) => [s.key, s.value]))

  let landingConfig = {}
  try {
    const rawConfig = configMap.get('landing_page_config')
    if (rawConfig) landingConfig = JSON.parse(rawConfig as string)
  } catch (e) { console.error('Config Parse Error', e) }

  let registrationEnabled = false
  const rawReg = configMap.get('public_registration_enabled')
  console.log('[Public API] Raw Registration Value:', rawReg, typeof rawReg)

  if (rawReg) {
    const val = String(rawReg).toLowerCase()
    if (val === 'true' || val === '1' || val === 'yes') {
      registrationEnabled = true
    }
    // Try JSON parse if it's a quoted string like "true"
    try {
      if (JSON.parse(val) === true) registrationEnabled = true
    } catch { }
  }

  console.log('[Public API] Registration Enabled Resolved:', registrationEnabled)

  return c.json({
    ...landingConfig,
    publicRegistrationEnabled: registrationEnabled
  })
})
