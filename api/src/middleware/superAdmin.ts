import { Context, Next } from 'hono'
import type { Bindings } from '../index'

// Middleware to check if user is super admin
export async function superAdminMiddleware(
    c: Context<{ Bindings: Bindings }>,
    next: Next
) {
    const user = c.get('user')

    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    if (user.role !== 'super_admin') {
        return c.json({ error: 'Forbidden - Super admin access required' }, 403)
    }

    await next()
}
