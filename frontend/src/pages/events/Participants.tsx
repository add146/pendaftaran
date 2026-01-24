import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { participantsAPI, eventsAPI, type Participant as ParticipantType, type Event } from '../../lib/api'
import QRScanner from '../../components/QRScanner'
import QRCodeModal from '../../components/QRCodeModal'
import AdminLayout from '../../components/layout/AdminLayout'

// Stat card component
function StatCard({ icon, label, value, subValue, iconColor }: {
    icon: string
    label: string
    value: string
    subValue?: string
    iconColor?: string
}) {
    return (
        <div className="flex flex-col gap-1 rounded-xl p-5 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                <span className={`material-symbols-outlined text-[20px] ${iconColor || ''}`}>{icon}</span>
                {label}
            </div>
            <p className="text-2xl font-bold text-text-main">
                {value}
                {subValue && <span className="text-sm font-normal text-gray-400"> {subValue}</span>}
            </p>
        </div>
    )
}

// Participant row component
function ParticipantRow({
    participant,
    onCheckIn,
    onApprove,
    onShowQR,
    onDelete,
    onResendWhatsApp,
    eventDate,
    eventTime
}: {
    participant: ParticipantType
    onCheckIn: (id: string) => void
    onApprove: (id: string) => void
    onShowQR: (participant: ParticipantType) => void
    onDelete: (id: string, name: string) => void
    onResendWhatsApp: (id: string) => void
    eventDate?: string
    eventTime?: string
}) {
    // Check if check-in is open (1 hour before event)
    const isCheckInOpen = () => {
        if (!eventDate) return true // If no date, allow check-in
        try {
            const [year, month, day] = eventDate.split('-').map(Number)
            const [hours, minutes] = (eventTime || '00:00').split(':').map(Number)
            const eventDateTime = new Date(year, month - 1, day, hours, minutes)
            const checkInOpenTime = new Date(eventDateTime.getTime() - 60 * 60 * 1000) // 1 hour before
            return new Date() >= checkInOpenTime
        } catch {
            return true
        }
    }

    const checkInAvailable = isCheckInOpen()

    const paymentStyles: Record<string, string> = {
        paid: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-800'
    }

    const initials = participant.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    const colors = ['bg-primary/10 text-primary', 'bg-purple-100 text-purple-600', 'bg-blue-100 text-blue-600', 'bg-orange-100 text-orange-600']
    const bgColor = colors[participant.full_name.charCodeAt(0) % colors.length]

    // Generate WhatsApp link to user's phone with ticket link
    const userPhone = participant.phone?.replace(/^0/, '62') || ''
    const ticketLink = `https://etiket.my.id/ticket/${participant.registration_id}`
    const waMessage = encodeURIComponent(
        `🎫 *E-TICKET*\n\n` +
        `👤 *${participant.full_name}*\n` +
        `🎟️ Registration ID: ${participant.registration_id}\n\n` +
        `🔗 *Lihat ID Card:*\n${ticketLink}\n\n` +
        `Tunjukkan QR Code di link tersebut saat check-in.`
    )
    const waLink = userPhone ? `https://wa.me/${userPhone}?text=${waMessage}` : ''

    return (
        <tr className="hover:bg-gray-50 transition-colors group">
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full ${bgColor} flex items-center justify-center font-bold text-xs`}>
                        {initials}
                    </div>
                    <div>
                        <div className="font-medium text-text-main">{participant.full_name}</div>
                        <div className="text-xs text-gray-500">{participant.ticket_name || 'General'}</div>
                    </div>
                </div>
            </td>
            <td className="p-4 font-mono text-gray-600">#{participant.registration_id}</td>
            <td className="p-4">
                <div className="text-gray-600">{participant.email}</div>
                {participant.phone && (
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                        <span className="material-symbols-outlined text-[14px]">chat</span>
                        {participant.phone}
                    </a>
                )}
            </td>
            <td className="p-4 text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStyles[participant.payment_status]}`}>
                    {participant.payment_status.charAt(0).toUpperCase() + participant.payment_status.slice(1)}
                </span>
            </td>
            <td className="p-4 text-center">
                {participant.check_in_status === 'checked_in' ? (
                    <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            Checked In
                        </span>
                        {participant.check_in_time && <div className="text-[10px] text-gray-400 mt-1">{participant.check_in_time}</div>}
                    </>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Not Arrived
                    </span>
                )}
            </td>
            <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    {/* Approve Payment button for pending payments */}
                    {participant.payment_status === 'pending' && (
                        <button
                            onClick={() => onApprove(participant.registration_id)}
                            className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            Approve
                        </button>
                    )}

                    {/* Check In button for paid participants */}
                    {participant.check_in_status !== 'checked_in' && participant.payment_status === 'paid' && (
                        <button
                            onClick={() => checkInAvailable && onCheckIn(participant.registration_id)}
                            disabled={!checkInAvailable}
                            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 ${checkInAvailable
                                ? 'bg-primary text-white hover:bg-primary-hover'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            title={!checkInAvailable ? 'Check-in dibuka 1 jam sebelum acara' : ''}
                        >
                            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                            Check In
                        </button>
                    )}

                    {/* WhatsApp Send QR button for paid participants */}
                    {participant.payment_status === 'paid' && (
                        <button
                            onClick={() => onShowQR(participant)}
                            className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">qr_code</span>
                            Show QR
                        </button>
                    )}

                    {/* Resend WhatsApp button for paid participants with phone */}
                    {participant.payment_status === 'paid' && participant.phone && (
                        <div className="flex items-center gap-1">
                            {/* WhatsApp status indicator */}
                            {participant.whatsapp_status === 'sent' ? (
                                <span
                                    className="material-symbols-outlined text-green-500 text-[18px]"
                                    title={`WhatsApp terkirim ${participant.whatsapp_sent_at ? new Date(participant.whatsapp_sent_at).toLocaleString('id-ID') : ''}`}
                                >
                                    check_circle
                                </span>
                            ) : (
                                <span
                                    className="material-symbols-outlined text-yellow-500 text-[18px]"
                                    title="WhatsApp belum/gagal terkirim"
                                >
                                    warning
                                </span>
                            )}
                            <button
                                onClick={() => onResendWhatsApp(participant.registration_id)}
                                className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 flex items-center gap-1"
                                title="Resend WhatsApp notification with QR code link"
                            >
                                <span className="material-symbols-outlined text-[16px]">send</span>
                                Resend WA
                            </button>
                        </div>
                    )}

                    {/* Delete button */}
                    <button
                        onClick={() => onDelete(participant.registration_id, participant.full_name)}
                        className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 flex items-center gap-1"
                        title="Delete participant"
                    >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    )
}

export default function Participants() {
    const { id } = useParams()
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [isQRModalOpen, setIsQRModalOpen] = useState(false)
    const [selectedParticipant, setSelectedParticipant] = useState<ParticipantType | null>(null)
    const [participants, setParticipants] = useState<ParticipantType[]>([])
    const [event, setEvent] = useState<Event | null>(null)
    const [stats, setStats] = useState({ total: 0, checked_in: 0, pending: 0, revenue: 0 })
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [exportLoading, setExportLoading] = useState(false)

    const fetchData = async () => {
        if (!id) return
        setLoading(true)
        try {
            const [eventData, participantsData, statsData] = await Promise.all([
                eventsAPI.get(id),
                participantsAPI.list(id, { search, limit: 50 }),
                eventsAPI.stats(id)
            ])
            setEvent(eventData)
            setParticipants(participantsData.data)
            setStats({
                total: statsData.total_registered,
                checked_in: statsData.checked_in,
                pending: statsData.pending_checkin,
                revenue: statsData.revenue
            })
        } catch (err) {
            console.error('Failed to fetch data:', err)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [id, search])

    const handleExportCSV = async () => {
        if (!id) return
        setExportLoading(true)
        try {
            await participantsAPI.exportCSV(id)
        } catch (err: any) {
            alert(`Failed to export CSV: ${err.message}`)
        } finally {
            setExportLoading(false)
        }
    }

    const handleCheckIn = async (registrationId: string) => {
        try {
            await participantsAPI.checkIn(registrationId, id)
            fetchData() // Refresh data
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleApprove = async (registrationId: string) => {
        try {
            await participantsAPI.approvePayment(registrationId)
            fetchData() // Refresh data
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleResendWhatsApp = async (registrationId: string) => {
        try {
            await participantsAPI.resendWhatsApp(registrationId)
            // Silent success - no notification needed
        } catch (err: any) {
            alert(`Failed to send WhatsApp: ${err.message}`)
        }
    }

    const handleShowQR = (participant: ParticipantType) => {
        setSelectedParticipant(participant)
        setIsQRModalOpen(true)
    }

    const handleDelete = async (registrationId: string, name: string) => {
        if (!confirm(`Are you sure you want to delete participant "${name}"? This action cannot be undone.`)) {
            return
        }
        try {
            await participantsAPI.delete(registrationId)
            fetchData() // Refresh data
        } catch (err: any) {
            alert(err.message || 'Failed to delete participant')
        }
    }

    const handleScanSuccess = () => {
        fetchData() // Refresh data after successful scan
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
    }

    return (
        <AdminLayout title="Event Participants" currentPage="events" showCreateButton={false}>
            <div className="flex-1 flex flex-col items-center py-6 px-4 md:px-8 w-full max-w-[1440px] mx-auto">
                <div className="w-full flex flex-col gap-6">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Link className="text-primary/70 hover:text-primary font-medium" to="/dashboard">Events</Link>
                        <span className="text-gray-400">/</span>
                        <span className="text-text-main font-medium">{event?.title || 'Loading...'}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-text-main font-medium">Participants</span>
                    </div>

                    {/* Page Heading & Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-text-main">
                                {event?.title || 'Event'} - Participant List
                            </h1>
                            <p className="text-gray-500 mt-1">Manage registrations, payments, and check-in attendees.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExportCSV}
                                disabled={exportLoading}
                                className="group flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg h-12 px-6 font-bold shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {exportLoading ? 'hourglass_empty' : 'download'}
                                </span>
                                <span>{exportLoading ? 'Exporting...' : 'Export to CSV'}</span>
                            </button>
                            <button
                                onClick={() => setIsScannerOpen(true)}
                                className="group flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-lg h-12 px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                            >
                                <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                                <span>Launch Web Scanner</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon="group" label="Total Registered" value={String(stats.total)} />
                        <StatCard icon="check_circle" label="Checked In" value={String(stats.checked_in)} subValue={`/ ${stats.total}`} iconColor="text-primary" />
                        <StatCard icon="pending" label="Pending Check-in" value={String(stats.pending)} iconColor="text-yellow-600" />
                        <StatCard icon="payments" label="Revenue" value={formatCurrency(stats.revenue)} iconColor="text-emerald-600" />
                    </div>

                    {/* Filters & Search */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="relative w-full md:w-96 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">search</span>
                            </div>
                            <input
                                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-background-light text-sm placeholder-gray-500 focus:ring-2 focus:ring-primary/20 transition-all text-text-main"
                                placeholder="Search by name, ID, or email..."
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                            {['All', 'Paid', 'Pending', 'Checked In'].map((label) => (
                                <button
                                    key={label}
                                    onClick={() => setFilter(label.toLowerCase().replace(' ', '_'))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors ${filter === label.toLowerCase().replace(' ', '_')
                                        ? 'bg-primary/10 text-primary border-primary/20'
                                        : 'bg-transparent hover:bg-gray-50 text-gray-600 border-gray-200'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Participant</th>
                                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Reg ID</th>
                                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Payment</th>
                                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Status</th>
                                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {participants.map((p) => (
                                            <ParticipantRow key={p.id} participant={p} onCheckIn={handleCheckIn} onApprove={handleApprove} onShowQR={handleShowQR} onDelete={handleDelete} onResendWhatsApp={handleResendWhatsApp} eventDate={event?.event_date} eventTime={event?.event_time} />
                                        ))}
                                        {participants.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                                    No participants found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-medium">{participants.length}</span> of <span className="font-medium">{stats.total}</span> results
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-sm rounded border border-gray-200 text-gray-600 disabled:opacity-50" disabled>Previous</button>
                                <button className="px-3 py-1 text-sm rounded border border-gray-200 text-gray-600 hover:bg-white">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanner Modal */}
            <QRScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                eventId={id || ''}
                onCheckInSuccess={handleScanSuccess}
            />

            {/* QR Code Display Modal */}
            <QRCodeModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                eventId={id}
                participant={selectedParticipant ? {
                    full_name: selectedParticipant.full_name,
                    registration_id: selectedParticipant.registration_id,
                    qr_code: selectedParticipant.qr_code || selectedParticipant.registration_id,
                    event_title: event?.title,
                    event_date: event?.event_date,
                    city: selectedParticipant.city,
                    ticket_name: selectedParticipant.ticket_name,
                    phone: selectedParticipant.phone
                } : null}
            />
        </AdminLayout>
    )
}
