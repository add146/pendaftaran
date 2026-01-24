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
        AND organization_id = 'org_system'
    `).all()

    const settingsMap = new Map(wahaSettings.results.map((s: any) => [s.key, s.value]))
    const globalEnabled = settingsMap.get('waha_enabled') === 'true'
    let apiUrl = settingsMap.get('waha_api_url') || ''
    const apiKey = settingsMap.get('waha_api_key') || ''
    const session = settingsMap.get('waha_session') || 'default'

    // Normalize API URL
    if (apiUrl && !apiUrl.startsWith('http')) {
        apiUrl = `https://${apiUrl}`
    }
    if (apiUrl && apiUrl.endsWith('/')) {
        apiUrl = apiUrl.slice(0, -1)
    }

    // Check organization WAHA toggle
    const org = await c.env.DB.prepare(
        'SELECT waha_enabled FROM organizations WHERE id = ?'
    ).bind(id).first() as { waha_enabled: number } | null

    const orgEnabled = org?.waha_enabled === 1
    // WAHA is available if global is configured AND enabled, AND organization has enabled it
    const available = globalEnabled && !!apiUrl && !!apiKey && orgEnabled

    // Check live connection status - check if WAHA is globally configured (regardless of org toggle)
    let connected = false
    let working = false
    let sessionStatus = 'NOT_CONFIGURED'
    let lastError = ''

    const globallyConfigured = !!apiUrl && !!apiKey && globalEnabled

    if (globallyConfigured) {
        try {
            // Check if WAHA API is working and session status
            const fetchUrl = `${apiUrl}/api/sessions/${session}`
            console.log(`[WAHA] Checking status: ${fetchUrl}`)

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'X-Api-Key': apiKey,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json() as any
                sessionStatus = data?.status || 'UNKNOWN'
                // Session is WORKING if status is WORKING
                working = sessionStatus === 'WORKING'
                // Session is connected if we have me.id (authenticated)
                connected = !!(data?.me?.id || data?.me?.pushName)
            } else if (response.status === 422 || response.status === 404) {
                // Session not found or not started
                working = false
                connected = false
                sessionStatus = 'NOT_FOUND'
                lastError = `Session not found (${response.status})`
            } else {
                // API returned error
                working = false
                connected = false
                sessionStatus = 'ERROR'
                lastError = `API Error: ${response.status} ${response.statusText}`
                try {
                    const errData = await response.text()
                    lastError += ` - ${errData}`
                } catch { }
            }
        } catch (error: any) {
            console.error('[WAHA] Status check error:', error)
            // API not reachable
            working = false
            connected = false
            sessionStatus = 'UNREACHABLE'
            lastError = `Network Error: ${error.message}`
        }
    } else {
        lastError = 'Not globally configured'
    }

    return c.json({
        global_enabled: globalEnabled,
        global_configured: !!apiUrl && !!apiKey,
        org_enabled: orgEnabled,
        available,
        api_url: apiUrl,
        connected,
        working,
        session_status: sessionStatus,
        last_error: lastError
    })
})

