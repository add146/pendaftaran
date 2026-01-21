import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI, participantsAPI, type PublicEvent, type TicketType } from '../../lib/api'

export default function EventRegistration() {
    const { slug } = useParams<{ slug: string }>()
    const [event, setEvent] = useState<(PublicEvent & { ticket_types: TicketType[]; registration_available: boolean }) | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [registrationId, setRegistrationId] = useState('')

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        ticket_type_id: ''
    })

    useEffect(() => {
        if (!slug) return

        publicAPI.event(slug)
            .then(data => {
                setEvent(data)
                // Set default ticket if available
                if (data.ticket_types && data.ticket_types.length > 0) {
                    setFormData(prev => ({ ...prev, ticket_type_id: data.ticket_types[0].id }))
                }
                setLoading(false)
            })
            .catch(err => {
                setError(err.message || 'Event not found')
                setLoading(false)
            })
    }, [slug])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!event) return

        if (!formData.full_name || !formData.email) {
            setError('Name and email are required')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            const result = await participantsAPI.register({
                event_id: event.id,
                ticket_type_id: formData.ticket_type_id || undefined,
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone || undefined
            })
            setRegistrationId(result.registration_id)
            setSuccess(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed')
        } finally {
            setSubmitting(false)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    // Parse event image
    const getEventImage = () => {
        if (!event?.image_url) return null
        try {
            const imgs = JSON.parse(event.image_url)
            return Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : event.image_url
        } catch {
            return event.image_url
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error && !event) {
        return (
            <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-4">
                <span className="material-symbols-outlined text-[64px] text-gray-300 mb-4">event_busy</span>
                <h1 className="text-2xl font-bold text-gray-700 mb-2">Event Not Found</h1>
                <p className="text-gray-500 mb-4">{error}</p>
                <Link to="/" className="text-primary hover:underline">Back to Home</Link>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="size-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-[40px] text-green-600">check_circle</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h1>
                    <p className="text-gray-600 mb-4">Thank you for registering for <strong>{event?.title}</strong></p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500">Your Registration ID</p>
                        <p className="text-lg font-mono font-bold text-primary">{registrationId}</p>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">
                        A confirmation email has been sent to <strong>{formData.email}</strong>
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover"
                    >
                        <span className="material-symbols-outlined text-[20px]">home</span>
                        Back to Home
                    </Link>
                </div>
            </div>
        )
    }

    const eventImage = getEventImage()

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-border-light bg-white px-6 py-4 sticky top-0 z-50">
                <Link to="/" className="flex items-center gap-3">
                    <div className="size-8 text-primary">
                        <span className="material-symbols-outlined text-[32px]">confirmation_number</span>
                    </div>
                    <h2 className="text-lg font-bold">Pendaftaran QR</h2>
                </Link>
            </header>

            <main className="flex-grow">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Event Details */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Hero Image */}
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-primary/30 to-primary/10">
                                {eventImage ? (
                                    <img src={eventImage} alt={event?.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[80px] text-primary/30">event</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-6">
                                    <span className={`inline-block px-3 py-1 text-white text-xs font-bold uppercase tracking-wider rounded-full mb-3 ${event?.event_mode === 'paid' ? 'bg-amber-500' : 'bg-green-500'
                                        }`}>
                                        {event?.event_mode === 'paid' ? 'Paid Event' : 'Free Event'}
                                    </span>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                                        {event?.title}
                                    </h1>
                                </div>
                            </div>

                            {/* Event Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined">calendar_month</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Date & Time</p>
                                        <p className="font-semibold">{event?.event_date ? formatDate(event.event_date) : '-'}</p>
                                        <p className="text-sm text-gray-500">{event?.event_time || 'Time TBA'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
                                        <p className="font-semibold">{event?.location || 'Location TBA'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {event?.description && (
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-bold mb-3">About This Event</h3>
                                    <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Registration Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 sticky top-24">
                                <h3 className="text-xl font-bold mb-6">Register Now</h3>

                                {!event?.registration_available ? (
                                    <div className="text-center py-8">
                                        <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">event_busy</span>
                                        <p className="text-gray-500">Registration is closed</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                                {error}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Email *</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="Enter your email"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="Enter your phone number"
                                            />
                                        </div>

                                        {/* Ticket Types for paid events */}
                                        {event?.event_mode === 'paid' && event.ticket_types && event.ticket_types.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Select Ticket</label>
                                                <div className="space-y-2">
                                                    {event.ticket_types.map(ticket => (
                                                        <label
                                                            key={ticket.id}
                                                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${formData.ticket_type_id === ticket.id
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="radio"
                                                                    name="ticket"
                                                                    value={ticket.id}
                                                                    checked={formData.ticket_type_id === ticket.id}
                                                                    onChange={() => setFormData(prev => ({ ...prev, ticket_type_id: ticket.id }))}
                                                                    className="w-4 h-4 text-primary"
                                                                />
                                                                <span className="font-medium">{ticket.name}</span>
                                                            </div>
                                                            <span className="font-bold text-primary">
                                                                Rp {ticket.price.toLocaleString('id-ID')}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full py-4 rounded-lg bg-primary text-white font-bold text-lg hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined">how_to_reg</span>
                                                    Register
                                                </>
                                            )}
                                        </button>

                                        {event?.capacity && (
                                            <p className="text-center text-sm text-gray-500">
                                                {event.registered_count} / {event.capacity} registered
                                            </p>
                                        )}
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-white py-6">
                <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
                    Powered by <span className="font-semibold text-primary">Pendaftaran QR</span>
                </div>
            </footer>
        </div>
    )
}
