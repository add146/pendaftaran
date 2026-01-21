import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeModalProps {
    isOpen: boolean
    onClose: () => void
    participant: {
        full_name: string
        registration_id: string
        qr_code: string
        event_title?: string
        event_date?: string
        city?: string
        ticket_name?: string
    } | null
}

export default function QRCodeModal({ isOpen, onClose, participant }: QRCodeModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const cardCanvasRef = useRef<HTMLCanvasElement>(null)
    const [cardDataUrl, setCardDataUrl] = useState<string>('')

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
    }, [isOpen, participant])

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
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        // Green header
        ctx.fillStyle = '#1B4332'
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
            const dateStr = formatDate(participant.event_date)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
            const badgeWidth = 180
            const badgeHeight = 28
            roundRect(ctx, (width - badgeWidth) / 2, 60, badgeWidth, badgeHeight, 14)
            ctx.fill()

            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 12px Arial, sans-serif'
            ctx.fillText(dateStr.toUpperCase(), width / 2, 78)
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

            // Scan text
            ctx.fillStyle = '#9ca3af'
            ctx.font = '10px Arial, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('SCAN FOR CHECK-IN', width / 2, 345)

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

            // Ticket type
            ctx.fillStyle = '#1B4332'
            ctx.font = 'bold 14px Arial, sans-serif'
            ctx.fillText((participant.ticket_name || 'PARTICIPANT').toUpperCase(), width / 2, 405)

            // City
            if (participant.city) {
                ctx.fillStyle = '#6b7280'
                ctx.font = '13px Arial, sans-serif'
                ctx.fillText(`📍 ${participant.city}`, width / 2, 435)
            }

            // Registration ID badge
            ctx.fillStyle = 'rgba(27, 67, 50, 0.1)'
            const regBadgeWidth = 200
            const regBadgeHeight = 40
            roundRect(ctx, (width - regBadgeWidth) / 2, 470, regBadgeWidth, regBadgeHeight, 10)
            ctx.fill()

            ctx.fillStyle = '#1B4332'
            ctx.font = 'bold 14px, Courier, monospace'
            ctx.fillText(participant.registration_id, width / 2, 495)

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
        // Generate ticket link
        const baseUrl = window.location.origin
        const ticketLink = `${baseUrl}/ticket/${participant.registration_id}`

        // Open WhatsApp with message including link
        const message = encodeURIComponent(
            `🎫 *E-TICKET*\n\n` +
            `📌 *${participant.event_title || 'Event'}*\n` +
            `📅 ${formatDate(participant.event_date)}\n\n` +
            `👤 *${participant.full_name}*\n` +
            `📍 ${participant.city || '-'}\n` +
            `🎟️ Registration ID: ${participant.registration_id}\n\n` +
            `🔗 *Lihat ID Card:*\n${ticketLink}\n\n` +
            `Tunjukkan QR Code di link tersebut saat check-in.`
        )
        window.open(`https://wa.me/?text=${message}`, '_blank')
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
                {/* Green Header */}
                <div className="bg-primary px-6 py-5 text-center">
                    <h2 className="text-white font-black text-xl tracking-wider uppercase">
                        {participant.event_title || 'EVENT REGISTRATION'}
                    </h2>
                    {participant.event_date && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-white text-[18px]">calendar_month</span>
                            <span className="text-white text-sm font-bold uppercase tracking-wide">
                                {formatDate(participant.event_date)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Card Body */}
                <div className="px-6 py-6">
                    {/* QR Code Container */}
                    <div className="flex justify-center mb-5">
                        <div className="p-4 bg-gray-800 rounded-2xl shadow-lg">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>

                    {/* Scan Text */}
                    <p className="text-center text-xs text-gray-400 uppercase tracking-widest font-medium mb-4">
                        Scan for Check-in
                    </p>

                    {/* Participant Name */}
                    <div className="text-center mb-4">
                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-wide">
                            {participant.full_name}
                        </h3>
                        <p className="text-primary font-bold text-sm uppercase tracking-wider mt-1">
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
                    <div className="bg-primary/10 rounded-xl py-3 px-4 text-center">
                        <p className="text-primary font-mono font-bold text-sm tracking-wider">
                            {participant.registration_id}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 flex gap-3">
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
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                        Share WA
                    </button>
                </div>
            </div>
        </div>
    )
}
