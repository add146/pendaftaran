import { Hono } from 'hono'
import type { Bindings } from '../index'

export const auth = new Hono<{ Bindings: Bindings }>()

// Login
auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Email and password required' }, 400)
    }

    // Get user from database
    const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).bind(email).first()

    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // For development, skip password verification
    // In production, verify password hash

    // Generate simple token (in production use proper JWT)
    const token = btoa(JSON.stringify({
        userId: user.id,
        email: user.email,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    }))

    return c.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        }
    })
})

// Register
auth.post('/register', async (c) => {
    const { email, password, name, organizationName } = await c.req.json()

    if (!email || !password || !name) {
        return c.json({ error: 'Email, password, and name required' }, 400)
    }

    // Check if user exists
    const existing = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()

    if (existing) {
        return c.json({ error: 'Email already registered' }, 400)
    }

    // Create organization
    const orgId = `org_${crypto.randomUUID().slice(0, 8)}`
    const orgSlug = (organizationName || name).toLowerCase().replace(/\s+/g, '-')

    await c.env.DB.prepare(
        'INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)'
    ).bind(orgId, organizationName || `${name}'s Organization`, orgSlug).run()

    // Create user (in production, hash the password)
    const userId = `user_${crypto.randomUUID().slice(0, 8)}`

    await c.env.DB.prepare(
        'INSERT INTO users (id, organization_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, orgId, email, password, name).run()

    return c.json({
        message: 'Registration successful',
        userId
    }, 201)
})

// Get current user
auth.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const token = authHeader.slice(7)
        const decoded = JSON.parse(atob(token))

        if (decoded.exp < Date.now()) {
            return c.json({ error: 'Token expired' }, 401)
        }

        const user = await c.env.DB.prepare(
            'SELECT u.*, o.name as organization_name FROM users u LEFT JOIN organizations o ON u.organization_id = o.id WHERE u.id = ?'
        ).bind(decoded.userId).first()

        if (!user) {
            return c.json({ error: 'User not found' }, 404)
        }

        return c.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organization: user.organization_name
        })
    } catch {
        return c.json({ error: 'Invalid token' }, 401)
    }
})
