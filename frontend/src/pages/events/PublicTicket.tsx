import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI } from '../../lib/api'
import QRCode from 'qrcode'

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
}

export default function PublicTicket() {
    const { registrationId } = useParams()
    const [ticket, setTicket] = useState<TicketData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const canvasRef = useRef<HTMLCanvasElement>(null)

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
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
        } catch {
            return dateStr
        }
    }

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
        <div className="min-h-screen bg-gradient-to-b from-primary/10 to-gray-100 flex items-center justify-center p-4">
            {/* ID Card */}
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
                {/* Green Header */}
                <div className="bg-primary px-6 py-6 text-center">
                    <h2 className="text-white font-black text-xl tracking-wider uppercase">
                        {ticket.event_title}
                    </h2>
                    <div className="mt-3 inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-white text-[18px]">calendar_month</span>
                        <span className="text-white text-sm font-bold uppercase tracking-wide">
                            {formatDate(ticket.event_date)}
                        </span>
                    </div>
                    {ticket.event_time && (
                        <div className="mt-2 text-white/80 text-sm">
                            <span className="material-symbols-outlined text-[14px] align-middle mr-1">schedule</span>
                            {ticket.event_time}
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
                            {ticket.full_name}
                        </h3>
                        <p className="text-primary font-bold text-sm uppercase tracking-wider mt-1">
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
                    <div className="bg-primary/10 rounded-xl py-3 px-4 text-center mb-4">
                        <p className="text-primary font-mono font-bold text-sm tracking-wider">
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
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 text-center">
                    <p className="text-xs text-gray-400">
                        Tunjukkan QR Code ini saat check-in di lokasi event
                    </p>
                </div>
            </div>
        </div>
    )
}
