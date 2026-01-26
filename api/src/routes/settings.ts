import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

interface Bindings {
    DB: D1Database
    JWT_SECRET: string
}

export const settings = new Hono<{ Bindings: Bindings }>()

// Enable auth for all settings routes
settings.use('*', authMiddleware)

// Keys that should be stored globally (org_system)
const SYSTEM_SETTINGS_KEYS = [
    'waha_api_url',
    'waha_api_key',
    'waha_session',
    'waha_enabled',
    'public_registration_enabled'
]

// Get all settings for current organization (and system settings if super_admin)
settings.get('/', async (c) => {
    const user = c.get('user')
    const isSuperAdmin = user.role === 'super_admin'

    let query = 'SELECT key, value FROM settings WHERE organization_id = ?'
    const params: any[] = [user.orgId]

    if (isSuperAdmin) {
        query = 'SELECT key, value, organization_id FROM settings WHERE organization_id = ? OR organization_id = \'org_system\''
    }

    const result = await c.env.DB.prepare(query).bind(...params).all()

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
    const user = c.get('user')
    const { key } = c.req.param()
    const isSuperAdmin = user.role === 'super_admin'
    const isSystemKey = SYSTEM_SETTINGS_KEYS.includes(key)

    let result
    if (isSuperAdmin && isSystemKey) {
        result = await c.env.DB.prepare(
            'SELECT value FROM settings WHERE key = ? AND (organization_id = ? OR organization_id = \'org_system\') ORDER BY organization_id DESC' // org_system fallback? no, we want specific
        ).bind(key, user.orgId).first()

        // Actually for system keys we prefer org_system value
        result = await c.env.DB.prepare(
            'SELECT value FROM settings WHERE key = ? AND organization_id = \'org_system\''
        ).bind(key).first()
    } else {
        result = await c.env.DB.prepare(
            'SELECT value FROM settings WHERE key = ? AND organization_id = ?'
        ).bind(key, user.orgId).first()
    }

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
    const user = c.get('user')
    const body = await c.req.json()
    const { key, value } = body as { key: string; value: any }

    if (!key) {
        return c.json({ error: 'Key is required' }, 400)
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

    // Determine target organization ID
    let targetOrgId = user.orgId
    if (user.role === 'super_admin' && SYSTEM_SETTINGS_KEYS.includes(key)) {
        targetOrgId = 'org_system'
    }

    console.log(`[Settings API] Saving key '${key}' for user role '${user.role}'. Target Org: '${targetOrgId}'. Value type: ${typeof value}`)

    // Check if setting exists
    const existing = await c.env.DB.prepare(
        'SELECT key FROM settings WHERE key = ? AND organization_id = ?'
    ).bind(key, targetOrgId).first()

    if (existing) {
        // Update
        await c.env.DB.prepare(
            'UPDATE settings SET value = ? WHERE key = ? AND organization_id = ?'
        ).bind(valueStr, key, targetOrgId).run()
    } else {
        // Insert
        await c.env.DB.prepare(
            'INSERT INTO settings (key, value, organization_id) VALUES (?, ?, ?)'
        ).bind(key, valueStr, targetOrgId).run()
    }

    return c.json({ message: 'Setting saved', key, scope: targetOrgId })
})

// Bulk save settings
settings.post('/bulk', async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const settingsObj = body as Record<string, any>

    let count = 0
    for (const [key, value] of Object.entries(settingsObj)) {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

        // Determine target organization ID
        let targetOrgId = user.orgId
        if (user.role === 'super_admin' && SYSTEM_SETTINGS_KEYS.includes(key)) {
            targetOrgId = 'org_system'
        }

        const existing = await c.env.DB.prepare(
            'SELECT key FROM settings WHERE key = ? AND organization_id = ?'
        ).bind(key, targetOrgId).first()

        if (existing) {
            await c.env.DB.prepare(
                'UPDATE settings SET value = ? WHERE key = ? AND organization_id = ?'
            ).bind(valueStr, key, targetOrgId).run()
        } else {
            await c.env.DB.prepare(
                'INSERT INTO settings (key, value, organization_id) VALUES (?, ?, ?)'
            ).bind(key, valueStr, targetOrgId).run()
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
