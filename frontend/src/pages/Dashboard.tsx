import { useState, useEffect } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import { Link } from 'react-router-dom'
import { publicAPI, type Event } from '../lib/api'

// Stat card component
function StatCard({ icon, label, value, trend }: {
    icon: string
    label: string
    value: string
    trend?: string
}) {
    return (
        <div className="p-6 rounded-xl bg-surface-light border border-border-light shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[28px]">{icon}</span>
                </div>
                {trend && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="material-symbols-outlined text-[14px]">trending_up</span>
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-text-sub text-sm font-medium">{label}</p>
            <h3 className="text-3xl font-bold text-text-main mt-1">{value}</h3>
        </div>
    )
}

// Event row component
function EventRow({ id, title, event_date, status, registered_count, capacity }: {
    id: string
    title: string
    event_date: string
    status: string
    registered_count: number
    capacity: number | null
}) {
    const statusStyles: Record<string, string> = {
        open: 'bg-green-100 text-green-800',
        draft: 'bg-gray-100 text-gray-800',
        closed: 'bg-red-100 text-red-800'
    }

    const quota = capacity || 100
    const progress = Math.round((registered_count / quota) * 100)
    const formattedDate = new Date(event_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })

    return (
        <tr className="hover:bg-background-light transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">event</span>
                    </div>
                    <span className="font-medium text-text-main">{title}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-text-sub">{formattedDate}</td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.draft}`}>
                    <span className="size-1.5 rounded-full bg-current"></span>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-text-sub">{registered_count}/{quota} Registered</span>
                        <span className="text-primary">{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-border-light">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <Link
                    to={`/events/${id}/participants`}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${status === 'draft'
                        ? 'text-gray-500 bg-gray-100 cursor-not-allowed'
                        : 'text-primary bg-primary/10 hover:bg-primary/20'
                        }`}
                >
                    <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                    Scan QR
                </Link>
            </td>
        </tr>
    )
}

export default function Dashboard() {
    const [stats, setStats] = useState<{
        active_events: number
        total_participants: number
        total_revenue: number
        recent_events: (Event & { registered_count?: number })[]
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        publicAPI.dashboardStats()
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
    }

    return (
        <AdminLayout title="Dashboard Overview" currentPage="dashboard">
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                            <StatCard icon="event_available" label="Active Events" value={String(stats?.active_events || 0)} />
                            <StatCard icon="diversity_3" label="Total Participants" value={String(stats?.total_participants || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} />
                            <StatCard icon="payments" label="Total Revenue" value={formatCurrency(stats?.total_revenue || 0)} />
                        </div>

                        {/* Recent Events Section */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-text-main">Recent Events</h3>
                                <a className="text-sm font-medium text-primary hover:text-primary-hover hover:underline" href="/events">
                                    View All
                                </a>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="border-b border-border-light bg-background-light/50">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-text-main w-1/3">Event Name</th>
                                                <th className="px-6 py-4 font-semibold text-text-main">Date</th>
                                                <th className="px-6 py-4 font-semibold text-text-main">Status</th>
                                                <th className="px-6 py-4 font-semibold text-text-main w-1/4">Quota Progress</th>
                                                <th className="px-6 py-4 font-semibold text-text-main text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-light">
                                            {stats?.recent_events?.map((event) => (
                                                <EventRow
                                                    key={event.id}
                                                    id={event.id}
                                                    title={event.title}
                                                    event_date={event.event_date}
                                                    status={event.status}
                                                    registered_count={event.registered_count || 0}
                                                    capacity={event.capacity || null}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    )
}
