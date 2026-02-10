import type { Bindings } from '../index'

interface WAHAConfig {
    apiUrl: string
    apiKey: string
    session: string
    enabled: boolean
}

// Fetch WAHA configuration from settings for a specific organization
// Fetch WAHA configuration
// 1. Checks if organization has enabled WAHA (waha_enabled column)
// 2. Fetches credentials from SYSTEM settings (org_system)
interface WAHAConfigResult {
    config: WAHAConfig | null
    error?: string
}

async function getWAHAConfig(db: D1Database, organizationId: string): Promise<WAHAConfigResult> {
    console.log('[WAHA] Fetching config for organization:', organizationId)

    // 1. Check if organization has enabled WAHA via Notification Preferences
    // Default to ENABLED unless explicitly disabled
    let orgEnabled = true // Changed from false to true (default enabled)
    let orgExplicitlyDisabled = false

    try {
        const result = await db.prepare(
            'SELECT value FROM settings WHERE key = ? AND organization_id = ?'
        ).bind('notification_preferences', organizationId).first()

        console.log('[WAHA] Notification Prefs Result:', JSON.stringify(result))

        if (result && result.value) {
            try {
                const prefs = JSON.parse(result.value as string)
                console.log('[WAHA] Parsed Prefs:', JSON.stringify(prefs))

                // Check if whatsapp field exists in preferences
                if ('whatsapp' in prefs) {
                    // Organization has explicitly set the preference
                    if (prefs.whatsapp === false) {
                        orgEnabled = false
                        orgExplicitlyDisabled = true
                        console.log('[WAHA] Organization explicitly disabled WhatsApp')
                    } else if (prefs.whatsapp === true) {
                        orgEnabled = true
                        console.log('[WAHA] Organization explicitly enabled WhatsApp')
                    }
                } else {
                    // Preference exists but whatsapp field not set - default to enabled
                    console.log('[WAHA] Notification preferences exist but whatsapp not set - defaulting to enabled')
                }
            } catch (e) {
                console.warn('[WAHA] Failed to parse notification preferences:', e)
                // On parse error, default to enabled
            }
        } else {
            // No notification preferences found - default to enabled for backward compatibility
            console.log('[WAHA] No notification preferences found - defaulting to enabled')
        }

        // Legacy check: waha_enabled column in organizations table (only if not explicitly set via prefs)
        if (result === null || result.value === null) {
            const org = await db.prepare(
                'SELECT waha_enabled FROM organizations WHERE id = ?'
            ).bind(organizationId).first() as { waha_enabled: number } | null

            if (org && org.waha_enabled === 0) {
                orgEnabled = false
                orgExplicitlyDisabled = true
                console.log('[WAHA] Legacy: Organization disabled WhatsApp via waha_enabled column')
            } else if (org && org.waha_enabled === 1) {
                orgEnabled = true
                console.log('[WAHA] Legacy: Organization enabled WhatsApp via waha_enabled column')
            }
        }
    } catch (e) {
        console.warn('[WAHA] Warning: Error checking enabled status:', e)
        // On error, default to enabled
    }

    if (!orgEnabled && orgExplicitlyDisabled) {
        console.log('[WAHA] WAHA explicitly disabled for organization:', organizationId)
        return { config: null, error: 'Organization has disabled WhatsApp notifications in Settings' }
    }

    // 2. Check for org-specific WAHA config (isolated mode)
    const orgWahaResult = await db.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('waha_api_url', 'waha_api_key', 'waha_session')
        AND organization_id = ?
    `).bind(organizationId).all()

    const orgWahaConfig = new Map(orgWahaResult.results.map((s: any) => [s.key, s.value]))
    const orgApiUrl = (orgWahaConfig.get('waha_api_url') || '').replace(/\/+$/, '')
    const orgApiKey = orgWahaConfig.get('waha_api_key') || ''

    // If org has both API URL and API Key → use isolated config
    if (orgApiUrl && orgApiKey) {
        const orgSession = orgWahaConfig.get('waha_session') || 'default'
        console.log('[WAHA] Using ISOLATED config for org:', organizationId)
        console.log('[WAHA] Isolated API URL:', orgApiUrl)
        console.log('[WAHA] Isolated Session:', orgSession)
        return {
            config: {
                apiUrl: orgApiUrl,
                apiKey: orgApiKey,
                session: orgSession,
                enabled: true
            }
        }
    }

    // 3. Fallback to global config from org_system
    console.log('[WAHA] No org-specific config found, using GLOBAL config')
    const result = await db.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('waha_api_url', 'waha_api_key', 'waha_session', 'waha_enabled')
        AND organization_id = 'org_system'
    `).all()

    const config = new Map(result.results.map((s: any) => [s.key, s.value]))

    // Check if System is globally enabled
    const globalEnabledStr = config.get('waha_enabled')
    if (globalEnabledStr === 'false') {
        console.log('[WAHA] WAHA globally disabled (explicitly set to false)')
        return { config: null, error: 'WAHA is globally disabled by Super Admin' }
    }

    let apiUrl = config.get('waha_api_url') || ''
    const apiKey = config.get('waha_api_key') || ''

    // Remove trailing slash
    apiUrl = apiUrl.replace(/\/+$/, '')

    console.log('[WAHA] API URL:', apiUrl ? apiUrl : 'NOT SET')
    console.log('[WAHA] API Key:', apiKey ? 'SET (hidden)' : 'NOT SET')

    if (!apiUrl) {
        console.log('[WAHA] Missing API URL')
        return { config: null, error: 'WAHA API URL is not configured by Super Admin' }
    }

    if (!apiKey) {
        console.log('[WAHA] Missing API Key')
        return { config: null, error: 'WAHA API Key is not configured by Super Admin' }
    }

    const session = config.get('waha_session') || 'default'

    return {
        config: {
            apiUrl,
            apiKey,
            session,
            enabled: true
        }
    }
}

// Format phone number for WhatsApp (add @c.us suffix)
function formatWhatsAppNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // Add country code if not present (assume Indonesia +62)
    if (!cleaned.startsWith('62')) {
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1)
        } else {
            cleaned = '62' + cleaned
        }
    }

    return cleaned + '@c.us'
}

// Helper to sleep for ms
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to get random delay between min and max (inclusive)
const getRandomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)

// Check if there are incoming messages from this user (Placeholder)
// In a real implementation, this would query the database or WAHA for chat history
async function checkIncomingMessage(config: WAHAConfig, chatId: string): Promise<boolean> {
    // TODO: Implement actual check
    // For now, return false to be safe and avoid aggressive "seen" marking
    return false
}

// Send "seen" status
async function sendSeen(config: WAHAConfig, chatId: string) {
    try {
        await fetch(`${config.apiUrl}/api/sendSeen`, {
            method: 'POST',
            headers: {
                'X-Api-Key': config.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session: config.session,
                chatId
            })
        })
    } catch (e) {
        console.warn('[WAHA] Failed to send seen status:', e)
    }
}

// Start typing simulation
async function startTyping(config: WAHAConfig, chatId: string) {
    try {
        await fetch(`${config.apiUrl}/api/startTyping`, {
            method: 'POST',
            headers: {
                'X-Api-Key': config.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session: config.session,
                chatId
            })
        })
    } catch (e) {
        console.warn('[WAHA] Failed to start typing:', e)
    }
}

// Send WhatsApp message via WAHA API
export async function sendWhatsAppMessage(
    db: D1Database,
    organizationId: string,
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
        console.log('[WAHA] Starting sendWhatsAppMessage (Human-Like Logic) for phone:', phone, 'org:', organizationId)

        const result = await getWAHAConfig(db, organizationId)

        if (!result.config) {
            console.log('[WAHA] WAHA not configured or disabled for organization:', organizationId, 'Error:', result.error)
            return { success: false, error: result.error || 'WAHA not configured' }
        }

        const config = result.config

        console.log('[WAHA] Config loaded:', {
            apiUrl: config.apiUrl,
            session: config.session,
            hasApiKey: !!config.apiKey
        })

        const chatId = formatWhatsAppNumber(phone)
        console.log('[WAHA] Formatted chatId:', chatId)

        // --- HUMAN LIKE BEHAVIOR START ---

        // 1. Random Delay (8-15 seconds)
        const initialDelay = getRandomDelay(8000, 15000)
        console.log(`[WAHA] Waiting for ${initialDelay}ms before processing...`)
        await sleep(initialDelay)

        // 2. Mark as Seen (Optional - only if we think they messaged us)
        const hasIncoming = await checkIncomingMessage(config, chatId)
        if (hasIncoming) {
            console.log('[WAHA] Marking chat as seen...')
            await sendSeen(config, chatId)
            await sleep(500)
        }

        // 3. Simulate Typing
        console.log('[WAHA] sending startTyping...')
        await startTyping(config, chatId)

        // Typing duration based on message length, but kept simple 3-6s for now
        const typingDuration = getRandomDelay(3000, 6000)
        console.log(`[WAHA] Typing for ${typingDuration}ms...`)
        await sleep(typingDuration)

        // --- HUMAN LIKE BEHAVIOR END ---

        const requestBody = {
            session: config.session,
            chatId,
            text: message
        }

        console.log('[WAHA] Sending request to:', `${config.apiUrl}/api/sendText`)
        console.log('[WAHA] Request body:', JSON.stringify(requestBody))

        const response = await fetch(`${config.apiUrl}/api/sendText`, {
            method: 'POST',
            headers: {
                'X-Api-Key': config.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })

        console.log('[WAHA] Response status:', response.status)

        if (!response.ok) {
            const error = await response.text()
            console.error('[WAHA] API error response:', error)

            // Update participant status to failed
            try {
                await db.prepare(`
                    UPDATE participants 
                    SET whatsapp_status = 'failed', 
                        whatsapp_error = ?,
                        whatsapp_sent_at = CURRENT_TIMESTAMP
                    WHERE phone = ?
                `).bind(`WAHA API error: ${response.status}`, phone).run()
            } catch (dbError) {
                console.error('[WAHA] Failed to update status:', dbError)
            }

            return { success: false, error: `WAHA API error: ${response.status} - ${error}` }
        }

        const responseData = await response.json() as any
        console.log('[WAHA] Success! Response:', JSON.stringify(responseData))

        // Update participant status to sent
        try {
            await db.prepare(`
                UPDATE participants 
                SET whatsapp_status = 'sent',
                    whatsapp_sent_at = CURRENT_TIMESTAMP,
                    whatsapp_error = NULL
                WHERE phone = ?
            `).bind(phone).run()
        } catch (dbError) {
            console.error('[WAHA] Failed to update status:', dbError)
        }

        return { success: true, messageId: responseData.id }
    } catch (error) {
        console.error('[WAHA] Exception:', error)

        // Update participant status to failed
        try {
            await db.prepare(`
                UPDATE participants 
                SET whatsapp_status = 'failed',
                    whatsapp_error = ?,
                    whatsapp_sent_at = CURRENT_TIMESTAMP
                WHERE phone = ?
            `).bind(error instanceof Error ? error.message : 'Unknown error', phone).run()
        } catch (dbError) {
            console.error('[WAHA] Failed to update status:', dbError)
        }

        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// Generate registration success message
export function generateRegistrationMessage(data: {
    eventTitle: string
    fullName: string
    registrationId: string
    ticketLink: string
    ticketName?: string
    ticketPrice?: number
    customFieldResponses?: Array<{ label: string; response: string }>
}): string {
    const { eventTitle, fullName, registrationId, ticketLink, ticketName, ticketPrice, customFieldResponses } = data

    let message = `🎉 *PENDAFTARAN BERHASIL!*

Terima kasih telah mendaftar untuk:
📌 *Event:* ${eventTitle}

👤 *Nama:* ${fullName}
🔖 *ID Registrasi:* ${registrationId}`

    if (ticketName) {
        message += `\n🎫 *Tiket:* ${ticketName}`
    }

    if (ticketPrice && ticketPrice > 0) {
        message += `\n💰 *Harga:* Rp ${ticketPrice.toLocaleString('id-ID')}`
    }

    // Add custom field responses if any
    if (customFieldResponses && customFieldResponses.length > 0) {
        message += `\n\n📋 *Informasi Tambahan:*`
        for (const field of customFieldResponses) {
            message += `\n• *${field.label}:* ${field.response}`
        }
    }

    message += `

🎫 *E-Ticket & QR Code:*
${ticketLink}

Tunjukkan QR Code saat check-in.

Sampai jumpa di acara! 🙏`

    return message
}

// Generate payment pending message
export function generatePaymentPendingMessage(data: {
    eventTitle: string
    fullName: string
    ticketPrice: number
    bankName?: string
    accountHolder?: string
    accountNumber?: string
}): string {
    const { eventTitle, fullName, ticketPrice, bankName, accountHolder, accountNumber } = data

    let message = `✅ *REGISTRASI DITERIMA*

Terima kasih telah mendaftar!
📌 *Event:* ${eventTitle}
👤 *Nama:* ${fullName}
💰 *Total:* Rp ${ticketPrice.toLocaleString('id-ID')}`

    if (bankName && accountHolder && accountNumber) {
        message += `

━━━━━━━━━━━━━━━━━━━━
💳 *INFORMASI TRANSFER*
━━━━━━━━━━━━━━━━━━━━

Bank: *${bankName}*
Atas Nama: *${accountHolder}*
No. Rekening: *${accountNumber}*

_Mohon transfer sesuai nominal dan kirim bukti transfer ke nomor ini_`
    } else {
        message += `

Silakan selesaikan pembayaran untuk mendapatkan E-Ticket Anda.`
    }

    return message
}
