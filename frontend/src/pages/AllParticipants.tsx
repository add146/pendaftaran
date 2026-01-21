import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'

interface ParticipantData {
    id: string
    full_name: string
    email: string
    registration_id: string
    event_title: string
    payment_status: string
    check_in_status: string
}

export default function AllParticipants() {
    const [participants, setParticipants] = useState<ParticipantData[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        // For now, we'll show a placeholder since we need an API endpoint for all participants
        // In a real implementation, you'd fetch from /api/participants/all
        setLoading(false)
        setParticipants([])
    }, [])

    return (
        <div className="flex h-screen w-full bg-background-light">
            <Sidebar currentPage="participants" />

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <Header title="All Participants" showCreateButton={false} />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Search & Filter */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Search participants..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Info Alert */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-500">info</span>
                        <div>
                            <p className="text-sm text-blue-800">
                                To view participants for a specific event, go to <Link to="/events" className="font-bold hover:underline">Events</Link> and click on "Participants" for that event.
                            </p>
                        </div>
                    </div>

                    {/* Participants Table */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : participants.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Name</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Email</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Event</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {participants.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium">{p.full_name}</td>
                                                <td className="px-6 py-4 text-gray-600">{p.email}</td>
                                                <td className="px-6 py-4 text-gray-600">{p.event_title}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.check_in_status === 'checked_in'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {p.check_in_status === 'checked_in' ? 'Checked In' : 'Registered'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500">
                                <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">groups</span>
                                <p className="font-medium">No participants yet</p>
                                <p className="text-sm mt-1">Participants will appear here when they register for your events.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
