import { Context, Next } from 'hono'
import { verifyJWT, type JWTPayload } from '../lib/jwt'
import type { Bindings } from '../index'

// Extend Context to include user
declare module 'hono' {
    interface ContextVariableMap {
        user: JWTPayload
    }
}

/**
 * Auth middleware - verifies JWT and adds user to context
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized - No token provided' }, 401)
    }

    const token = authHeader.slice(7)
    const payload = await verifyJWT(token, c.env.JWT_SECRET)

    if (!payload) {
        return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401)
    }

    c.set('user', payload)
    await next()
}

/**
 * Optional auth middleware - does not fail if no token
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
    const authHeader = c.req.header('Authorization')

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const payload = await verifyJWT(token, c.env.JWT_SECRET)

        if (payload) {
            c.set('user', payload)
        }
    }

    await next()
}
