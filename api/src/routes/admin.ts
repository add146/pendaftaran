import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { superAdminMiddleware } from '../middleware/superAdmin'
import type { Bindings } from '../index'

export const admin = new Hono<{ Bindings: Bindings }>()

// All routes require super admin
admin.use('*', authMiddleware)
admin.use('*', superAdminMiddleware)

// System-wide statistics
admin.get('/stats', async (c) => {
    // Total organizations
    const orgsCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM organizations WHERE id != "org_system"'
    ).first()

    // Organizations by plan
    const orgsByPlan = await c.env.DB.prepare(`
        SELECT s.plan, COUNT(*) as count
        FROM subscriptions s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.id != 'org_system'
        GROUP BY s.plan
    `).all()

    // Total users
    const usersCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE organization_id != "org_system"'
    ).first()

    // Total events
    const eventsCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM events'
    ).first()

    // Pending subscription payments
    const pendingPayments = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM subscription_payments
        WHERE payment_status = 'pending'
    `).first()

    return c.json({
        total_organizations: orgsCount?.count || 0,
        organizations_by_plan: orgsByPlan.results,
        total_users: usersCount?.count || 0,
        total_events: eventsCount?.count || 0,
        pending_subscription_approvals: pendingPayments?.count || 0
    })
})

// List all organizations
admin.get('/organizations', async (c) => {
    const { limit = '50', offset = '0' } = c.req.query()

    const orgs = await c.env.DB.prepare(`
        SELECT 
            o.id,
            o.name,
            o.slug,
            o.logo_url,
            o.waha_enabled,
            o.created_at,
            s.plan,
            s.status as subscription_status,
            (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
            (SELECT COUNT(*) FROM events WHERE organization_id = o.id) as event_count
        FROM organizations o
        LEFT JOIN subscriptions s ON o.id = s.organization_id
        WHERE o.id != 'org_system'
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    `).bind(parseInt(limit), parseInt(offset)).all()

    return c.json({ organizations: orgs.results })
})

// List all users
admin.get('/users', async (c) => {
    const { organization_id, limit = '100', offset = '0' } = c.req.query()

    let query = `
        SELECT 
            u.id,
            u.email,
            u.name,
            u.role,
            u.created_at,
            o.name as organization_name,
            o.id as organization_id
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.organization_id != 'org_system'
    `

    const bindings: any[] = []

    if (organization_id) {
        query += ' AND u.organization_id = ?'
        bindings.push(organization_id)
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
    bindings.push(parseInt(limit), parseInt(offset))

    const users = await c.env.DB.prepare(query).bind(...bindings).all()

    return c.json({ users: users.results })
})

// Change user role
admin.put('/users/:id/role', async (c) => {
    const { id } = c.req.param()
    const { role } = await c.req.json()

    if (!['admin', 'user'].includes(role)) {
        return c.json({ error: 'Invalid role' }, 400)
    }

    // Prevent changing super admin's own role
    const user = c.get('user')
    if (id === user.userId) {
        return c.json({ error: 'Cannot change your own role' }, 400)
    }

    await c.env.DB.prepare(
        'UPDATE users SET role = ? WHERE id = ?'
    ).bind(role, id).run()

    return c.json({ message: 'User role updated successfully' })
})

// Delete user
admin.delete('/users/:id', async (c) => {
    const { id } = c.req.param()

    // Prevent deleting super admin
    const user = c.get('user')
    if (id === user.userId) {
        return c.json({ error: 'Cannot delete your own account' }, 400)
    }

    // Check if user exists and is not super admin
    const targetUser = await c.env.DB.prepare(
        'SELECT role FROM users WHERE id = ?'
    ).bind(id).first()

    if (!targetUser) {
        return c.json({ error: 'User not found' }, 404)
    }

    if ((targetUser as any).role === 'super_admin') {
        return c.json({ error: 'Cannot delete super admin users' }, 403)
    }

    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

    return c.json({ message: 'User deleted successfully' })
})

// List pending subscription payments
admin.get('/subscriptions/pending', async (c) => {
    const payments = await c.env.DB.prepare(`
        SELECT 
            sp.*,
            o.name as organization_name,
            s.plan
        FROM subscription_payments sp
        JOIN subscriptions s ON sp.subscription_id = s.id
        JOIN organizations o ON sp.organization_id = o.id
        WHERE sp.payment_status = 'pending'
        ORDER BY sp.created_at DESC
    `).all()

    return c.json({ payments: payments.results })
})

// Approve subscription payment
admin.put('/subscriptions/:id/approve', async (c) => {
    const { id } = c.req.param()
    const user = c.get('user')

    // Update payment status
    await c.env.DB.prepare(`
        UPDATE subscription_payments 
        SET payment_status = 'paid',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).bind(user.userId, id).run()

    // Get payment details
    const payment = await c.env.DB.prepare(
        'SELECT subscription_id, period_end FROM subscription_payments WHERE id = ?'
    ).bind(id).first() as any

    // Update subscription
    await c.env.DB.prepare(`
        UPDATE subscriptions
        SET status = 'active',
            payment_status = 'paid',
            expires_at = ?
        WHERE id = ?
    `).bind(payment.period_end, payment.subscription_id).run()

    return c.json({ message: 'Subscription payment approved' })
})

// Reject subscription payment
admin.put('/subscriptions/:id/reject', async (c) => {
    const { id } = c.req.param()
    const { reason } = await c.req.json()

    await c.env.DB.prepare(`
        UPDATE subscription_payments 
        SET payment_status = 'failed'
        WHERE id = ?
    `).bind(id).run()

    // Could also store rejection reason if we add a column

    return c.json({ message: 'Subscription payment rejected' })
})
