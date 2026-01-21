import type { Bindings } from '../index'

interface WAHAConfig {
    apiUrl: string
    apiKey: string
    session: string
    enabled: boolean
}

// Fetch WAHA configuration from settings
async function getWAHAConfig(db: D1Database): Promise<WAHAConfig | null> {
    const result = await db.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('waha_api_url', 'waha_api_key', 'waha_session', 'waha_enabled')
    `).all()

    const config = new Map(result.results.map((s: any) => [s.key, s.value]))

    const enabled = config.get('waha_enabled') === 'true'
    if (!enabled) return null

    const apiUrl = config.get('waha_api_url')
    const apiKey = config.get('waha_api_key')

    if (!apiUrl || !apiKey) return null

    return {
        apiUrl,
        apiKey,
        session: config.get('waha_session') || 'default',
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

// Send WhatsApp message via WAHA
export async function sendWhatsAppMessage(
    db: D1Database,
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('[WAHA] Starting sendWhatsAppMessage for phone:', phone)

        const config = await getWAHAConfig(db)

        if (!config) {
            console.log('[WAHA] WAHA not configured or disabled')
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
            return { success: false, error: `WAHA API error: ${response.status} - ${error}` }
        }

        const responseData = await response.json()
        console.log('[WAHA] Success! Response:', JSON.stringify(responseData))
        return { success: true }
    } catch (error) {
        console.error('[WAHA] Exception:', error)
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
}): string {
    const { eventTitle, fullName, registrationId, ticketLink, ticketName, ticketPrice } = data

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
