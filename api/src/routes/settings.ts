import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

interface Bindings {
    DB: D1Database
    JWT_SECRET: string
}

export const settings = new Hono<{ Bindings: Bindings }>()

// All routes require authentication
settings.use('*', authMiddleware)

// Get all settings
settings.get('/', async (c) => {
    const result = await c.env.DB.prepare(
        'SELECT key, value FROM settings'
    ).all()

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

// Get single setting
settings.get('/:key', async (c) => {
    const { key } = c.req.param()

    const result = await c.env.DB.prepare(
        'SELECT value FROM settings WHERE key = ?'
    ).bind(key).first()

    if (!result) {
        return c.json({ error: 'Setting not found' }, 404)
    }

    try {
        return c.json({ key, value: JSON.parse(result.value as string) })
    } catch {
        return c.json({ key, value: result.value })
    }
})

// Save/Update settings (upsert)
settings.post('/', async (c) => {
    const body = await c.req.json()
    const { key, value } = body as { key: string; value: any }

    if (!key) {
        return c.json({ error: 'Key is required' }, 400)
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
    const now = new Date().toISOString()

    await c.env.DB.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `).bind(key, valueStr, now, valueStr, now).run()

    return c.json({ message: 'Setting saved', key })
})

// Save multiple settings at once
settings.post('/bulk', async (c) => {
    const body = await c.req.json()
    const settingsData = body as Record<string, any>

    const now = new Date().toISOString()

    for (const [key, value] of Object.entries(settingsData)) {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

        await c.env.DB.prepare(`
            INSERT INTO settings (key, value, updated_at) 
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
        `).bind(key, valueStr, now, valueStr, now).run()
    }

    return c.json({ message: 'Settings saved', count: Object.keys(settingsData).length })
})

// Delete setting
settings.delete('/:key', async (c) => {
    const { key } = c.req.param()

    await c.env.DB.prepare(
        'DELETE FROM settings WHERE key = ?'
    ).bind(key).run()

    return c.json({ message: 'Setting deleted' })
})
