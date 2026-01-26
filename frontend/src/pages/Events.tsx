import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import { eventsAPI, type Event } from '../lib/api'

// Get user role from localStorage
const getUserRole = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return user.role || 'user'
    } catch {
        return 'user'
    }
}

export default function Events() {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    const userRole = getUserRole()
    const isAdmin = userRole === 'admin' || userRole === 'super_admin'

    useEffect(() => {
        eventsAPI.list()
            .then(data => {
                setEvents(data.data || [])
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    const filteredEvents = events.filter(event => {
        if (filter === 'all') return true
        return event.status === filter
    })

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete event "${title}"?\nThis action cannot be undone.`)) return

        try {
            await eventsAPI.delete(id)
            setEvents(prev => prev.filter(e => e.id !== id))
        } catch (err) {
            console.error(err)
            alert('Failed to delete event')
        }
    }

    return (
        <AdminLayout title="Events" currentPage="events">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {['all', 'open', 'draft', 'closed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                    ? 'bg-primary text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                    {/* Only show Create button for admin */}
                    {isAdmin && (
                        <Link
                            to="/events/create"
                            className="flex items-center gap-2 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            Create Event
                        </Link>
                    )}
                </div>

                {/* Events Grid */}
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map((event) => {
                            // Parse images from image_url (JSON array)
                            let eventImage: string | null = null
                            if (event.image_url) {
                                try {
                                    const imgs = JSON.parse(event.image_url)
                                    if (Array.isArray(imgs) && imgs.length > 0) {
                                        eventImage = imgs[0]
                                    }
                                } catch {
                                    eventImage = event.image_url
                                }
                            }

                            return (
                                <div key={event.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full group">
                                    {/* Event Image & Overlay Actions */}
                                    <div className="relative h-48 bg-gray-100">
                                        {/* Image */}
                                        {eventImage ? (
                                            <img src={eventImage} alt={event.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[48px] text-primary/40">event</span>
                                            </div>
                                        )}

                                        {/* Overlay Actions */}
                                        <div className="absolute top-4 left-4 z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    const url = `${window.location.origin}/event/${event.slug || event.id}`
                                                    navigator.clipboard.writeText(url)
                                                    alert('Link copied: ' + url)
                                                }}
                                                className="bg-white text-primary px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">share</span>
                                                Share
                                            </button>
                                        </div>

                                        {isAdmin && (
                                            <div className="absolute top-4 right-4 z-10">
                                                <button
                                                    onClick={() => handleDelete(event.id, event.title)}
                                                    className="bg-red-600 text-white w-9 h-9 rounded-lg shadow-sm hover:shadow-md flex items-center justify-center transition-all active:scale-95 hover:bg-red-700"
                                                    title="Delete Event"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 flex flex-col flex-grow">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.status === 'open' ? 'bg-green-100 text-green-800' :
                                                event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-lg text-text-main mb-2 line-clamp-2">{event.title}</h3>

                                        <div className="space-y-2 text-sm text-gray-500 mb-6 flex-grow">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                                {formatDate(event.event_date)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">location_on</span>
                                                {event.location || 'TBA'}
                                            </div>
                                        </div>

                                        {/* Bottom Actions */}
                                        <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
                                            {/* ID Cards (Teal/Dark Green) */}
                                            <Link
                                                to={`/events/${event.id}/id-cards`}
                                                className="flex-none sm:flex-1 flex items-center justify-center p-2 sm:px-3 sm:py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-sm text-center gap-1 w-10 sm:w-auto"
                                                title="ID Cards"
                                            >
                                                <span className="material-symbols-outlined text-[18px] sm:text-[16px]">badge</span>
                                                <span className="hidden sm:inline">ID Cards</span>
                                            </Link>

                                            {/* Participants (Orange) - Wider on mobile */}
                                            <Link
                                                to={`/events/${event.id}/participants`}
                                                className="flex-1 flex items-center justify-center p-2 sm:px-3 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-sm text-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[18px] sm:text-[16px]">group</span>
                                                <span>Participants</span>
                                            </Link>

                                            {/* Edit (Teal) - Admin Only */}
                                            {isAdmin && (
                                                <Link
                                                    to={`/events/${event.id}/edit`}
                                                    className="flex-none sm:flex-1 flex items-center justify-center p-2 sm:px-3 sm:py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-sm text-center gap-1 w-10 sm:w-auto"
                                                    title="Edit Event"
                                                >
                                                    <span className="material-symbols-outlined text-[18px] sm:text-[16px]">edit</span>
                                                    <span className="hidden sm:inline">Edit</span>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {filteredEvents.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">event_busy</span>
                                <p>No events found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
