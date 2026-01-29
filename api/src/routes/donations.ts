
import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'

export const donations = new Hono<{ Bindings: Bindings }>()

// List donations (organization-scoped)
donations.get('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const { event_id, limit = '20', offset = '0' } = c.req.query()

    let query = `
        SELECT d.*, p.full_name as donor_name, p.email as donor_email, e.title as event_title
        FROM donations d
        JOIN participants p ON d.participant_id = p.id
        JOIN events e ON p.event_id = e.id
        WHERE e.organization_id = ?
    `
    const params: any[] = [user.orgId]

    if (event_id) {
        query += ' AND e.id = ?'
        params.push(event_id)
    }

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const result = await c.env.DB.prepare(query).bind(...params).all()

    // Get total count
    let countQuery = `
        SELECT COUNT(*) as total
        FROM donations d
        JOIN participants p ON d.participant_id = p.id
        JOIN events e ON p.event_id = e.id
        WHERE e.organization_id = ?
    `
    const countParams: any[] = [user.orgId]

    if (event_id) {
        countQuery += ' AND e.id = ?'
        countParams.push(event_id)
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()

    return c.json({
        data: result.results,
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
    })
})

// Get donation stats (organization-scoped)
donations.get('/stats', authMiddleware, async (c) => {
    const user = c.get('user')
    const { event_id } = c.req.query()

    let query = `
        SELECT 
            COUNT(*) as total_donors, 
            COALESCE(SUM(amount), 0) as total_amount 
        FROM donations d
        JOIN participants p ON d.participant_id = p.id
        JOIN events e ON p.event_id = e.id
        WHERE e.organization_id = ? AND d.status = 'paid'
    `
    const params: any[] = [user.orgId]

    if (event_id) {
        query += ' AND e.id = ?'
        params.push(event_id)
    }

    const result = await c.env.DB.prepare(query).bind(...params).first()

    return c.json(result)
})
