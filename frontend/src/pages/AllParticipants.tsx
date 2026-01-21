import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import { eventsAPI, participantsAPI, type Participant, type Event } from '../lib/api'

export default function AllParticipants() {
    const [participants, setParticipants] = useState<Participant[]>([])
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState('all')
    const [search, setSearch] = useState('')

    useEffect(() => {
        // First load events
        eventsAPI.list()
            .then(data => {
                const eventList = data.data || []
                setEvents(eventList)

                // Then load participants for each event
                if (eventList.length > 0) {
                    Promise.all(
                        eventList.map(e =>
                            participantsAPI.list(e.id)
                                .then(res => res.data?.map(p => ({ ...p, event_title: e.title })) || [])
                                .catch(() => [])
                        )
                    ).then(results => {
                        setParticipants(results.flat())
                        setLoading(false)
                    })
                } else {
                    setLoading(false)
                }
            })
            .catch(() => {
                setLoading(false)
            })
    }, [])

    const filteredParticipants = participants.filter(p => {
        const matchesEvent = selectedEvent === 'all' || p.event_id === selectedEvent
        const matchesSearch = !search ||
            p.full_name.toLowerCase().includes(search.toLowerCase()) ||
            p.email.toLowerCase().includes(search.toLowerCase()) ||
            p.registration_id.toLowerCase().includes(search.toLowerCase())
        return matchesEvent && matchesSearch
    })

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
    }

    return (
        <div className="flex h-screen w-full bg-background-light">
            <Sidebar currentPage="participants" />

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <Header title="All Participants" showCreateButton={false} />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">groups</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-text-main">{participants.length}</p>
                                    <p className="text-sm text-gray-500">Total Participants</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-green-600">check_circle</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-text-main">
                                        {participants.filter(p => p.check_in_status === 'checked_in').length}
                                    </p>
                                    <p className="text-sm text-gray-500">Checked In</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600">paid</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-text-main">
                                        {participants.filter(p => p.payment_status === 'paid').length}
                                    </p>
                                    <p className="text-sm text-gray-500">Paid</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-yellow-600">pending</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-text-main">
                                        {participants.filter(p => p.payment_status === 'pending').length}
                                    </p>
                                    <p className="text-sm text-gray-500">Pending Payment</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Search by name, email, or registration ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <select
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                        >
                            <option value="all">All Events</option>
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Participants Table */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredParticipants.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Participant</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Registration ID</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Event</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Payment</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Check-in</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Date</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredParticipants.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-text-main">{p.full_name}</p>
                                                        <p className="text-sm text-gray-500">{p.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{p.registration_id}</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{p.event_title || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                                            p.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.check_in_status === 'checked_in'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {p.check_in_status === 'checked_in' ? 'Checked In' : 'Not Arrived'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(p.created_at)}</td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        to={`/events/${p.event_id}/participants`}
                                                        className="text-primary hover:text-primary-hover text-sm font-medium"
                                                    >
                                                        View Event
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500">
                                <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">groups</span>
                                <p className="font-medium">No participants found</p>
                                <p className="text-sm mt-1">
                                    {search ? 'Try a different search term' : 'Participants will appear here when they register for your events.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
