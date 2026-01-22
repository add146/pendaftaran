import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'

export const organizations = new Hono<{ Bindings: Bindings }>()

// Get organization details
organizations.get('/:id', authMiddleware, async (c) => {
    const user = c.get('user')
    const { id } = c.req.param()

    // Verify user belongs to this organization
    if (user.orgId !== id) {
        return c.json({ error: 'Unauthorized - not member of this organization' }, 403)
    }

    const org = await c.env.DB.prepare(`
        SELECT o.*, s.plan, s.status as subscription_status, o.waha_enabled
        FROM organizations o
        LEFT JOIN subscriptions s ON o.id = s.organization_id
        WHERE o.id = ?
    `).bind(id).first()

    if (!org) {
        return c.json({ error: 'Organization not found' }, 404)
    }

    return c.json(org)
})

// Update organization
organizations.put('/:id', authMiddleware, async (c) => {
    const user = c.get('user')
    const { id } = c.req.param()

    // Verify user belongs to this organization
    if (user.orgId !== id) {
        return c.json({ error: 'Unauthorized' }, 403)
    }

    const body = await c.req.json()
    const { name, logo_url } = body

    await c.env.DB.prepare(`
        UPDATE organizations 
        SET name = COALESCE(?, name), logo_url = COALESCE(?, logo_url)
        WHERE id = ?
    `).bind(name ?? null, logo_url ?? null, id).run()

    return c.json({ message: 'Organization updated' })
})

// Get organization members
organizations.get('/:id/members', authMiddleware, async (c) => {
    const user = c.get('user')
    const { id } = c.req.param()

    if (user.orgId !== id) {
        return c.json({ error: 'Unauthorized' }, 403)
    }

    const members = await c.env.DB.prepare(`
        SELECT id, email, name, role, created_at
        FROM users
        WHERE organization_id = ?
        ORDER BY created_at ASC
    `).bind(id).all()

    return c.json({ members: members.results })
})

// Toggle WAHA for organization
organizations.put('/:id/waha-toggle', authMiddleware, async (c) => {
    const user = c.get('user')
    const { id } = c.req.param()

    if (user.orgId !== id) {
        return c.json({ error: 'Unauthorized' }, 403)
    }

    const body = await c.req.json()
    const { enabled } = body as { enabled: boolean }

    await c.env.DB.prepare(
        'UPDATE organizations SET waha_enabled = ? WHERE id = ?'
    ).bind(enabled ? 1 : 0, id).run()

    return c.json({ message: 'WAHA setting updated', waha_enabled: enabled })
})

// Get WAHA status
organizations.get('/:id/waha-status', authMiddleware, async (c) => {
    const user = c.get('user')
    const { id } = c.req.param()

    if (user.orgId !== id) {
        return c.json({ error: 'Unauthorized' }, 403)
    }

    // Check global WAHA config from settings table
    const wahaSettings = await c.env.DB.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('waha_api_url', 'waha_api_key', 'waha_session', 'waha_enabled')
    `).all()

    const settingsMap = new Map(wahaSettings.results.map((s: any) => [s.key, s.value]))
    const globalEnabled = settingsMap.get('waha_enabled') === 'true'
    const apiUrl = settingsMap.get('waha_api_url') || ''
    const apiKey = settingsMap.get('waha_api_key') || ''

    // Check organization WAHA toggle
    const org = await c.env.DB.prepare(
        'SELECT waha_enabled FROM organizations WHERE id = ?'
    ).bind(id).first() as { waha_enabled: number } | null

    const orgEnabled = org?.waha_enabled === 1
    // WAHA is available if global is configured AND enabled, AND organization has enabled it
    const available = globalEnabled && !!apiUrl && !!apiKey && orgEnabled

    return c.json({
        global_enabled: globalEnabled,
        global_configured: !!apiUrl && !!apiKey,
        org_enabled: orgEnabled,
        available,
        api_url: apiUrl
    })
})
