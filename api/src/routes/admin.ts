import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { superAdminMiddleware } from '../middleware/superAdmin'
import { hashPassword } from '../lib/jwt'
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

// Create new organization (super admin only)
admin.post('/organizations', async (c) => {
    const { name, slug, plan = 'nonprofit' } = await c.req.json()

    if (!name) {
        return c.json({ error: 'Organization name is required' }, 400)
    }

    if (!['nonprofit', 'profit'].includes(plan)) {
        return c.json({ error: 'Invalid plan. Must be nonprofit or profit' }, 400)
    }

    // Generate slug if not provided
    const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingSlug = await c.env.DB.prepare(
        'SELECT id FROM organizations WHERE slug = ?'
    ).bind(orgSlug).first()

    if (existingSlug) {
        return c.json({ error: 'Organization slug already exists' }, 400)
    }

    // Create organization
    const orgId = `org_${crypto.randomUUID().slice(0, 8)}`
    await c.env.DB.prepare(
        'INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)'
    ).bind(orgId, name, orgSlug).run()

    // Create subscription
    const subId = `sub_${crypto.randomUUID().slice(0, 8)}`
    const amount = plan === 'profit' ? 100000 : 0 // Example pricing
    await c.env.DB.prepare(
        'INSERT INTO subscriptions (id, organization_id, plan, status, payment_status, amount) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(subId, orgId, plan, 'active', plan === 'nonprofit' ? 'paid' : 'pending', amount).run()

    return c.json({
        message: 'Organization created successfully',
        organization: { id: orgId, name, slug: orgSlug, plan }
    })
})

// Update organization (super admin only)
admin.put('/organizations/:id', async (c) => {
    const id = c.req.param('id')
    const { name, slug, plan } = await c.req.json()

    // Check if organization exists
    const org = await c.env.DB.prepare(
        'SELECT id FROM organizations WHERE id = ?'
    ).bind(id).first()

    if (!org) {
        return c.json({ error: 'Organization not found' }, 404)
    }

    // Build update query dynamically
    const updates: string[] = []
    const bindings: any[] = []

    if (name) {
        updates.push('name = ?')
        bindings.push(name)
    }

    if (slug) {
        // Check if new slug is already taken by another org
        const existingSlug = await c.env.DB.prepare(
            'SELECT id FROM organizations WHERE slug = ? AND id != ?'
        ).bind(slug, id).first()

        if (existingSlug) {
            return c.json({ error: 'Organization slug already exists' }, 400)
        }
        updates.push('slug = ?')
        bindings.push(slug)
    }

    if (updates.length > 0) {
        bindings.push(id)
        await c.env.DB.prepare(
            `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...bindings).run()
    }

    // Update subscription plan if provided
    if (plan && ['nonprofit', 'profit'].includes(plan)) {
        const amount = plan === 'profit' ? 100000 : 0
        await c.env.DB.prepare(
            'UPDATE subscriptions SET plan = ?, amount = ? WHERE organization_id = ?'
        ).bind(plan, amount, id).run()
    }

    return c.json({ message: 'Organization updated successfully' })
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

// Create new user (super admin only)
admin.post('/users', async (c) => {
    const { email, password, name, organization_id, role = 'admin' } = await c.req.json()

    if (!email || !password || !name || !organization_id) {
        return c.json({ error: 'Email, password, name, and organization_id are required' }, 400)
    }

    if (password.length < 6) {
        return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

    if (!['admin', 'user'].includes(role)) {
        return c.json({ error: 'Invalid role. Must be admin or user' }, 400)
    }

    // Check if email already exists
    const existingUser = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()

    if (existingUser) {
        return c.json({ error: 'Email already in use' }, 400)
    }

    // Check if organization exists
    const org = await c.env.DB.prepare(
        'SELECT id FROM organizations WHERE id = ?'
    ).bind(organization_id).first()

    if (!org) {
        return c.json({ error: 'Organization not found' }, 404)
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const userId = `user_${crypto.randomUUID().slice(0, 8)}`
    await c.env.DB.prepare(
        'INSERT INTO users (id, organization_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(userId, organization_id, email, passwordHash, name, role).run()

    return c.json({
        message: 'User created successfully',
        user: { id: userId, email, name, role, organization_id }
    })
})

// Edit user (super admin only) - update name, email, password
admin.put('/users/:id', async (c) => {
    const { id } = c.req.param()
    const { name, email, password, organization_id } = await c.req.json()
    const currentUser = c.get('user')

    // Prevent editing super admin's own account through this endpoint
    if (id === currentUser.userId) {
        return c.json({ error: 'Use profile page to edit your own account' }, 400)
    }

    // Check target user exists and is not super admin
    const targetUser = await c.env.DB.prepare(
        'SELECT id, role FROM users WHERE id = ?'
    ).bind(id).first()

    if (!targetUser) {
        return c.json({ error: 'User not found' }, 404)
    }

    if ((targetUser as any).role === 'super_admin') {
        return c.json({ error: 'Cannot edit super admin users' }, 403)
    }

    // Check if email is already taken
    if (email) {
        const existingEmail = await c.env.DB.prepare(
            'SELECT id FROM users WHERE email = ? AND id != ?'
        ).bind(email, id).first()

        if (existingEmail) {
            return c.json({ error: 'Email already in use' }, 400)
        }
    }

    // Build update query dynamically
    const updates: string[] = []
    const bindings: any[] = []

    if (name) {
        updates.push('name = ?')
        bindings.push(name)
    }
    if (email) {
        updates.push('email = ?')
        bindings.push(email)
    }
    if (password && password.length >= 6) {
        const passwordHash = await hashPassword(password)
        updates.push('password_hash = ?')
        bindings.push(passwordHash)
    }
    if (organization_id) {
        updates.push('organization_id = ?')
        bindings.push(organization_id)
    }

    if (updates.length === 0) {
        return c.json({ error: 'No fields to update' }, 400)
    }

    bindings.push(id)
    await c.env.DB.prepare(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...bindings).run()

    return c.json({ message: 'User updated successfully' })
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
// Get landing page configuration (admin)
admin.get('/landing-config', async (c) => {
    const config = await c.env.DB.prepare(
        "SELECT value FROM settings WHERE key = 'landing_page_config' AND organization_id = 'org_system'"
    ).first()

    if (!config) {
        return c.json({})
    }

    try {
        return c.json(JSON.parse(config.value as string))
    } catch {
        return c.json({})
    }
})

// Update landing page configuration (admin)
admin.put('/landing-config', async (c) => {
    const config = await c.req.json()
    const configStr = JSON.stringify(config)

    // Check if config exists
    const existing = await c.env.DB.prepare(
        "SELECT key FROM settings WHERE key = 'landing_page_config' AND organization_id = 'org_system'"
    ).first()

    if (existing) {
        await c.env.DB.prepare(
            "UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'landing_page_config' AND organization_id = 'org_system'"
        ).bind(configStr).run()
    } else {
        await c.env.DB.prepare(
            "INSERT INTO settings (key, value, organization_id) VALUES ('landing_page_config', ?, 'org_system')"
        ).bind(configStr).run()
    }

    return c.json({ message: 'Landing page configuration updated' })
})
