import { useState, useEffect, useRef } from 'react'
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
    isResending,
    eventDate,
    eventTime
}: {
    participant: ParticipantType
    onCheckIn: (id: string) => void
    onApprove: (id: string) => void
    onShowQR: (participant: ParticipantType) => void
    onDelete: (id: string, name: string) => void
    onResendWhatsApp: (id: string) => void
    isResending: boolean
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
                        {participant.ticket_name && <div className="text-xs text-gray-500">{participant.ticket_name}</div>}
                        {participant.attendance_type && (
                            <div className={`text-[10px] font-bold uppercase mt-1 ${participant.attendance_type === 'online' ? 'text-purple-600' : 'text-blue-600'}`}>
                                {participant.attendance_type}
                            </div>
                        )}
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
                        {participant.check_in_time && (
                            <div className="text-[10px] text-gray-400 mt-1">
                                {(() => {
                                    try {
                                        // Try to parse as date (ISO string)
                                        const date = new Date(participant.check_in_time)
                                        if (isNaN(date.getTime())) throw new Error('Invalid date')

                                        // Check if it's a legacy string like "03:53 AM"
                                        const legacyMatch = participant.check_in_time.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i)
                                        if (legacyMatch) {
                                            const offset = date.getTimezoneOffset()
                                            date.setMinutes(date.getMinutes() - offset)
                                        }

                                        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                    } catch {
                                        // Fallback
                                        return participant.check_in_time
                                    }
                                })()}
                            </div>
                        )}
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
                            <span className="material-symbols-outlined text-[16px]">badge</span>
                            Show ID
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
                                disabled={isResending}
                                className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 ${isResending
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                    }`}
                                title={isResending ? "Sedang mengirim..." : "Resend WhatsApp notification with QR code link"}
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isResending ? 'animate-spin' : ''}`}>
                                    {isResending ? 'progress_activity' : 'send'}
                                </span>
                                {isResending ? 'Sending...' : 'Resend WA'}
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
    const [stats, setStats] = useState<{
        total: number
        checked_in: number
        pending: number
        revenue: number
        attendance_offline_total?: number
        attendance_online_total?: number
        attendance_offline_checked_in?: number
        attendance_online_checked_in?: number
    }>({ total: 0, checked_in: 0, pending: 0, revenue: 0 })
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [exportLoading, setExportLoading] = useState(false)
    const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())

    // Client-Side Broadcast State
    const [broadcastModalOpen, setBroadcastModalOpen] = useState(false)
    const [broadcastTargets, setBroadcastTargets] = useState<any[]>([])
    const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 })
    const [broadcastLogs, setBroadcastLogs] = useState<string[]>([])
    const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'resting'>('idle')
    const [broadcastTimeRemaining, setBroadcastTimeRemaining] = useState(0)
    const shouldStopBroadcast = useRef(false)

    // Prevent window close during broadcast
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (broadcastStatus === 'running' || broadcastStatus === 'resting') {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [broadcastStatus])

    const fetchData = async () => {
        if (!id) return
        setLoading(true)
        try {
            const params: any = { search, limit: 50 }

            // Map filters to API params
            if (filter === 'paid') params.payment = 'paid'
            if (filter === 'pending') params.payment = 'pending'
            if (filter === 'checked_in') params.status = 'checked_in'

            const [eventData, participantsData, statsData] = await Promise.all([
                eventsAPI.get(id),
                participantsAPI.list(id, params),
                eventsAPI.stats(id)
            ])
            setEvent(eventData)
            setParticipants(participantsData.data)
            setStats({
                total: statsData.total_registered,
                checked_in: statsData.checked_in,
                pending: statsData.pending_checkin,
                revenue: statsData.revenue,
                attendance_offline_total: statsData.attendance_offline_total,
                attendance_online_total: statsData.attendance_online_total,
                attendance_offline_checked_in: statsData.attendance_offline_checked_in,
                attendance_online_checked_in: statsData.attendance_online_checked_in
            })
        } catch (err) {
            console.error('Failed to fetch data:', err)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [id, search, filter])

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

    const handleBroadcastLink = async () => {
        if (!event || !id) return
        if (!event.online_url) return alert('Link meeting belum diatur.')

        if (!confirm(`Kirim link meeting ke peserta PAID?\n\nMetode: Safe Mode (Client-Side)\n- Jeda acak 1-3 menit.\n- Istirahat 5 menit tiap 20 pesan.\n- JANGAN TUTUP TAB INI selama proses.`)) {
            return
        }

        try {
            setLoading(true)
            const result = await eventsAPI.getBroadcastTargets(id)
            setBroadcastTargets(result.targets)
            setBroadcastProgress({ current: 0, total: result.targets.length, success: 0, failed: 0 })
            setBroadcastLogs(['Siap memulai broadcast safe mode...'])
            setBroadcastModalOpen(true)
            setBroadcastStatus('idle')
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    const runBroadcast = async () => {
        setBroadcastStatus('running')
        shouldStopBroadcast.current = false
        const targets = broadcastTargets
        const total = targets.length

        let success = broadcastProgress.success
        let failed = broadcastProgress.failed
        let current = broadcastProgress.current // Continue where left off

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
        const addLog = (msg: string) => setBroadcastLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))

        const BATCH_SIZE = 20

        for (let i = current; i < total; i++) {
            if (shouldStopBroadcast.current) {
                setBroadcastStatus('paused')
                addLog('Proses di-pause oleh user.')
                return
            }

            const target = targets[i]
            setBroadcastProgress(prev => ({ ...prev, current: i + 1 }))

            // Checking if already sent? (Optional, skipping for now to allow force resend)
            // if (target.whatsapp_status === 'sent') { ... } 

            addLog(`Mengirim ke ${target.full_name} (${i + 1}/${total})...`)

            try {
                // Initial small delay (simulating user clicking send)
                await sleep(Math.random() * 2000 + 2000)

                const res = await eventsAPI.broadcastSingle(id!, target.registration_id)
                if (res.success) {
                    success++
                    addLog(`✅ Sukses: ${target.full_name}`)
                } else {
                    failed++
                    addLog(`❌ Gagal: ${target.full_name} - ${res.error}`)
                }
            } catch (e: any) {
                failed++
                addLog(`❌ Error: ${target.full_name} - ${e.message}`)
            }

            setBroadcastProgress(prev => ({ ...prev, success, failed }))

            // BATCH REST
            if ((i + 1) % BATCH_SIZE === 0 && i < total - 1) {
                setBroadcastStatus('resting')
                const restTime = 300 // 5 minutes (seconds)
                addLog(`💤 Resting batch (5 menit)...`)
                for (let r = restTime; r > 0; r--) {
                    if (shouldStopBroadcast.current) { setBroadcastStatus('paused'); return; }
                    setBroadcastTimeRemaining(r)
                    await sleep(1000)
                }
                setBroadcastStatus('running')
            }
            // INTER-MESSAGE DELAY (60-180s)
            else if (i < total - 1) {
                const delay = Math.floor(Math.random() * (180 - 60 + 1) + 60)
                addLog(`⏳ Menunggu ${delay} detik...`)
                for (let d = delay; d > 0; d--) {
                    if (shouldStopBroadcast.current) { setBroadcastStatus('paused'); return; }
                    setBroadcastTimeRemaining(d)
                    await sleep(1000)
                }
            }
        }

        setBroadcastStatus('completed')
        addLog('🎉 Broadcast Selesai!')
        alert(`Laporan Broadcast:\n\nTotal: ${total}\nSukses: ${success}\nGagal: ${failed}`)
        fetchData()
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
        if (resendingIds.has(registrationId)) return

        setResendingIds(prev => new Set(prev).add(registrationId))
        try {
            await participantsAPI.resendWhatsApp(registrationId)
            alert('WhatsApp berhasil dikirim ulang!')
        } catch (err: any) {
            alert(`Failed to send WhatsApp: ${err.message}`)
        } finally {
            setResendingIds(prev => {
                const next = new Set(prev)
                next.delete(registrationId)
                return next
            })
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
                        <div className="flex flex-wrap items-center gap-3">
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

                            {/* Broadcast Button (Online/Hybrid only) */}
                            {event && (event.event_type === 'online' || event.event_type === 'hybrid') && (
                                <button
                                    onClick={handleBroadcastLink}
                                    className="group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-12 px-6 font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        broadcast_on_personal
                                    </span>
                                    <span>
                                        Safe Broadcast
                                    </span>
                                </button>
                            )}

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

                    {/* Hybrid Event Stats */}
                    {event?.event_type === 'hybrid' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <StatCard
                                icon="accessibility"
                                label="Offline Attendance"
                                value={String(stats.attendance_offline_checked_in || 0)}
                                subValue={`/ ${stats.attendance_offline_total || 0}`}
                                iconColor="text-blue-600"
                            />
                            <StatCard
                                icon="videocam"
                                label="Online Attendance"
                                value={String(stats.attendance_online_checked_in || 0)}
                                subValue={`/ ${stats.attendance_online_total || 0}`}
                                iconColor="text-purple-600"
                            />
                        </div>
                    )}

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
                                            <ParticipantRow key={p.id} participant={p} onCheckIn={handleCheckIn} onApprove={handleApprove} onShowQR={handleShowQR} onDelete={handleDelete} onResendWhatsApp={handleResendWhatsApp} isResending={resendingIds.has(p.registration_id)} eventDate={event?.event_date} eventTime={event?.event_time} />
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
                    event_time: event?.event_time,
                    city: selectedParticipant.city,
                    ticket_name: selectedParticipant.ticket_name,
                    phone: selectedParticipant.phone,
                    attendance_type: (selectedParticipant as any).attendance_type
                } : null}
            />
            {/* Broadcast Modal */}
            {broadcastModalOpen && (
                <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => {
                            if (broadcastStatus === 'completed' || broadcastStatus === 'idle') setBroadcastModalOpen(false)
                        }}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${broadcastStatus === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                                        }`}>
                                        <span className={`material-symbols-outlined ${broadcastStatus === 'completed' ? 'text-green-600' : 'text-blue-600'
                                            }`}>
                                            {broadcastStatus === 'completed' ? 'check' : 'campaign'}
                                        </span>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Broadcast Progress
                                        </h3>

                                        {/* Status Bar */}
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Progress ({broadcastProgress.current}/{broadcastProgress.total})</span>
                                                <span className="font-bold">{Math.round((broadcastProgress.current / broadcastProgress.total || 0) * 100)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${(broadcastProgress.current / broadcastProgress.total || 0) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Timer & State */}
                                        {(broadcastStatus === 'running' || broadcastStatus === 'resting') && broadcastTimeRemaining > 0 && (
                                            <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm text-center font-mono">
                                                {broadcastStatus === 'resting' ? '💤 Resting (Safe Mode)...' : '⏳ Waiting next message...'} {broadcastTimeRemaining}s
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                                            <div className="p-2 bg-green-50 rounded-lg">
                                                <div className="text-green-800 font-bold">{broadcastProgress.success}</div>
                                                <div className="text-xs text-green-600">Success</div>
                                            </div>
                                            <div className="p-2 bg-red-50 rounded-lg">
                                                <div className="text-red-800 font-bold">{broadcastProgress.failed}</div>
                                                <div className="text-xs text-red-600">Failed</div>
                                            </div>
                                        </div>

                                        {/* Terminal Log */}
                                        <div className="mt-4 bg-gray-900 text-green-400 p-3 rounded-lg h-40 overflow-y-auto text-xs font-mono">
                                            {broadcastLogs.map((log, i) => (
                                                <div key={i}>{log}</div>
                                            ))}
                                            {broadcastLogs.length === 0 && <div className="text-gray-500">Ready to start...</div>}
                                        </div>

                                        <div className="mt-2 text-xs text-red-500 font-bold text-center">
                                            ⚠️ JANGAN TUTUP TAB INI SAMPAI SELESAI
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                {broadcastStatus === 'idle' || broadcastStatus === 'paused' ? (
                                    <button
                                        type="button"
                                        onClick={runBroadcast}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        {broadcastStatus === 'paused' ? 'Resume' : 'Start Broadcast'}
                                    </button>
                                ) : broadcastStatus === 'running' || broadcastStatus === 'resting' ? (
                                    <button
                                        type="button"
                                        onClick={() => { shouldStopBroadcast.current = true }}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Pause
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setBroadcastModalOpen(false)}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Close & Finish
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setBroadcastModalOpen(false)}
                                    disabled={broadcastStatus === 'running' || broadcastStatus === 'resting'}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
