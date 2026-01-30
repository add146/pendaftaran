import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
    const { t } = useTranslation()
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
        if (!confirm(t('admin.events.delete_confirm_title', { title }) + '\n' + t('admin.events.delete_confirm'))) return

        try {
            await eventsAPI.delete(id)
            setEvents(prev => prev.filter(e => e.id !== id))
        } catch (err) {
            console.error(err)
            alert(t('admin.events.delete_error'))
        }
    }


    const handleToggleStatus = async (id: string, currentStatus: string, title: string) => {
        const isClosed = currentStatus === 'closed'
        const newStatus = isClosed ? 'open' : 'closed'
        const action = isClosed ? t('admin.events.confirm_open') : t('admin.events.confirm_close')

        if (!confirm(t('admin.events.confirm_status_title', { action, title }))) return

        try {
            await eventsAPI.update(id, {
                status: newStatus,
                // If re-opening, disable auto-close to prevent it from closing again immediately if past time
                auto_close: isClosed ? 0 : undefined
            })
            setEvents(prev => prev.map(e => {
                if (e.id === id) {
                    return { ...e, status: newStatus as 'open' | 'closed' | 'draft' }
                }
                return e
            }))
        } catch (err) {
            console.error(err)
            alert(t('admin.events.status_error'))
        }
    }

    return (
        <AdminLayout title={t('admin.events.title')} currentPage="events">
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
                                {t(`admin.events.filter.${status}`)}
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
                            {t('admin.events.create')}
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
                                            <img
                                                src={eventImage}
                                                alt={event.title}
                                                className={`w-full h-full object-cover ${event.status === 'closed' ? 'grayscale' : ''}`}
                                            />
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
                                                    alert(t('admin.events.share_success') + url)
                                                }}
                                                className="bg-white text-primary px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">share</span>
                                                {t('admin.events.table.share')}
                                            </button>
                                        </div>

                                        {isAdmin && (
                                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                                {/* Toggle Status Button */}
                                                <button
                                                    onClick={() => handleToggleStatus(event.id, event.status, event.title)}
                                                    className={`w-9 h-9 rounded-lg shadow-sm hover:shadow-md flex items-center justify-center transition-all active:scale-95 ${event.status === 'closed'
                                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                                                        }`}
                                                    title={event.status === 'closed' ? t('admin.events.filter.open') : t('admin.events.filter.closed')}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        {event.status === 'closed' ? 'lock_open' : 'block'}
                                                    </span>
                                                </button>


                                                <button
                                                    onClick={() => handleDelete(event.id, event.title)}
                                                    className="bg-red-600 text-white w-9 h-9 rounded-lg shadow-sm hover:shadow-md flex items-center justify-center transition-all active:scale-95 hover:bg-red-700"
                                                    title={t('common.delete')}
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
                                                {t(`admin.events.filter.${event.status}`)}
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
                                            {/* Participants (Orange) - Wider on mobile */}
                                            <Link
                                                to={`/events/${event.id}/participants`}
                                                className="flex-[7] flex items-center justify-center p-2 sm:px-3 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-sm text-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[18px] sm:text-[16px]">group</span>
                                                <span>{t('admin.events.table.participants')}</span>
                                            </Link>

                                            {/* Edit (Blue) - Admin Only */}
                                            {isAdmin && (
                                                <Link
                                                    to={`/events/${event.id}/edit`}
                                                    className="flex-[3] flex items-center justify-center p-2 sm:px-3 sm:py-2 bg-green-100 text-green-800 hover:bg-green-200 text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-sm text-center gap-1"
                                                    title={t('common.edit')}
                                                >
                                                    <span className="material-symbols-outlined text-[18px] sm:text-[16px]">edit</span>
                                                    <span>{t('common.edit')}</span>
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
                                <p>{t('dashboard.no_events')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
