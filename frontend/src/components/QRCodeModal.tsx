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
    } | null
}

export default function QRCodeModal({ isOpen, onClose, participant }: QRCodeModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string>('')

    useEffect(() => {
        if (isOpen && participant?.qr_code && canvasRef.current) {
            // Generate QR code on canvas
            QRCode.toCanvas(canvasRef.current, participant.qr_code, {
                width: 250,
                margin: 2,
                color: {
                    dark: '#1B4332',
                    light: '#ffffff'
                }
            }, (error) => {
                if (error) console.error('QR generation error:', error)
            })

            // Also generate data URL for download/share
            QRCode.toDataURL(participant.qr_code, {
                width: 500,
                margin: 2,
                color: {
                    dark: '#1B4332',
                    light: '#ffffff'
                }
            }).then(url => setQrDataUrl(url))
        }
    }, [isOpen, participant])

    if (!isOpen || !participant) return null

    const handleDownload = () => {
        if (!qrDataUrl) return
        const link = document.createElement('a')
        link.download = `QR-${participant.registration_id}.png`
        link.href = qrDataUrl
        link.click()
    }

    const handleSendWhatsApp = () => {
        // Note: WhatsApp doesn't support sending image directly via URL
        // We'll send a message with the registration info instead
        const message = encodeURIComponent(
            `*TIKET EVENT*\n\n` +
            `Nama: ${participant.full_name}\n` +
            `Registration ID: ${participant.registration_id}\n` +
            `QR Code: ${participant.qr_code}\n\n` +
            `Tunjukkan QR Code ini saat check-in.`
        )
        window.open(`https://wa.me/?text=${message}`, '_blank')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-text-main">QR Code Tiket</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    {/* Participant Info */}
                    <div className="mb-4">
                        <p className="text-lg font-bold text-text-main">{participant.full_name}</p>
                        <p className="text-sm text-gray-500">#{participant.registration_id}</p>
                        {participant.event_title && (
                            <p className="text-xs text-primary mt-1">{participant.event_title}</p>
                        )}
                    </div>

                    {/* QR Code Canvas */}
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-white border-2 border-gray-100 rounded-xl shadow-sm">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-4">
                        Scan QR Code ini saat check-in di lokasi event
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            Download
                        </button>
                        <button
                            onClick={handleSendWhatsApp}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                            Share WA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
