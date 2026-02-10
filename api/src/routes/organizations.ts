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

// Get WAHA status (hybrid: checks org-specific config first, then global)
organizations.get('/:id/waha-status', authMiddleware, async (c) => {
    const user = c.get('user')
    const { id } = c.req.param()

    if (user.orgId !== id) {
        return c.json({ error: 'Unauthorized' }, 403)
    }

    // 1. Check for org-specific WAHA config (isolated mode)
    const orgWahaSettings = await c.env.DB.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('waha_api_url', 'waha_api_key', 'waha_session')
        AND organization_id = ?
    `).bind(id).all()

    const orgSettingsMap = new Map(orgWahaSettings.results.map((s: any) => [s.key, s.value]))
    const orgApiUrl = (orgSettingsMap.get('waha_api_url') || '').replace(/\/+$/, '')
    const orgApiKey = orgSettingsMap.get('waha_api_key') || ''
    const hasOwnConfig = !!(orgApiUrl && orgApiKey)

    // 2. Check global WAHA config from settings table
    const wahaSettings = await c.env.DB.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('waha_api_url', 'waha_api_key', 'waha_session', 'waha_enabled')
        AND organization_id = 'org_system'
    `).all()

    const settingsMap = new Map(wahaSettings.results.map((s: any) => [s.key, s.value]))

    const globalEnabledStr = settingsMap.get('waha_enabled')
    let globalEnabled = globalEnabledStr === 'true'

    const globalApiUrl = (settingsMap.get('waha_api_url') || '').replace(/\/+$/, '')
    const globalApiKey = settingsMap.get('waha_api_key') || ''
    const globalSession = settingsMap.get('waha_session') || 'default'

    // Robustness: If API URL is set and enabled is not explicitly false, assume true
    if (globalApiUrl && globalEnabledStr !== 'false') {
        globalEnabled = true
    }

    // Determine which config to use for live check
    let activeApiUrl = hasOwnConfig ? orgApiUrl : globalApiUrl
    let activeApiKey = hasOwnConfig ? orgApiKey : globalApiKey
    let activeSession = hasOwnConfig ? (orgSettingsMap.get('waha_session') || 'default') : globalSession
    const configMode = hasOwnConfig ? 'isolated' : 'global'

    // Normalize API URL
    if (activeApiUrl && !activeApiUrl.startsWith('http')) {
        activeApiUrl = `https://${activeApiUrl}`
    }

    // Check organization WAHA toggle
    // Default to ENABLED (matches whatsapp.ts behavior)
    let orgEnabled = true
    let hasExplicitPref = false
    try {
        const prefResult = await c.env.DB.prepare(
            'SELECT value FROM settings WHERE key = ? AND organization_id = ?'
        ).bind('notification_preferences', id).first()

        if (prefResult && prefResult.value) {
            const prefs = JSON.parse(prefResult.value as string)
            hasExplicitPref = true
            if (prefs.whatsapp === false) {
                orgEnabled = false
            }
        }
    } catch (e) {
        console.warn('Error verifying org preferences:', e)
    }

    // Legacy Fallback (only if no explicit preference found)
    if (!hasExplicitPref) {
        const org = await c.env.DB.prepare(
            'SELECT waha_enabled FROM organizations WHERE id = ?'
        ).bind(id).first() as { waha_enabled: number } | null
        if (org?.waha_enabled === 0) {
            orgEnabled = false
        }
    }

    // For isolated mode, availability doesn't depend on global config
    const isConfigured = !!(activeApiUrl && activeApiKey)
    const available = hasOwnConfig
        ? isConfigured && orgEnabled
        : globalEnabled && isConfigured && orgEnabled

    // Check live connection status
    let connected = false
    let working = false
    let sessionStatus = 'NOT_CONFIGURED'
    let lastError = ''

    if (isConfigured && (hasOwnConfig || globalEnabled)) {
        try {
            const fetchUrl = `${activeApiUrl}/api/sessions/${activeSession}`
            console.log(`[WAHA] Checking status (${configMode}): ${fetchUrl}`)

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'X-Api-Key': activeApiKey,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json() as any
                sessionStatus = data?.status || 'UNKNOWN'
                working = sessionStatus === 'WORKING'
                connected = !!(data?.me?.id || data?.me?.pushName)
            } else if (response.status === 422 || response.status === 404) {
                sessionStatus = 'NOT_FOUND'
                lastError = `Session not found (${response.status})`
            } else {
                sessionStatus = 'ERROR'
                lastError = `API Error: ${response.status} ${response.statusText}`
                try {
                    const errData = await response.text()
                    lastError += ` - ${errData}`
                } catch { }
            }
        } catch (error: any) {
            console.error('[WAHA] Status check error:', error)
            sessionStatus = 'UNREACHABLE'
            lastError = `Network Error: ${error.message}`
        }
    } else {
        lastError = hasOwnConfig ? 'Incomplete org config' : 'Not globally configured'
    }

    return c.json({
        global_enabled: globalEnabled,
        global_configured: !!(globalApiUrl && globalApiKey),
        org_enabled: orgEnabled,
        available,
        api_url: activeApiUrl,
        connected,
        working,
        session_status: sessionStatus,
        last_error: lastError,
        config_mode: configMode,
        has_own_config: hasOwnConfig
    })
})

