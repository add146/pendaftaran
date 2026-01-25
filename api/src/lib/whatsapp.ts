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
async function getWAHAConfig(db: D1Database, organizationId: string): Promise<WAHAConfig | null> {
    console.log('[WAHA] Fetching config for organization:', organizationId)

    // 1. Check if organization has enabled WAHA via Notification Preferences
    let orgEnabled = false
    try {
        const result = await db.prepare(
            'SELECT value FROM settings WHERE key = ? AND organization_id = ?'
        ).bind('notification_preferences', organizationId).first()

        if (result && result.value) {
            try {
                const prefs = JSON.parse(result.value as string)
                if (prefs.whatsapp === true) {
                    orgEnabled = true
                }
            } catch (e) {
                console.warn('[WAHA] Failed to parse notification preferences:', e)
            }
        }

        // Legacy check: waha_enabled column in organizations table
        if (!orgEnabled) {
            const org = await db.prepare(
                'SELECT waha_enabled FROM organizations WHERE id = ?'
            ).bind(organizationId).first() as { waha_enabled: number } | null

            if (org && org.waha_enabled === 1) {
                orgEnabled = true
            }
        }
    } catch (e) {
        console.warn('[WAHA] Warning: Error checking enabled status:', e)
    }

    if (!orgEnabled) {
        console.log('[WAHA] WAHA disabled for organization:', organizationId)
        return null
    }

    // 2. Fetch System Configuration
    // TODO: In the future, we could check for Org-specific overrides here
    const result = await db.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('waha_api_url', 'waha_api_key', 'waha_session', 'waha_enabled')
        AND organization_id = 'org_system'
    `).all()

    const config = new Map(result.results.map((s: any) => [s.key, s.value]))

    // Check if System is globally enabled
    const globalEnabled = config.get('waha_enabled') === 'true'
    if (!globalEnabled) {
        console.log('[WAHA] WAHA globally disabled')
        return null
    }

    let apiUrl = config.get('waha_api_url') || ''
    const apiKey = config.get('waha_api_key')

    // Remove trailing slash
    apiUrl = apiUrl.replace(/\/+$/, '')

    console.log('[WAHA] API URL:', apiUrl ? apiUrl : 'NOT SET')

    if (!apiUrl || !apiKey) {
        console.log('[WAHA] Missing API URL or Key')
        return null
    }

    // Default session is 'default' unless specified in system config
    // We could also allow org-specific session names if needed
    const session = config.get('waha_session') || 'default'

    return {
        apiUrl,
        apiKey,
        session,
        enabled: true
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

// Send WhatsApp message via WAHA API
export async function sendWhatsAppMessage(
    db: D1Database,
    organizationId: string,
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
        console.log('[WAHA] Starting sendWhatsAppMessage for phone:', phone, 'org:', organizationId)

        const config = await getWAHAConfig(db, organizationId)

        if (!config) {
            console.log('[WAHA] WAHA not configured or disabled for organization:', organizationId)
            return { success: false, error: 'WAHA not configured' }
        }

        console.log('[WAHA] Config loaded:', {
            apiUrl: config.apiUrl,
            session: config.session,
            hasApiKey: !!config.apiKey
        })

        const chatId = formatWhatsAppNumber(phone)
        console.log('[WAHA] Formatted chatId:', chatId)

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
