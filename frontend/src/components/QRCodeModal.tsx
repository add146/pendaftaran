import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { eventsAPI } from '../lib/api'

interface IdCardDesign {
    primaryColor: string
    backgroundColor: string
    sponsorLogo: string | null
}

interface QRCodeModalProps {
    isOpen: boolean
    onClose: () => void
    eventId?: string
    participant: {
        full_name: string
        registration_id: string
        qr_code: string
        event_title?: string
        event_date?: string
        event_time?: string
        city?: string
        ticket_name?: string
        phone?: string
    } | null
}

export default function QRCodeModal({ isOpen, onClose, eventId, participant }: QRCodeModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const cardCanvasRef = useRef<HTMLCanvasElement>(null)
    const [cardDataUrl, setCardDataUrl] = useState<string>('')
    const [waMessage, setWaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [design, setDesign] = useState<IdCardDesign>({
        primaryColor: '#1e7b49',
        backgroundColor: '#ffffff',
        sponsorLogo: null
    })

    // Fetch event design when modal opens
    useEffect(() => {
        if (isOpen && eventId) {
            eventsAPI.getIdCardDesign(eventId)
                .then(d => setDesign(d))
                .catch(() => {
                    // Use default design on error
                    setDesign({
                        primaryColor: '#1e7b49',
                        backgroundColor: '#ffffff',
                        sponsorLogo: null
                    })
                })
        }
    }, [isOpen, eventId])

    useEffect(() => {
        if (isOpen && participant?.qr_code) {
            // Generate visible QR code (white on dark)
            if (canvasRef.current) {
                QRCode.toCanvas(canvasRef.current, participant.qr_code, {
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
    }, [isOpen, participant, design])

    const generateIDCardImage = async () => {
        if (!participant) return

        // Generate QR code as data URL first
        const qrImageUrl = await QRCode.toDataURL(participant.qr_code, {
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

        // Card dimensions
        const width = 400
        const height = 550
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
        const eventTitle = (participant.event_title || 'EVENT').toUpperCase()
        const maxTitleWidth = width - 40
        let titleFontSize = 18
        ctx.font = `bold ${titleFontSize}px Arial, sans-serif`
        while (ctx.measureText(eventTitle).width > maxTitleWidth && titleFontSize > 12) {
            titleFontSize -= 1
            ctx.font = `bold ${titleFontSize}px Arial, sans-serif`
        }
        ctx.fillText(eventTitle, width / 2, 45)

        // Date badge
        if (participant.event_date) {
            let dateStr = formatDate(participant.event_date)
            if (participant.event_time) {
                dateStr += ` | ${participant.event_time}`
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
        qrImage.onload = () => {
            // QR background
            ctx.fillStyle = '#1f2937'
            roundRect(ctx, (width - 200) / 2, 120, 200, 200, 16)
            ctx.fill()

            // QR image
            ctx.drawImage(qrImage, (width - 180) / 2, 130, 180, 180)

            // Removed: Scan text (no longer needed)

            // Participant name
            ctx.fillStyle = '#1f2937'
            ctx.font = 'bold 24px Arial, sans-serif'
            const name = participant.full_name.toUpperCase()
            let nameFontSize = 24
            ctx.font = `bold ${nameFontSize}px Arial, sans-serif`
            while (ctx.measureText(name).width > width - 40 && nameFontSize > 14) {
                nameFontSize -= 1
                ctx.font = `bold ${nameFontSize}px Arial, sans-serif`
            }
            ctx.fillText(name, width / 2, 380)

            // Ticket type with primary color
            ctx.fillStyle = design.primaryColor
            ctx.font = 'bold 14px Arial, sans-serif'
            ctx.fillText((participant.ticket_name || 'PARTICIPANT').toUpperCase(), width / 2, 380)

            // City
            if (participant.city) {
                ctx.fillStyle = '#6b7280'
                ctx.font = '13px Arial, sans-serif'
                ctx.fillText(`📍 ${participant.city}`, width / 2, 410)
            }

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
            roundRect(ctx, (width - regBadgeWidth) / 2, 445, regBadgeWidth, regBadgeHeight, 10)
            ctx.fill()

            ctx.fillStyle = design.primaryColor
            ctx.font = 'bold 14px, Courier, monospace'
            ctx.fillText(participant.registration_id, width / 2, 470)

            // Generate data URL
            setCardDataUrl(canvas.toDataURL('image/png'))
        }
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
            return date.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return dateStr
        }
    }

    if (!isOpen || !participant) return null

    const handleDownload = () => {
        if (!cardDataUrl) return
        const link = document.createElement('a')
        link.download = `ID-Card-${participant.registration_id}.png`
        link.href = cardDataUrl
        link.click()
    }

    const handleSendWhatsApp = async () => {
        if (!participant?.phone) {
            setWaMessage({ type: 'error', text: 'No phone number found for this participant' })
            setTimeout(() => setWaMessage(null), 3000)
            return
        }

        // Format phone number (remove leading 0 and add 62 for Indonesia)
        const formattedPhone = participant.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')

        // Generate ticket link
        const ticketLink = `https://etiket.my.id/ticket/${participant.registration_id}`

        // Create message matching WAHA gateway format
        let message = `🎉 *PENDAFTARAN BERHASIL!*
    
Terima kasih telah mendaftar untuk:
📌 *Event:* ${participant.event_title || 'Event'}

👤 *Nama:* ${participant.full_name}
🔖 *ID Registrasi:* ${participant.registration_id}`

        if (participant.ticket_name) {
            message += `\n🎫 *Tiket:* ${participant.ticket_name}`
        }

        message += `

🎫 *E-Ticket & QR Code:*
${ticketLink}

Tunjukkan QR Code saat check-in.

Sampai jumpa di acara! 🙏`

        // Open WhatsApp with the participant's phone number
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
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
            <div ref={cardCanvasRef as any} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
                {/* Header with event color */}
                <div className="px-6 py-5 text-center" style={{ backgroundColor: design.primaryColor }}>
                    <h2 className="text-white font-black text-xl tracking-wider uppercase">
                        {participant.event_title || 'EVENT REGISTRATION'}
                    </h2>
                    {participant.event_date && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-white text-[18px]">calendar_month</span>
                            <span className="text-white text-sm font-bold uppercase tracking-wide">
                                {formatDate(participant.event_date)}
                            </span>
                            {participant.event_time && (
                                <>
                                    <span className="text-white/50 mx-1 font-light text-lg">|</span>
                                    <span className="text-white text-sm font-bold uppercase tracking-wide">
                                        {participant.event_time}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Card Body */}
                <div className="px-6 py-6" style={{ backgroundColor: design.backgroundColor }}>
                    {/* QR Code Container */}
                    <div className="flex justify-center mb-5">
                        <div className="p-4 bg-gray-800 rounded-2xl shadow-lg">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>

                    {/* Participant Name */}
                    <div className="text-center mb-4">
                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-wide">
                            {participant.full_name}
                        </h3>
                        <p className="font-bold text-sm uppercase tracking-wider mt-1" style={{ color: design.primaryColor }}>
                            {participant.ticket_name || 'PARTICIPANT'}
                        </p>
                    </div>

                    {/* City/Location */}
                    {participant.city && (
                        <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                            <span className="text-sm">{participant.city}</span>
                        </div>
                    )}

                    {/* Registration ID Badge */}
                    <div className="rounded-xl py-3 px-4 text-center mb-4" style={{ backgroundColor: `${design.primaryColor}15` }}>
                        <p className="font-mono font-bold text-sm tracking-wider" style={{ color: design.primaryColor }}>
                            {participant.registration_id}
                        </p>
                    </div>

                    {/* Sponsor Logo */}
                    {design.sponsorLogo && (
                        <div className="flex justify-center">
                            <img
                                src={design.sponsorLogo}
                                alt="Sponsor"
                                className="max-h-12 max-w-[150px] object-contain"
                            />
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6">
                    {/* WhatsApp Status Message */}
                    {waMessage && (
                        <div className={`mb-3 p-3 rounded-lg text-sm font-medium ${waMessage.type === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {waMessage.text}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={!cardDataUrl}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            Download
                        </button>
                        <button
                            onClick={handleSendWhatsApp}
                            disabled={!participant?.phone}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!participant?.phone ? 'No phone number available' : 'Send ticket via WhatsApp'}
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                            Send WA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
