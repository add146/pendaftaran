import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
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
        attendance_type?: 'offline' | 'online'
        note?: string
        icon_type?: 'info' | 'warning' | 'danger'
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
    const [certificateConfig, setCertificateConfig] = useState<any>(null)
    const [downloadingCertificate, setDownloadingCertificate] = useState(false)

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
            ctx.fillText(name, width / 2, 360)

            // Ticket type with primary color
            ctx.fillStyle = design.primaryColor
            ctx.font = 'bold 14px Arial, sans-serif'
            ctx.fillText((participant.ticket_name || 'PARTICIPANT').toUpperCase(), width / 2, 390)

            // City
            if (participant.city) {
                ctx.fillStyle = '#6b7280'
                ctx.font = '13px Arial, sans-serif'
                ctx.fillText(`🏢 ${participant.city}`, width / 2, 420)
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
            roundRect(ctx, (width - regBadgeWidth) / 2, 460, regBadgeWidth, regBadgeHeight, 10)
            ctx.fill()

            ctx.fillStyle = design.primaryColor
            ctx.font = 'bold 14px, Courier, monospace'
            ctx.fillText(participant.registration_id, width / 2, 485)

            // Note with Icon (if present)
            if (participant.note) {
                const iconMap = {
                    info: 'ℹ️',
                    warning: '⚠️',
                    danger: '🛑'
                }
                const icon = iconMap[participant.icon_type || 'info']
                const noteText = `${icon} ${participant.note}`.toUpperCase()

                // Background for note
                const noteColorMap = {
                    info: '#e0f2fe',    // blue-100
                    warning: '#ffedd5', // orange-100
                    danger: '#fee2e2'   // red-100
                }
                const noteTextColorMap = {
                    info: '#0369a1',    // blue-700
                    warning: '#c2410c', // orange-700
                    danger: '#b91c1c'   // red-700
                }

                ctx.fillStyle = noteColorMap[participant.icon_type || 'info'] || '#f3f4f6'
                roundRect(ctx, 40, 495, width - 80, 40, 8)
                ctx.fill()

                ctx.fillStyle = noteTextColorMap[participant.icon_type || 'info'] || '#374151'
                ctx.font = 'bold 12px Arial, sans-serif'
                ctx.fillText(noteText, width / 2, 520)
            } else if (design.sponsorLogo) {
                // If no note, show sponsor logo at bottom
                const logoImg = new Image()
                logoImg.onload = () => {
                    const aspect = logoImg.width / logoImg.height
                    const logoHeight = 40
                    const logoWidth = logoHeight * aspect
                    ctx.drawImage(logoImg, (width - logoWidth) / 2, 500, logoWidth, logoHeight)
                    setCardDataUrl(canvas.toDataURL('image/png'))
                }
                logoImg.src = design.sponsorLogo
                return // Exit here because onload will handle setCardDataUrl
            }

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

    const handleDownloadCertificate = async () => {
        if (!participant || !certificateConfig || !certificateConfig.enabled) return

        try {
            setDownloadingCertificate(true)

            // Create PDF with A4 landscape
            // A4 in mm: 297 x 210
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })

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
                    if (text === '{Nama Peserta}') text = participant.full_name
                    if (text === '{ID Registrasi}') text = participant.registration_id
                    if (text === '{Judul Event}') text = participant.event_title || ''
                    if (text === '{Tanggal}') text = formatDate(participant.event_date)

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
                    try {
                        const qrDataUrl = await QRCode.toDataURL(participant.qr_code, {
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

                    } catch (e) {
                        console.error("Failed to generate QR for certificate", e)
                    }
                }
            }

            doc.save(`Certificate_${participant.full_name.replace(/\s+/g, '_')}.pdf`)

        } catch (err) {
            console.error('Certificate generation failed:', err)
            alert('Gagal mengunduh sertifikat. Silakan coba lagi.')
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
                    {/* QR Code Container - Only for Offline */}
                    {(participant as any).attendance_type !== 'online' && (
                        <div className="flex justify-center mb-5">
                            <div className="p-4 bg-gray-800 rounded-2xl shadow-lg">
                                <canvas ref={canvasRef}></canvas>
                            </div>
                        </div>
                    )}

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
                            <span className="material-symbols-outlined text-[18px]">apartment</span>
                            <span className="text-sm">{participant.city}</span>
                        </div>
                    )}

                    {/* Registration ID Badge */}
                    <div className="rounded-xl py-3 px-4 text-center mb-4" style={{ backgroundColor: `${design.primaryColor}15` }}>
                        <p className="font-mono font-bold text-sm tracking-wider" style={{ color: design.primaryColor }}>
                            {participant.registration_id}
                        </p>
                    </div>

                    {/* Note with Icon (if present) OR Sponsor Logo */}
                    {participant.note ? (
                        <div className={`mt-4 mx-2 p-3 rounded-lg text-sm text-center font-medium opacity-90 shadow-sm border ${participant.icon_type === 'danger' ? 'bg-red-50 text-red-700 border-red-100' :
                            participant.icon_type === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                            <div className="flex items-center justify-center gap-1.5 mb-1.5 opacity-80">
                                <span className="material-symbols-outlined text-[18px]">
                                    {participant.icon_type === 'danger' ? 'error' :
                                        participant.icon_type === 'warning' ? 'warning' : 'info'}
                                </span>
                                <span className="uppercase tracking-wider text-[10px] font-bold">
                                    {participant.icon_type || 'INFO'}
                                </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm">
                                {participant.note.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                    part.match(/^https?:\/\//) ? (
                                        <a
                                            key={i}
                                            href={part}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline font-bold hover:opacity-75 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {part}
                                        </a>
                                    ) : part
                                )}
                            </p>
                        </div>
                    ) : design.sponsorLogo ? (
                        <div className="flex justify-center mt-4">
                            <img
                                src={design.sponsorLogo}
                                alt="Sponsor"
                                className="max-h-12 max-w-[150px] object-contain"
                            />
                        </div>
                    ) : null}
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6">
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
                            {downloadingCertificate ? 'Generating...' : 'Download Certificate'}
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

                    <div className="flex gap-3">
                        {(participant as any).attendance_type !== 'online' && (
                            <button
                                onClick={handleDownload}
                                disabled={!cardDataUrl}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">download</span>
                                Download
                            </button>
                        )}
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
