import { Hono } from 'hono'
import type { Bindings } from '../index'
import { signJWT, hashPassword, verifyPassword } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'

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
    ).bind(email).first() as {
        id: string
        organization_id: string
        email: string
        password_hash: string
        name: string
        role: string
    } | null

    if (!user) {
        console.log(`[AUTH] Login failed: User not found for email ${email}`)
        // DEBUG: Return specific error
        return c.json({ error: 'User not found' }, 401)
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
        // For backward compatibility with old unhashed passwords
        if (user.password_hash !== password) {
            console.log(`[AUTH] Login failed: Password mismatch for ${email}`)
            // DEBUG: Return specific error
            return c.json({ error: 'Invalid password' }, 401)
        }
    }

    console.log(`[AUTH] Login successful for ${email}`)

    // Generate JWT token
    const token = await signJWT({
        userId: user.id,
        email: user.email,
        orgId: user.organization_id,
        role: user.role || 'admin'
    }, c.env.JWT_SECRET)

    return c.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organization_id: user.organization_id  // Add this field
        }
    })
})

// Register
auth.post('/register', async (c) => {
    const { email, password, name, organizationName } = await c.req.json()

    if (!email || !password || !name) {
        return c.json({ error: 'Email, password, and name required' }, 400)
    }

    if (password.length < 6) {
        return c.json({ error: 'Password must be at least 6 characters' }, 400)
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

    // Hash password and create user
    const userId = `user_${crypto.randomUUID().slice(0, 8)}`
    const passwordHash = await hashPassword(password)

    await c.env.DB.prepare(
        'INSERT INTO users (id, organization_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, orgId, email, passwordHash, name).run()

    // Create nonprofit subscription (default free plan)
    const subId = `sub_${crypto.randomUUID().slice(0, 8)}`
    await c.env.DB.prepare(
        'INSERT INTO subscriptions (id, organization_id, plan, status, payment_status) VALUES (?, ?, ?, ?, ?)'
    ).bind(subId, orgId, 'nonprofit', 'active', 'paid').run()

    // Generate token for immediate login
    const token = await signJWT({
        userId,
        email,
        orgId,
        role: 'admin'
    }, c.env.JWT_SECRET)

    return c.json({
        message: 'Registration successful',
        token,
        user: {
            id: userId,
            email,
            name,
            organization_id: orgId  // Add this field
        }
    }, 201)
})

// Get current user (protected route)
auth.get('/me', authMiddleware, async (c) => {
    const user = c.get('user')

    const dbUser = await c.env.DB.prepare(
        'SELECT u.*, o.name as organization_name FROM users u LEFT JOIN organizations o ON u.organization_id = o.id WHERE u.id = ?'
    ).bind(user.userId).first() as {
        id: string
        email: string
        name: string
        role: string
        organization_name: string
    } | null

    if (!dbUser) {
        return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        organization: dbUser.organization_name,
        organization_id: user.orgId  // Add this field from JWT
    })
})

// Refresh token
auth.post('/refresh', authMiddleware, async (c) => {
    const user = c.get('user')

    const token = await signJWT({
        userId: user.userId,
        email: user.email,
        orgId: user.orgId,
        role: user.role
    }, c.env.JWT_SECRET)

    return c.json({ token })
})

// Update user profile
auth.put('/profile', authMiddleware, async (c) => {
    const user = c.get('user')
    const { name, email } = await c.req.json()

    if (!name || !email) {
        return c.json({ error: 'Name and email are required' }, 400)
    }

    // Check if email is already taken by another user
    const existingUser = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ? AND id != ?'
    ).bind(email, user.userId).first()

    if (existingUser) {
        return c.json({ error: 'Email already in use' }, 400)
    }

    // Update user
    await c.env.DB.prepare(
        'UPDATE users SET name = ?, email = ? WHERE id = ?'
    ).bind(name, email, user.userId).run()

    return c.json({ message: 'Profile updated successfully' })
})

// Change password
auth.put('/change-password', authMiddleware, async (c) => {
    const user = c.get('user')
    const { current_password, new_password } = await c.req.json()

    if (!current_password || !new_password) {
        return c.json({ error: 'Current and new password are required' }, 400)
    }

    if (new_password.length < 6) {
        return c.json({ error: 'New password must be at least 6 characters' }, 400)
    }

    // Get current user
    const dbUser = await c.env.DB.prepare(
        'SELECT password_hash FROM users WHERE id = ?'
    ).bind(user.userId).first()

    if (!dbUser) {
        return c.json({ error: 'User not found' }, 404)
    }

    // Verify current password (with plain text fallback for backward compatibility)
    const isValid = await verifyPassword(current_password, dbUser.password_hash as string)
    if (!isValid) {
        // For backward compatibility with old unhashed passwords
        if (dbUser.password_hash !== current_password) {
            return c.json({ error: 'Current password is incorrect' }, 401)
        }
    }

    // Hash new password
    const hashedPassword = await hashPassword(new_password)

    // Update password
    await c.env.DB.prepare(
        'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(hashedPassword, user.userId).run()

    return c.json({ message: 'Password changed successfully' })
})
