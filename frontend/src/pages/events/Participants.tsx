import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { participantsAPI, eventsAPI, Participant as ParticipantType, Event } from '../lib/api'
import QRScanner from '../components/QRScanner'

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
    onCheckIn
}: {
    participant: ParticipantType
    onCheckIn: (id: string) => void
}) {
    const paymentStyles: Record<string, string> = {
        paid: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-800'
    }

    const initials = participant.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const colors = ['bg-primary/10 text-primary', 'bg-purple-100 text-purple-600', 'bg-blue-100 text-blue-600', 'bg-orange-100 text-orange-600']
    const bgColor = colors[participant.full_name.charCodeAt(0) % colors.length]

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
            <td className="p-4 text-gray-600">{participant.email}</td>
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
                {participant.check_in_status !== 'checked_in' && participant.payment_status === 'paid' && (
                    <button
                        onClick={() => onCheckIn(participant.registration_id)}
                        className="text-primary text-xs font-bold hover:underline mr-3"
                    >
                        Check In
                    </button>
                )}
                <button className="text-gray-400 hover:text-primary p-1 rounded-md hover:bg-primary/5 transition-all">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
            </td>
        </tr>
    )
}

export default function Participants() {
    const { id } = useParams()
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [participants, setParticipants] = useState<ParticipantType[]>([])
    const [event, setEvent] = useState<Event | null>(null)
    const [stats, setStats] = useState({ total: 0, checked_in: 0, pending: 0, revenue: 0 })
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

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

    const handleCheckIn = async (registrationId: string) => {
        try {
            await participantsAPI.checkIn(registrationId)
            fetchData() // Refresh data
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleScanSuccess = () => {
        fetchData() // Refresh data after successful scan
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
    }

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen">
            {/* Top Navigation */}
            <header className="sticky top-0 z-30 flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light bg-surface-light px-10 py-3 shadow-sm">
                <div className="flex items-center gap-4 text-text-main">
                    <Link to="/dashboard" className="size-8 text-primary">
                        <span className="material-symbols-outlined text-[32px]">mosque</span>
                    </Link>
                    <h2 className="text-lg font-bold leading-tight tracking-tight">MosqueEvents</h2>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                    <div className="hidden md:flex items-center gap-9">
                        <Link className="text-sm font-medium leading-normal hover:text-primary transition-colors" to="/dashboard">Dashboard</Link>
                        <span className="text-primary text-sm font-medium leading-normal">Events</span>
                    </div>
                    <div className="rounded-full size-10 bg-primary/20 flex items-center justify-center text-primary font-bold">
                        IA
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center py-8 px-4 md:px-10 lg:px-20 w-full max-w-[1440px] mx-auto">
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
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            className="group flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-lg h-12 px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                        >
                            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                            <span>Launch Web Scanner</span>
                        </button>
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
                                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-background-light text-sm placeholder-gray-500 focus:ring-2 focus:ring-primary/20 transition-all"
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
                                            <ParticipantRow key={p.id} participant={p} onCheckIn={handleCheckIn} />
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
            </main>

            {/* Scanner Modal */}
            <QRScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                eventId={id || ''}
                onCheckInSuccess={handleScanSuccess}
            />
        </div>
    )
}
