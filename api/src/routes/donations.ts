
import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'

export const donations = new Hono<{ Bindings: Bindings }>()

// List donations (organization-scoped)
donations.get('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const { event_id, start_date, end_date, limit = '20', offset = '0' } = c.req.query()

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

    if (start_date) {
        query += ' AND date(d.created_at) >= ?'
        params.push(start_date)
    }

    if (end_date) {
        query += ' AND date(d.created_at) <= ?'
        params.push(end_date)
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

    if (start_date) {
        countQuery += ' AND date(d.created_at) >= ?'
        countParams.push(start_date)
    }

    if (end_date) {
        countQuery += ' AND date(d.created_at) <= ?'
        countParams.push(end_date)
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
    const { event_id, start_date, end_date } = c.req.query()

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

    if (start_date) {
        query += ' AND date(d.created_at) >= ?'
        params.push(start_date)
    }

    if (end_date) {
        query += ' AND date(d.created_at) <= ?'
        params.push(end_date)
    }

    const result = await c.env.DB.prepare(query).bind(...params).first()

    return c.json(result)
})


// Export donations to CSV (organization-scoped)
donations.get('/export-csv', authMiddleware, async (c) => {
    const user = c.get('user')
    const { event_id, start_date, end_date } = c.req.query()

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

    if (start_date) {
        query += ' AND date(d.created_at) >= ?'
        params.push(start_date)
    }

    if (end_date) {
        query += ' AND date(d.created_at) <= ?'
        params.push(end_date)
    }

    query += ' ORDER BY d.created_at DESC'

    const result = await c.env.DB.prepare(query).bind(...params).all()

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }

    const headers = ['Date', 'Donation ID', 'Donor Name', 'Donor Email', 'Event', 'Amount', 'Status']
    const csvLines: string[] = [headers.join(',')]

    for (const d of result.results as any[]) {
        const row = [
            d.created_at,
            d.id,
            d.donor_name,
            d.donor_email,
            d.event_title,
            d.amount,
            d.status
        ]
        csvLines.push(row.map(escapeCSV).join(','))
    }

    const csvContent = csvLines.join('\n')
    const filename = `donations-${new Date().toISOString().split('T')[0]}.csv`

    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
})
