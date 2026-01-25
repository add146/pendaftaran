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
            year: 'numeric',
            timeZone: 'Asia/Jakarta'
        })
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
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
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
                                <div key={event.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Event Image */}
                                    <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                                        {eventImage ? (
                                            <img src={eventImage} alt={event.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[48px] text-primary/40">event</span>
                                        )}
                                    </div>

                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.status === 'open' ? 'bg-green-100 text-green-800' :
                                                event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-lg text-text-main mb-2 line-clamp-2">{event.title}</h3>

                                        <div className="space-y-2 text-sm text-gray-500 mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                                {formatDate(event.event_date)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">location_on</span>
                                                {event.location || 'TBA'}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/event/${event.slug || event.id}`
                                                    navigator.clipboard.writeText(url)
                                                    alert('Link copied: ' + url)
                                                }}
                                                className="flex-1 text-center py-2.5 px-3 text-primary text-sm font-semibold bg-white border border-primary/30 hover:bg-primary hover:text-white hover:border-primary rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">share</span>
                                                Share
                                            </button>
                                            {isAdmin && (
                                                <Link
                                                    to={`/events/${event.id}/edit`}
                                                    className="flex-1 text-center py-2.5 px-3 text-primary text-sm font-semibold bg-white border border-primary/30 hover:bg-primary hover:text-white hover:border-primary rounded-lg transition-all shadow-sm hover:shadow-md"
                                                >
                                                    Edit
                                                </Link>
                                            )}
                                            <Link
                                                to={`/events/${event.id}/participants`}
                                                className="flex-1 text-center py-2.5 px-3 text-primary text-sm font-semibold bg-white border border-primary/30 hover:bg-primary hover:text-white hover:border-primary rounded-lg transition-all shadow-sm hover:shadow-md"
                                            >
                                                Participants
                                            </Link>
                                            {isAdmin && (
                                                <Link
                                                    to={`/events/${event.id}/id-cards`}
                                                    className="flex-1 text-center py-2.5 px-3 text-primary text-sm font-semibold bg-white border border-primary/30 hover:bg-primary hover:text-white hover:border-primary rounded-lg transition-all shadow-sm hover:shadow-md"
                                                >
                                                    ID Cards
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
