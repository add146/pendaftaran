import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../../lib/api'
import QRCode from 'qrcode'

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
    id_card_design?: IdCardDesign
    event_type?: 'offline' | 'online' | 'hybrid'
    online_platform?: 'google_meet' | 'zoom' | 'youtube' | 'custom'
    online_url?: string
    online_password?: string
    online_instructions?: string
}

export default function PublicTicket() {
    const { registrationId } = useParams()
    const [ticket, setTicket] = useState<TicketData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
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
            setError(err.message || 'Tiket tidak ditemukan')
        } finally {
            setLoading(false)
        }
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
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Tiket Tidak Ditemukan</h2>
                    <p className="text-gray-500 mb-6">{error || 'Registration ID tidak valid'}</p>
                    <Link to="/" className="text-primary font-bold hover:underline">
                        Kembali ke Beranda
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
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Pembayaran Pending</h2>
                    <p className="text-gray-500 mb-6">Tiket akan aktif setelah pembayaran dikonfirmasi.</p>
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
            {/* ID Card */}
            <div
                className="rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
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
                            {ticket.ticket_name || 'PARTICIPANT'}
                        </p>
                    </div>

                    {/* City/Location */}
                    {ticket.city && (
                        <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                            <span className="material-symbols-outlined text-[18px]">location_on</span>
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

                    {/* Event Location */}
                    {ticket.location && (
                        <div className="text-center text-sm text-gray-500">
                            <span className="material-symbols-outlined text-[16px] align-middle mr-1">place</span>
                            {ticket.location}
                        </div>
                    )}

                    {/* Online Event Details */}
                    {ticket.event_type !== 'offline' && (ticket as any).attendance_type !== 'offline' && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="font-bold text-gray-800 text-center mb-3 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[20px]">videocam</span>
                                Detail Event Online
                            </h4>

                            <div className="space-y-3 text-center">
                                {ticket.online_platform && (
                                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium capitalize mb-1">
                                        Platform: {ticket.online_platform.replace('_', ' ')}
                                    </div>
                                )}

                                {ticket.online_url ? (
                                    <a
                                        href={ticket.online_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                        style={{ backgroundColor: design.primaryColor }}
                                    >
                                        <span className="material-symbols-outlined">link</span>
                                        Join Meeting
                                    </a>
                                ) : (
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
                                        <p className="font-bold text-xs text-yellow-800 mb-1">Instruksi:</p>
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
                            ? 'Simpan halaman ini untuk akses link meeting'
                            : 'Tunjukkan QR Code ini saat check-in di lokasi event'}
                    </p>
                </div>
            </div>
        </div>
    )
}
