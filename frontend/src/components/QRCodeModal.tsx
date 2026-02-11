// Re-deploy trigger: 2026-02-11T14:15:00
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { eventsAPI, participantsAPI, type Participant } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { getMapQuery } from '../lib/maps'

interface IdCardDesign {
    primaryColor: string
    backgroundColor: string
    sponsorLogo: string | null
}

interface QRCodeModalProps {
    isOpen: boolean
    onClose: () => void
    eventId?: string
    participant: Partial<Participant> | null
}

export default function QRCodeModal({ isOpen, onClose, eventId, participant }: QRCodeModalProps) {
    const { t } = useTranslation()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const cardCanvasRef = useRef<HTMLCanvasElement>(null)
    const [cardDataUrl, setCardDataUrl] = useState<string>('')
    const [waMessage, setWaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [design, setDesign] = useState<IdCardDesign>({
        primaryColor: '#1e7b49',
        backgroundColor: '#ffffff',
        sponsorLogo: null
    })
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('')
    const [certificateConfig, setCertificateConfig] = useState<any>(null)
    const [downloadingCertificate, setDownloadingCertificate] = useState(false)
    const [fullParticipant, setFullParticipant] = useState<Partial<Participant> | null>(null)

    // Sync participant prop to state and fetch details if needed
    useEffect(() => {
        if (isOpen && participant) {
            if (participant.custom_fields) {
                setFullParticipant(participant)
            } else if (participant.id) {
                // Fetch full details including custom_fields (Admin side)
                participantsAPI.get(participant.id)
                    .then(p => setFullParticipant(p))
                    .catch(e => {
                        console.error("Failed to fetch participant details", e)
                        setFullParticipant(participant)
                    })
            } else {
                setFullParticipant(participant)
            }
        }
    }, [isOpen, participant])

    // Fetch event design and certificate config when modal opens
    useEffect(() => {
        if (isOpen && eventId) {
            // Fetch ID Card Design
            eventsAPI.getIdCardDesign(eventId)
                .then(d => setDesign(d))
                .catch(() => {
                    setDesign({
                        primaryColor: '#1e7b49',
                        backgroundColor: '#ffffff',
                        sponsorLogo: null
                    })
                })

            // Fetch Event Details (for certificate config)
            eventsAPI.get(eventId)
                .then(event => {
                    if (event.google_maps_api_key) {
                        setGoogleMapsApiKey(event.google_maps_api_key)
                    }
                    if (event.certificate_config) {
                        try {
                            setCertificateConfig(JSON.parse(event.certificate_config))
                        } catch (e) {
                            console.error("Failed to parse cert config", e)
                        }
                    } else {
                        setCertificateConfig(null)
                    }
                })
                .catch(err => console.error("Failed to fetch event details", err))
        }
    }, [isOpen, eventId])

    useEffect(() => {
        if (isOpen && fullParticipant?.qr_code) {
            // Generate visible QR code (white on dark)
            if (canvasRef.current) {
                QRCode.toCanvas(canvasRef.current, fullParticipant.qr_code, {
                    width: 160,
                    margin: 1,
                    color: {
                        dark: '#ffffff',
                        light: '#1f2937'
                    }
                }, (error: Error | null | undefined) => {
                    if (error) console.error('QR generation error:', error)
                })
            }

            // Generate ID Card image
            generateIDCardImage()
        }
    }, [isOpen, fullParticipant, design])

    const generateIDCardImage = async () => {
        if (!fullParticipant || !fullParticipant.qr_code) return

        // Generate QR code as data URL first
        const qrImageUrl = await QRCode.toDataURL(fullParticipant.qr_code, {
            width: 180,
            margin: 1,
            color: {
                dark: '#ffffff',
                light: '#1f2937'
            }
        })

        // Create canvas for ID Card
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Calculate height based on content
        // Base height 550. Add extra for each custom field showing on ID.
        const customFieldsToShow = fullParticipant.custom_fields?.filter(f => f.show_on_id) || []
        let extraHeight = customFieldsToShow.length * 25

        // Add extra height for online details
        const isOnline = (fullParticipant as any).attendance_type === 'online' || (fullParticipant as any).event_type === 'online'
        if (isOnline) {
            extraHeight += 120 // Space for Platform, URL, Password
            if (fullParticipant.online_instructions) {
                extraHeight += 60 // Rough estimate for instructions
            }
        }

        const width = 400
        let height = 550 + extraHeight

        // Add height for map if available
        if (!isOnline && (fullParticipant.location || fullParticipant.location_map_url) && googleMapsApiKey) {
            height += 210
        }

        canvas.width = width
        canvas.height = height

        // Background
        ctx.fillStyle = design.backgroundColor
        ctx.fillRect(0, 0, width, height)

        // Header with primary color
        ctx.fillStyle = design.primaryColor
        ctx.fillRect(0, 0, width, 100)

        // Event title
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 18px Arial, sans-serif'
        ctx.textAlign = 'center'
        const eventTitle = (fullParticipant.event_title || 'EVENT').toUpperCase()
        const maxTitleWidth = width - 40
        let titleFontSize = 18
        ctx.font = `bold ${titleFontSize}px Arial, sans-serif`
        while (ctx.measureText(eventTitle).width > maxTitleWidth && titleFontSize > 12) {
            titleFontSize -= 1
            ctx.font = `bold ${titleFontSize}px Arial, sans-serif`
        }
        ctx.fillText(eventTitle, width / 2, 45)

        // Date badge
        if (fullParticipant.event_date) {
            let dateStr = formatDate(fullParticipant.event_date)
            if (fullParticipant.event_time) {
                dateStr += ` | ${fullParticipant.event_time}`
            }
            const dateText = dateStr.toUpperCase()

            ctx.font = 'bold 12px Arial, sans-serif'
            const textWidth = ctx.measureText(dateText).width

            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
            const badgeWidth = Math.max(textWidth + 40, 180) // Dynamic width, min 180
            const badgeHeight = 28
            roundRect(ctx, (width - badgeWidth) / 2, 60, badgeWidth, badgeHeight, 14)
            ctx.fill()

            ctx.fillStyle = '#ffffff'
            ctx.fillText(dateText, width / 2, 78)
        }

        // Load and draw QR code
        const qrImage = new Image()
        qrImage.src = qrImageUrl
        await new Promise((resolve) => { qrImage.onload = resolve })

        if (!isOnline) {
            // QR background
            ctx.fillStyle = '#1f2937'
            roundRect(ctx, (width - 200) / 2, 120, 200, 200, 16)
            ctx.fill()

            // QR image
            ctx.drawImage(qrImage, (width - 180) / 2, 130, 180, 180)
        }

        // Participant name
        ctx.fillStyle = '#1f2937'
        ctx.font = 'bold 24px Arial, sans-serif'
        const name = (fullParticipant.full_name || '').toUpperCase()
        let nameFontSize = 24
        ctx.font = `bold ${nameFontSize}px Arial, sans-serif`
        while (ctx.measureText(name).width > width - 40 && nameFontSize > 14) {
            nameFontSize -= 1
            ctx.font = `bold ${nameFontSize}px Arial, sans-serif`
        }

        // Adjust positions based on online status
        const nameY = isOnline ? 180 : 360
        ctx.fillText(name, width / 2, nameY)

        // Ticket type with primary color
        ctx.fillStyle = design.primaryColor
        ctx.font = 'bold 14px Arial, sans-serif'
        const ticketY = isOnline ? 210 : 390
        ctx.fillText((fullParticipant.ticket_name || t('id_card.participant')).toUpperCase(), width / 2, ticketY)

        let currentY = isOnline ? 240 : 420

        // Custom Fields (Above City, Bold)
        if (customFieldsToShow.length > 0) {
            ctx.fillStyle = '#374151'
            ctx.font = 'bold 14px Arial, sans-serif'
            for (const field of customFieldsToShow) {
                // Check if response is valid
                if (field.response) {
                    // Truncate if too long
                    let text = field.response.toString()
                    if (text.length > 35) text = text.substring(0, 32) + '...'
                    ctx.fillText(text.toUpperCase(), width / 2, currentY)
                    currentY += 25
                }
            }
        }

        // City
        if (fullParticipant.city) {
            ctx.fillStyle = '#6b7280'
            ctx.font = '13px Arial, sans-serif'
            ctx.fillText(`🏢 ${fullParticipant.city}`, width / 2, currentY)
            currentY += 25
        }

        // Space before badge
        currentY += 15

        // Registration ID badge
        // Convert hex to rgba
        const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
        }
        ctx.fillStyle = hexToRgba(design.primaryColor, 0.1)
        const regBadgeWidth = 200
        const regBadgeHeight = 40
        roundRect(ctx, (width - regBadgeWidth) / 2, currentY, regBadgeWidth, regBadgeHeight, 10)
        ctx.fill()

        ctx.fillStyle = design.primaryColor
        ctx.font = 'bold 14px, Courier, monospace'
        ctx.fillText(fullParticipant.registration_id || '', width / 2, currentY + 25)

        currentY += 55

        // Draw Online Event Details if Online
        if (isOnline) {
            // Draw a light blue background for online details
            ctx.fillStyle = '#eff6ff' // blue-50

            ctx.fillStyle = '#1e40af' // blue-800
            ctx.font = 'bold 16px Arial, sans-serif'
            ctx.fillText((t('ticket.online_event_details') || 'Online Event Details').toUpperCase(), width / 2, currentY + 10)
            currentY += 30

            ctx.font = '14px Arial, sans-serif'
            ctx.fillStyle = '#374151' // gray-700

            if (fullParticipant.online_platform) {
                ctx.fillText(`Platform: ${fullParticipant.online_platform.replace('_', ' ')}`.toUpperCase(), width / 2, currentY)
                currentY += 25
            }

            if (fullParticipant.online_url) {
                ctx.fillStyle = design.primaryColor
                ctx.font = 'bold 12px Arial, sans-serif'
                const urlText = fullParticipant.online_url.replace(/^https?:\/\//, '')
                // Turncate URL if too long
                let displayUrl = urlText
                if (displayUrl.length > 40) displayUrl = displayUrl.substring(0, 37) + '...'

                ctx.fillText(displayUrl, width / 2, currentY)
                currentY += 25
            }

            if (fullParticipant.online_password) {
                ctx.fillStyle = '#374151'
                ctx.font = '14px Arial, sans-serif'
                ctx.fillText(`Pass: ${fullParticipant.online_password}`, width / 2, currentY)
                currentY += 25
            }

            if (fullParticipant.online_instructions) {
                // Simple wrapping for instructions at plain text
                currentY += 10
                ctx.font = 'italic 12px Arial, sans-serif'
                ctx.fillStyle = '#6b7280'
                // We won't complex wrap here on canvas for now, just first line or truncate
                let instructions = fullParticipant.online_instructions
                if (instructions.length > 50) instructions = instructions.substring(0, 47) + '...'
                ctx.fillText(instructions, width / 2, currentY)
                currentY += 25
            }
            currentY += 20 // Spacer
        }

        // Note with Icon (if present)
        if (fullParticipant.note) {
            // ... note logic existing ...
            const iconMap: Record<string, string> = {
                info: 'ℹ️',
                warning: '⚠️',
                danger: '🛑'
            }
            const icon = iconMap[fullParticipant.icon_type || 'info']
            const noteText = `${icon} ${fullParticipant.note}`.toUpperCase()

            // Background for note
            const noteColorMap: Record<string, string> = {
                info: '#e0f2fe',    // blue-100
                warning: '#ffedd5', // orange-100
                danger: '#fee2e2'   // red-100
            }
            const noteTextColorMap: Record<string, string> = {
                info: '#0369a1',    // blue-700
                warning: '#c2410c', // orange-700
                danger: '#b91c1c'   // red-700
            }

            ctx.fillStyle = noteColorMap[fullParticipant.icon_type || 'info'] || '#f3f4f6'
            roundRect(ctx, 40, currentY, width - 80, 40, 8)
            ctx.fill()

            ctx.fillStyle = noteTextColorMap[fullParticipant.icon_type || 'info'] || '#374151'
            ctx.font = 'bold 12px Arial, sans-serif'
            ctx.fillText(noteText, width / 2, currentY + 25)
        } else if (design.sponsorLogo) {
            // If no note, show sponsor logo
            try {
                const logoImg = new Image()
                logoImg.crossOrigin = "Anonymous"
                logoImg.src = design.sponsorLogo
                await new Promise((resolve) => {
                    logoImg.onload = resolve
                    logoImg.onerror = resolve // proceed anyway
                })
                const aspect = logoImg.width / logoImg.height
                const logoHeight = 40
                const logoWidth = logoHeight * aspect
                ctx.drawImage(logoImg, (width - logoWidth) / 2, currentY + 5, logoWidth, logoHeight)
            } catch (e) {
                // ignore
            }
        }

        // Event Location with Static Map
        if (!isOnline && (fullParticipant.location || fullParticipant.location_map_url) && googleMapsApiKey) {
            // Try to load static map
            try {
                const mapQuery = getMapQuery(fullParticipant.location, fullParticipant.location_map_url)
                const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(mapQuery)}&zoom=15&size=400x200&maptype=roadmap&markers=color:red%7C${encodeURIComponent(mapQuery)}&key=${googleMapsApiKey}`

                const mapImg = new Image()
                mapImg.crossOrigin = "Anonymous"
                mapImg.src = mapUrl
                await new Promise((resolve) => {
                    mapImg.onload = resolve
                    mapImg.onerror = resolve
                })

                ctx.drawImage(mapImg, 0, currentY, width, 200)
                currentY += 210
            } catch (e) {
                // console.error(e)
            }
        }

        // Generate data URL
        setCardDataUrl(canvas.toDataURL('image/png'))
        qrImage.src = qrImageUrl
    }

    // Helper for rounded rectangles
    const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + w, y, x + w, y + h, r)
        ctx.arcTo(x + w, y + h, x, y + h, r)
        ctx.arcTo(x, y + h, x, y, r)
        ctx.arcTo(x, y, x + w, y, r)
        ctx.closePath()
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString(t('common.locale_date'), {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return dateStr
        }
    }

    if (!isOpen || !fullParticipant) return null

    const handleDownload = () => {
        if (!cardDataUrl) return
        const link = document.createElement('a')
        link.download = `ID-Card-${fullParticipant.registration_id}.png`
        link.href = cardDataUrl
        link.click()
    }

    const handleSendWhatsApp = async () => {
        if (!fullParticipant?.phone) {
            setWaMessage({ type: 'error', text: t('ticket.no_phone') })
            setTimeout(() => setWaMessage(null), 3000)
            return
        }

        // Format phone number (remove leading 0 and add 62 for Indonesia)
        const formattedPhone = fullParticipant.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')

        // Generate ticket link
        const ticketLink = `https://etiket.my.id/ticket/${fullParticipant.registration_id}`

        // Define placeholders
        const P = {
            PARTY: '{{E_PARTY}}',
            PIN: '{{E_PIN}}',
            USER: '{{E_USER}}',
            ID: '{{E_ID}}',
            TICKET: '{{E_TICKET}}',
            MONEY: '{{E_MONEY}}',
            NOTE: '{{E_NOTE}}',
            THANKS: '{{E_THANKS}}'
        }

        // Exact format from backend (api/src/lib/whatsapp.ts)
        // DEBUG: Changed text to verify if user receives new code
        let message = `${P.PARTY} *REGISTRASI BERHASIL!*\n\n`
        message += `Terima kasih telah mendaftar untuk:\n`
        message += `${P.PIN} *Event:* ${fullParticipant.event_title || 'Event'}\n\n`

        message += `${P.USER} *Nama:* ${fullParticipant.full_name}\n`
        message += `${P.ID} *ID Registrasi:* ${fullParticipant.registration_id}`

        if (fullParticipant.ticket_name) {
            message += `\n${P.TICKET} *Tiket:* ${fullParticipant.ticket_name}`
        }

        if (fullParticipant.ticket_price && fullParticipant.ticket_price > 0) {
            message += `\n${P.MONEY} *Harga:* Rp ${fullParticipant.ticket_price.toLocaleString('id-ID')}`
        }

        // Custom Fields
        if (fullParticipant.custom_fields && fullParticipant.custom_fields.length > 0) {
            message += `\n\n${P.NOTE} *Informasi Tambahan:*`
            for (const field of fullParticipant.custom_fields) {
                message += `\n• *${field.label}:* ${field.response}`
            }
        }

        message += `\n\n${P.TICKET} *E-Ticket & QR Code:*\n${ticketLink}\n\n`
        message += `Tunjukkan QR Code saat check-in.\n\n`
        message += `Sampai jumpa di acara! ${P.THANKS}`

        // Encode and then replace placeholders with UTF-8 percent codes
        let encodedMessage = encodeURIComponent(message)
            .replace(/%7B%7BE_PARTY%7D%7D/g, '%F0%9F%8E%89')  // 🎉
            .replace(/%7B%7BE_PIN%7D%7D/g, '%F0%9F%93%8C')    // 📌
            .replace(/%7B%7BE_USER%7D%7D/g, '%F0%9F%91%A4')   // 👤
            .replace(/%7B%7BE_ID%7D%7D/g, '%F0%9F%94%96')     // 🔖
            .replace(/%7B%7BE_TICKET%7D%7D/g, '%F0%9F%8E%AB') // 🎫
            .replace(/%7B%7BE_MONEY%7D%7D/g, '%F0%9F%92%B0')  // 💰
            .replace(/%7B%7BE_NOTE%7D%7D/g, '%F0%9F%93%8B')   // 📋
            .replace(/%7B%7BE_THANKS%7D%7D/g, '%F0%9F%99%8F') // 🙏

        // Open WhatsApp with the participant's phone number
        // Use api.whatsapp.com for better emoji/encoding support
        window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`, '_blank')
    }

    const handleDownloadCertificate = async () => {
        if (!fullParticipant || !certificateConfig || !certificateConfig.enabled) return
        // Note: Certificate generation logic uses fullParticipant which should match Participant type
        // ... (rest of certificate logic)
        // For brevity implying it reuses fullParticipant similar to original participant

        try {
            setDownloadingCertificate(true)

            // Create PDF with A4 landscape
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })
            // ... (rest of certificate logic - reusing same logic)
            // Just need to ensure fullParticipant properties are accessed safely

            const width = doc.internal.pageSize.getWidth()
            const height = doc.internal.pageSize.getHeight()

            // Load background if exists
            if (certificateConfig.backgroundUrl) {
                const img = new Image()
                img.crossOrigin = "Anonymous"
                img.src = certificateConfig.backgroundUrl
                await new Promise((resolve, reject) => {
                    img.onload = resolve
                    img.onerror = reject
                })
                doc.addImage(img, 'JPEG', 0, 0, width, height)
            }

            // Add elements
            for (const el of certificateConfig.elements) {
                if (el.type === 'text') {
                    let text = el.label
                    // Placeholders
                    if (text === '{Nama Peserta}') text = fullParticipant.full_name || ''
                    if (text === '{ID Registrasi}') text = fullParticipant.registration_id || ''
                    if (text === '{Judul Event}') text = fullParticipant.event_title || ''
                    if (text === '{Tanggal}') text = formatDate(fullParticipant.event_date)

                    // Font conversion
                    doc.setFontSize(el.fontSize)
                    doc.setTextColor(el.color)

                    // Font mapping
                    let fontName = 'helvetica'

                    if (el.fontFamily.includes('Playfair Display') || el.fontFamily.includes('Merriweather')) {
                        fontName = 'times'
                    }
                    if (el.fontFamily.includes('Work Sans') || el.fontFamily.includes('Helvetica')) {
                        fontName = 'helvetica'
                    }

                    doc.setFont(fontName, 'bold')

                    // Align logic
                    const x = (el.x / 100) * width
                    const y = (el.y / 100) * height

                    doc.text(text, x, y, { align: el.align })
                } else if (el.type === 'qr') {
                    // Generate QR
                    if (fullParticipant.qr_code) {
                        const qrDataUrl = await QRCode.toDataURL(fullParticipant.qr_code, {
                            width: 500,
                            margin: 1,
                            color: {
                                dark: '#000000',
                                light: '#ffffff'
                            }
                        })
                        const sizePercent = el.fontSize / 800
                        const sizeMm = sizePercent * width
                        const x = (el.x / 100) * width
                        const y = (el.y / 100) * height
                        doc.addImage(qrDataUrl, 'PNG', x - (sizeMm / 2), y - (sizeMm / 2), sizeMm, sizeMm)
                    }
                }
            }

            doc.save(`Certificate_${(fullParticipant.full_name || 'participant').replace(/\s+/g, '_')}.pdf`)

        } catch (err) {
            console.error('Certificate generation failed:', err)
            alert(t('ticket.certificate_failed'))
        } finally {
            setDownloadingCertificate(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            {/* Close button outside card */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
                <span className="material-symbols-outlined text-white">close</span>
            </button>

            {/* ID Card */}
            <div ref={cardCanvasRef as any} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header with event color */}


                {/* Card Body */}
                <img src={cardDataUrl} alt="ID Card" className="w-full" />

                {/* Action Buttons */}
                <div className="px-6 pb-6 pt-4">
                    {/* Certificate Download Button */}
                    {certificateConfig?.enabled && (
                        <button
                            onClick={handleDownloadCertificate}
                            disabled={downloadingCertificate}
                            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-colors disabled:opacity-50"
                        >
                            {downloadingCertificate ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                            )}
                            {downloadingCertificate ? t('common.generating') : t('ticket.download_certificate')}
                        </button>
                    )}

                    {/* WhatsApp Status Message */}
                    {waMessage && (
                        <div className={`mb-3 p-3 rounded-lg text-sm font-medium ${waMessage.type === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {waMessage.text}
                        </div>
                    )}

                    {/* Online Join Button */}
                    {fullParticipant?.online_url && ((fullParticipant as any).attendance_type === 'online' || (fullParticipant as any).event_type === 'online') && (
                        <a
                            href={fullParticipant.online_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">videocam</span>
                            Join Meeting
                        </a>
                    )}

                    <div className="flex gap-3">
                        {(fullParticipant as any).attendance_type !== 'online' && (
                            <button
                                onClick={handleDownload}
                                disabled={!cardDataUrl}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">download</span>
                                {t('common.download')}
                            </button>
                        )}
                        <button
                            onClick={handleSendWhatsApp}
                            disabled={!fullParticipant?.phone}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!fullParticipant?.phone ? t('ticket.no_phone') : t('ticket.send_wa')}
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                            {t('ticket.send_wa_button')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Powered by (Outside card) */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center gap-1 text-center pointer-events-none">
                <span className="text-[10px] text-white/60 uppercase tracking-widest drop-shadow-md">Powered by</span>
                <a href="https://etiket.my.id" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:opacity-80 transition-opacity">
                    <img src="/etiket-logo.png" alt="Etiket Logo" className="h-[25px] w-auto brightness-0 invert opacity-80 hover:opacity-100 transition-all" />
                </a>
            </div>
        </div>
    )
}
