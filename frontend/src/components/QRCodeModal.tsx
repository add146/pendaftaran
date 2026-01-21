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
    const cardRef = useRef<HTMLDivElement>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string>('')

    useEffect(() => {
        if (isOpen && participant?.qr_code && canvasRef.current) {
            // Generate QR code on canvas with dark background style
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

            // Also generate data URL for download/share
            QRCode.toDataURL(participant.qr_code, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#1B4332',
                    light: '#ffffff'
                }
            }).then((url: string) => setQrDataUrl(url))
        }
    }, [isOpen, participant])

    if (!isOpen || !participant) return null

    const handleDownload = () => {
        if (!qrDataUrl) return
        const link = document.createElement('a')
        link.download = `ID-Card-${participant.registration_id}.png`
        link.href = qrDataUrl
        link.click()
    }

    const handleSendWhatsApp = () => {
        const message = encodeURIComponent(
            `🎫 *E-TICKET*\n\n` +
            `📌 *${participant.event_title || 'Event'}*\n` +
            `📅 ${participant.event_date || '-'}\n\n` +
            `👤 *${participant.full_name}*\n` +
            `📍 ${participant.city || '-'}\n` +
            `🎟️ Registration ID: ${participant.registration_id}\n\n` +
            `Tunjukkan QR Code berikut saat check-in:\n` +
            `${participant.qr_code}`
        )
        window.open(`https://wa.me/?text=${message}`, '_blank')
    }

    // Format date for display
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
        } catch {
            return dateStr
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
            <div ref={cardRef} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
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
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors"
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
