import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

interface Bindings {
    DB: D1Database
    JWT_SECRET: string
}

export const settings = new Hono<{ Bindings: Bindings }>()

// Enable auth for all settings routes
settings.use('*', authMiddleware)

// Get all settings for current organization
settings.get('/', async (c) => {
    const user = c.get('user')

    const result = await c.env.DB.prepare(
        'SELECT key, value FROM settings WHERE organization_id = ?'
    ).bind(user.orgId).all()

    // Convert to object
    const settingsObj: Record<string, any> = {}
    for (const row of result.results as any[]) {
        try {
            settingsObj[row.key] = JSON.parse(row.value)
        } catch {
            settingsObj[row.key] = row.value
        }
    }

    return c.json(settingsObj)
})

// Get single setting for current organization
settings.get('/:key', async (c) => {
    const user = c.get('user')
    const { key } = c.req.param()

    const result = await c.env.DB.prepare(
        'SELECT value FROM settings WHERE key = ? AND organization_id = ?'
    ).bind(key, user.orgId).first()

    if (!result) {
        return c.json({ error: 'Setting not found' }, 404)
    }

    try {
        return c.json({ key, value: JSON.parse(result.value as string) })
    } catch {
        return c.json({ key, value: result.value })
    }
})

// Save/Update settings (upsert) for current organization
settings.post('/', async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const { key, value } = body as { key: string; value: any }

    if (!key) {
        return c.json({ error: 'Key is required' }, 400)
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

    // Check if setting exists for this organization
    const existing = await c.env.DB.prepare(
        'SELECT key FROM settings WHERE key = ? AND organization_id = ?'
    ).bind(key, user.orgId).first()

    if (existing) {
        // Update
        await c.env.DB.prepare(
            'UPDATE settings SET value = ? WHERE key = ? AND organization_id = ?'
        ).bind(valueStr, key, user.orgId).run()
    } else {
        // Insert
        const id = `set_${crypto.randomUUID().slice(0, 8)}`
        await c.env.DB.prepare(
            'INSERT INTO settings (id, key, value, organization_id) VALUES (?, ?, ?, ?)'
        ).bind(id, key, valueStr, user.orgId).run()
    }

    return c.json({ message: 'Setting saved', key })
})

// Bulk save settings for current organization
settings.post('/bulk', async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const settingsObj = body as Record<string, any>

    let count = 0
    for (const [key, value] of Object.entries(settingsObj)) {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

        const existing = await c.env.DB.prepare(
            'SELECT key FROM settings WHERE key = ? AND organization_id = ?'
        ).bind(key, user.orgId).first()

        if (existing) {
            await c.env.DB.prepare(
                'UPDATE settings SET value = ? WHERE key = ? AND organization_id = ?'
            ).bind(valueStr, key, user.orgId).run()
        } else {
            const id = `set_${crypto.randomUUID().slice(0, 8)}`
            await c.env.DB.prepare(
                'INSERT INTO settings (id, key, value, organization_id) VALUES (?, ?, ?, ?)'
            ).bind(id, key, valueStr, user.orgId).run()
        }
        count++
    }

    return c.json({ message: 'Settings saved', count })
})

// Delete setting for current organization
settings.delete('/:key', async (c) => {
    const user = c.get('user')
    const { key } = c.req.param()

    await c.env.DB.prepare(
        'DELETE FROM settings WHERE key = ? AND organization_id = ?'
    ).bind(key, user.orgId).run()

    return c.json({ message: 'Setting deleted' })
})
