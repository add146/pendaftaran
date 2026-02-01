import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../../lib/api'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { useTranslation } from 'react-i18next'

interface IdCardDesign {
    primaryColor: string
    backgroundColor: string
    sponsorLogo: string | null
}

interface TicketData {
    registration_id: string
    full_name: string
    email: string
    phone?: string
    city?: string
    ticket_name?: string
    qr_code: string
    payment_status: string
    event_title: string
    event_date: string
    event_time?: string
    location?: string
    location_map_url?: string
    id_card_design?: IdCardDesign
    event_type?: 'offline' | 'online' | 'hybrid'
    online_platform?: 'google_meet' | 'zoom' | 'youtube' | 'custom'
    online_url?: string
    online_password?: string
    online_instructions?: string
    note?: string
    icon_type?: 'info' | 'warning' | 'danger'
    certificate_config?: string
    attendance_type?: 'offline' | 'online'
    custom_fields?: Array<{ label: string; response: string; show_on_id: boolean }>
    whatsapp_cs?: string
    google_maps_api_key?: string
}

export default function PublicTicket() {
    const { t } = useTranslation()
    const { registrationId } = useParams()
    const [ticket, setTicket] = useState<TicketData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [downloadingCertificate, setDownloadingCertificate] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Default design
    const defaultDesign: IdCardDesign = {
        primaryColor: '#1e7b49',
        backgroundColor: '#ffffff',
        sponsorLogo: null
    }

    const design = ticket?.id_card_design || defaultDesign

    useEffect(() => {
        if (registrationId) {
            fetchTicket()
        }
    }, [registrationId])

    useEffect(() => {
        if (ticket?.qr_code && canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, ticket.qr_code, {
                width: 180,
                margin: 1,
                color: {
                    dark: '#ffffff',
                    light: '#1f2937'
                }
            })
        }
    }, [ticket])

    const fetchTicket = async () => {
        try {
            const data = await publicAPI.ticket(registrationId!)
            setTicket(data)
        } catch (err: any) {
            setError(err.message || t('ticket.not_found'))
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadCertificate = async () => {
        if (!ticket || !ticket.certificate_config) return

        try {
            const config = JSON.parse(ticket.certificate_config)
            if (!config.enabled) return

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
            if (config.backgroundUrl) {
                const img = new Image()
                img.crossOrigin = "Anonymous"
                img.src = config.backgroundUrl
                await new Promise((resolve, reject) => {
                    img.onload = resolve
                    img.onerror = reject
                })
                doc.addImage(img, 'JPEG', 0, 0, width, height)
            }

            // Add elements
            // Add elements
            // We need async for QR code generation
            for (const el of config.elements) {
                if (el.type === 'text') {
                    let text = el.label
                    // Placeholders
                    if (text === '{Nama Peserta}') text = ticket.full_name
                    if (text === '{ID Registrasi}') text = ticket.registration_id

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
                        const qrDataUrl = await QRCode.toDataURL(ticket.qr_code, {
                            width: 500,
                            margin: 1,
                            color: {
                                dark: '#000000',
                                light: '#ffffff'
                            }
                        })

                        // Parse position and size
                        // In editor: fontSize handles "size" of QR box. 
                        // We interpret el.fontSize as width/height in pixels relative to editor width (800)
                        // Then scale to PDF dimensions.
                        // Actually, el.fontSize in editor is used as px width/height.

                        // Editor width 800px. PDF width 'width' mm.
                        // Scale ratio
                        // const scale = width / 800; -- this is rough.

                        // Better: Use percentage for width/height? 
                        // In editor we treated 'fontSize' as direct px size.
                        // Let's assume el.fontSize corresponds to pixel size in 800px width container.
                        // So percentage width = el.fontSize / 800

                        const sizePercent = el.fontSize / 800
                        const sizeMm = sizePercent * width

                        const x = (el.x / 100) * width
                        const y = (el.y / 100) * height

                        // x,y is center in editor
                        doc.addImage(qrDataUrl, 'PNG', x - (sizeMm / 2), y - (sizeMm / 2), sizeMm, sizeMm)

                    } catch (e) {
                        console.error("Failed to generate QR for certificate", e)
                    }
                }
            }

            doc.save(`${ticket.event_title.replace(/\s+/g, '_')}_Certificate.pdf`)

        } catch (err) {
            console.error('Certificate generation failed:', err)
            alert(t('ticket.certificate_failed'))
        } finally {
            setDownloadingCertificate(false)
        }
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

    // Format Hijri date (approximate - simplified calculation)
    // formatHijriDate removed

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error || !ticket) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{t('ticket.not_found_title')}</h2>
                    <p className="text-gray-500 mb-6">{error || t('ticket.invalid_id')}</p>
                    <Link to="/" className="text-primary font-bold hover:underline">
                        {t('common.back_home')}
                    </Link>
                </div>
            </div>
        )
    }

    if (ticket.payment_status !== 'paid') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
                    <span className="material-symbols-outlined text-yellow-500 text-6xl mb-4">pending</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{t('ticket.payment_pending')}</h2>
                    <p className="text-gray-500 mb-6">{t('ticket.payment_pending_desc')}</p>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <strong>{ticket.full_name}</strong><br />
                            {ticket.event_title}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: `linear-gradient(to bottom, ${design.primaryColor}20, #f3f4f6)` }}
        >
            <div className="flex flex-col items-center gap-6 w-full max-w-sm">



                {/* ID Card */}
                <div
                    className="rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative"
                    style={{ backgroundColor: design.backgroundColor }}
                >
                    {/* Header with primary color */}
                    <div
                        className="px-6 py-6 text-center"
                        style={{ backgroundColor: design.primaryColor }}
                    >
                        <h2 className="text-white font-black text-xl tracking-wider uppercase">
                            {ticket.event_title}
                        </h2>
                        {/* Simplified date - two formats */}
                        {/* Simplified date & time - pill style */}
                        <div className="mt-4 flex justify-center">
                            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-5 py-2 backdrop-blur-sm border border-white/20 shadow-sm">
                                <span className="material-symbols-outlined text-white text-[18px]">calendar_today</span>
                                <span className="text-white font-bold text-sm tracking-wide uppercase">
                                    {formatDate(ticket.event_date)}
                                </span>

                                {ticket.event_time && (
                                    <>
                                        <span className="text-white/50 mx-1 font-light text-lg">|</span>
                                        <span className="text-white font-bold text-sm tracking-wide uppercase">
                                            {ticket.event_time}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="px-6 py-6" style={{ backgroundColor: design.backgroundColor }}>
                        {/* QR Code Container - Only for Offline */}
                        {(ticket as any).attendance_type !== 'online' && (
                            <div className="flex justify-center mb-5">
                                <div className="p-4 bg-gray-800 rounded-2xl shadow-lg">
                                    <canvas ref={canvasRef}></canvas>
                                </div>
                            </div>
                        )}

                        {/* Participant Name */}
                        <div className="text-center mb-4">
                            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-wide">
                                {ticket.full_name}
                            </h3>
                            <p
                                className="font-bold text-sm uppercase tracking-wider mt-1"
                                style={{ color: design.primaryColor }}
                            >
                                {ticket.ticket_name || t('id_card.participant').toUpperCase()}
                            </p>
                        </div>

                        {/* Custom Fields (Above City, Bold) */}
                        {ticket.custom_fields?.filter(f => f.show_on_id).map((field, i) => (
                            <div key={i} className="text-center font-bold text-gray-700 text-sm mb-1 uppercase">
                                {field.response}
                            </div>
                        ))}

                        {/* City/Location */}
                        {ticket.city && (
                            <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                                <span className="material-symbols-outlined text-[18px]">apartment</span>
                                <span className="text-sm">{ticket.city}</span>
                            </div>
                        )}

                        {/* Registration ID Badge */}
                        <div
                            className="rounded-xl py-3 px-4 text-center mb-4"
                            style={{ backgroundColor: `${design.primaryColor}15` }}
                        >
                            <p
                                className="font-mono font-bold text-sm tracking-wider"
                                style={{ color: design.primaryColor }}
                            >
                                {ticket.registration_id}
                            </p>
                        </div>

                        {/* Note with Icon (if present) */}
                        {ticket.note && (
                            <div className={`mx-6 mb-4 p-3 rounded-lg text-center ${(ticket.icon_type || 'info') === 'info' ? 'bg-blue-50 text-blue-800' :
                                (ticket.icon_type || 'info') === 'warning' ? 'bg-orange-50 text-orange-800' :
                                    'bg-red-50 text-red-800'
                                }`}>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-2xl">
                                        {(ticket.icon_type || 'info') === 'info' ? 'ℹ️' :
                                            (ticket.icon_type || 'info') === 'warning' ? '⚠️' :
                                                '🛑'}
                                    </span>
                                    <span className="font-bold text-sm uppercase tracking-wide whitespace-pre-wrap break-words w-full">
                                        {ticket.note.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                            part.match(/^https?:\/\//) ? (
                                                <a
                                                    key={i}
                                                    href={part}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline font-bold hover:opacity-75 transition-opacity break-all text-blue-600"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {part}
                                                </a>
                                            ) : (
                                                <span key={i}>{part}</span>
                                            )
                                        )}
                                    </span>
                                </div>
                            </div>

                        )}

                        {/* Event Location */}
                        {ticket.location && (
                            <div className="text-center text-sm text-gray-500">
                                <span className="material-symbols-outlined text-[16px] align-middle mr-1">place</span>
                                {ticket.location}
                                {ticket.google_maps_api_key && ticket.location_map_url && (
                                    <div className="mt-3 rounded-xl overflow-hidden shadow-sm h-32 w-full">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            className="border-0"
                                            loading="lazy"
                                            allowFullScreen
                                            src={`https://www.google.com/maps/embed/v1/place?key=${ticket.google_maps_api_key}&q=${encodeURIComponent(ticket.location)}`}
                                        ></iframe>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Online Event Details */}
                        {ticket.event_type !== 'offline' && (ticket as any).attendance_type !== 'offline' && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 text-center mb-3 flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[20px]">videocam</span>
                                    {t('ticket.online_event_details')}
                                </h4>

                                <div className="space-y-3 text-center">
                                    {ticket.online_platform && (
                                        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium capitalize mb-1">
                                            Platform: {ticket.online_platform.replace('_', ' ')}
                                        </div>
                                    )}

                                    {ticket.online_url ? (() => {
                                        // Calculate if button should be active (1 hour before event)
                                        let isButtonActive = true
                                        // Only check time if we have valid date and time
                                        if (ticket.event_date && ticket.event_time) {
                                            try {
                                                const eventDateTimeStr = `${ticket.event_date}T${ticket.event_time}:00`
                                                const eventTime = new Date(eventDateTimeStr).getTime()
                                                // Adjust for timezone if needed - assuming server returns local time or handling properly
                                                // Ideally strictly parse content. For now assuming event_date/time are correct ISO parts.

                                                // Create a cutoff time: 1 hour (3600000 ms) before event
                                                const activationTime = eventTime - 3600000
                                                const userTime = new Date().getTime()
                                                // Note: userTime is client browser time. eventTime should be looked at carefuly.
                                                // Since event_date/time are just strings, "new Date('YYYY-MM-DDTHH:MM:00')" creates a Date in LOCAL browser timezone.
                                                // This is effectively comparing "Event Time in User's Timezone" vs "User's Current Time".
                                                // This works if the user is in the same timezone or if we ignore timezone differences (which is risky but standard for simple implementations).

                                                if (userTime < activationTime) {
                                                    isButtonActive = false
                                                }
                                            } catch (e) {
                                                console.error("Date parse error", e)
                                            }
                                        }

                                        return (
                                            <>
                                                {isButtonActive ? (
                                                    <a
                                                        href={ticket.online_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => {
                                                            // Fire and forget check-in
                                                            import('../../lib/api').then(({ participantsAPI }) => {
                                                                participantsAPI.checkIn(ticket.registration_id)
                                                                    .catch(e => console.log('Check-in background sync:', e))
                                                            })
                                                        }}
                                                        className="block w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                                        style={{ backgroundColor: design.primaryColor }}
                                                    >
                                                        <span className="material-symbols-outlined">link</span>
                                                        Join Meeting
                                                    </a>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="block w-full py-2 bg-gray-300 text-gray-500 font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined">link_off</span>
                                                        Join Meeting
                                                    </button>
                                                )}
                                                {!isButtonActive && (
                                                    <p className="text-[10px] text-gray-500 italic mt-1 bg-gray-50 py-1 px-2 rounded">
                                                        *link akan aktif menjelang acara (1 jam sebelum jadwal)
                                                    </p>
                                                )}
                                            </>
                                        )
                                    })() : (
                                        <div className="text-gray-500 italic text-sm">Link belum tersedia</div>
                                    )}

                                    {ticket.online_password && (
                                        <div className="text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <span className="text-gray-500 block text-xs">Password / Passcode</span>
                                            <span className="font-mono font-bold select-all">{ticket.online_password}</span>
                                        </div>
                                    )}

                                    {ticket.online_instructions && (
                                        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg text-left">
                                            <p className="font-bold text-xs text-yellow-800 mb-1">{t('ticket.instructions')}:</p>
                                            <p className="whitespace-pre-wrap">{ticket.online_instructions}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sponsor Logo */}
                        {design.sponsorLogo && (
                            <div className="mt-4 flex justify-center">
                                <img
                                    src={design.sponsorLogo}
                                    alt="Sponsor"
                                    className="max-h-12 max-w-[150px] object-contain"
                                />
                            </div>
                        )}

                        {/* Certificate Download Button */}
                        {ticket.certificate_config && (() => {
                            try {
                                const config = JSON.parse(ticket.certificate_config)
                                return config.enabled
                            } catch { return false }
                        })() && (
                                <button
                                    onClick={handleDownloadCertificate}
                                    disabled={downloadingCertificate}
                                    className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-black py-3 px-4 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                >
                                    {downloadingCertificate ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
                                    )}
                                    <span className="text-sm md:text-base uppercase tracking-wider">
                                        {downloadingCertificate ? t('common.generating') : t('ticket.download_certificate')}
                                    </span>
                                </button>
                            )}


                    </div>

                    {/* Footer accent with primary color */}
                    <div
                        className="h-2 w-full"
                        style={{ backgroundColor: design.primaryColor }}
                    ></div>

                    {/* Footer */}
                    <div className="px-6 pb-6 pt-4 text-center" style={{ backgroundColor: design.backgroundColor }}>
                        <p className="text-xs text-gray-400">
                            {(ticket as any).attendance_type === 'online'
                                ? t('ticket.save_page_online')
                                : t('ticket.show_qr_checkin')}
                        </p>
                    </div>
                </div>

                {/* Powered by */}
                <div className="flex flex-col items-center justify-center gap-1 text-center opacity-80 mt-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">Powered by</span>
                    <a href="https://etiket.my.id" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        <img src="/etiket-logo.png" alt="Etiket Logo" className="h-[25px] w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" />
                    </a>
                </div>
            </div>

            {/* WhatsApp Contact Button - Fixed Position */}
            {ticket.whatsapp_cs && (
                <a
                    href={`https://wa.me/${ticket.whatsapp_cs.replace(/^0/, '62').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-6 right-6 bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-50 flex items-center justify-center"
                    title="Contact Organizer"
                    style={{
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                    }}
                >
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                </a>
            )}
        </div>
    )
}
