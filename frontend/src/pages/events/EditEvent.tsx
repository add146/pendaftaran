import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { eventsAPI, type Event } from '../../lib/api'

interface TicketType {
    name: string
    price: string
    quota: string
}

export default function EditEvent() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_date: '',
        event_time: '',
        location: '',
        capacity: '',
        event_mode: 'free' as 'free' | 'paid',
        visibility: 'public' as 'public' | 'private',
        status: 'draft' as 'draft' | 'open' | 'closed'
    })

    const [tickets, setTickets] = useState<TicketType[]>([])

    useEffect(() => {
        if (!id) return

        eventsAPI.get(id)
            .then((data: Event & { ticket_types?: { name: string; price: number; quota?: number }[] }) => {
                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    event_date: data.event_date || '',
                    event_time: data.event_time || '',
                    location: data.location || '',
                    capacity: data.capacity?.toString() || '',
                    event_mode: data.event_mode || 'free',
                    visibility: data.visibility || 'public',
                    status: data.status || 'draft'
                })
                if (data.ticket_types) {
                    setTickets(data.ticket_types.map(t => ({
                        name: t.name,
                        price: t.price.toString(),
                        quota: t.quota?.toString() || ''
                    })))
                }
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [id])

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const addTicket = () => {
        setTickets([...tickets, { name: '', price: '0', quota: '' }])
    }

    const updateTicket = (index: number, field: keyof TicketType, value: string) => {
        setTickets(tickets.map((t, i) => i === index ? { ...t, [field]: value } : t))
    }

    const removeTicket = (index: number) => {
        setTickets(tickets.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!formData.title || !formData.event_date) {
            setError('Title and date are required')
            return
        }

        setSaving(true)
        setError('')

        try {
            await eventsAPI.update(id!, {
                title: formData.title,
                description: formData.description,
                event_date: formData.event_date,
                event_time: formData.event_time,
                location: formData.location,
                capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
                event_mode: formData.event_mode,
                visibility: formData.visibility,
                status: formData.status
            })

            navigate('/events')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update event')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-light bg-background-light/80 backdrop-blur-md px-6 py-3">
                <div className="flex items-center gap-4">
                    <Link to="/events" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h2 className="text-xl font-bold">Edit Event</h2>
                </div>
            </header>

            <main className="px-4 py-8 md:px-10 lg:px-20">
                <div className="mx-auto max-w-4xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">Event Details</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Event Title *</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => updateField('title', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Event Date *</label>
                                            <input
                                                type="date"
                                                value={formData.event_date}
                                                onChange={(e) => updateField('event_date', e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Start Time</label>
                                            <input
                                                type="time"
                                                value={formData.event_time}
                                                onChange={(e) => updateField('event_time', e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => updateField('location', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Capacity</label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => updateField('capacity', e.target.value)}
                                            placeholder="Leave empty for unlimited"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Types (for paid events) */}
                            {formData.event_mode === 'paid' && (
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold">Ticket Types (HTM)</h3>
                                        <button
                                            type="button"
                                            onClick={addTicket}
                                            className="flex items-center gap-1 text-primary text-sm font-medium hover:text-primary-hover"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                            Add Ticket
                                        </button>
                                    </div>

                                    {tickets.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">confirmation_number</span>
                                            <p>No tickets added yet</p>
                                            <button
                                                type="button"
                                                onClick={addTicket}
                                                className="mt-2 text-primary text-sm font-medium"
                                            >
                                                Add your first ticket type
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {tickets.map((ticket, index) => (
                                                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <span className="text-sm font-medium text-gray-500">Ticket #{index + 1}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTicket(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Ticket Name</label>
                                                            <input
                                                                type="text"
                                                                value={ticket.name}
                                                                onChange={(e) => updateTicket(index, 'name', e.target.value)}
                                                                placeholder="e.g., Regular"
                                                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Price (Rp)</label>
                                                            <input
                                                                type="number"
                                                                value={ticket.price}
                                                                onChange={(e) => updateTicket(index, 'price', e.target.value)}
                                                                placeholder="50000"
                                                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Quota (optional)</label>
                                                            <input
                                                                type="number"
                                                                value={ticket.quota}
                                                                onChange={(e) => updateTicket(index, 'quota', e.target.value)}
                                                                placeholder="100"
                                                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold mb-4">Settings</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => updateField('status', e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="open">Open</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Event Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateField('event_mode', 'free')}
                                                className={`py-2 rounded-lg text-sm font-medium border ${formData.event_mode === 'free'
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                Free
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('event_mode', 'paid')}
                                                className={`py-2 rounded-lg text-sm font-medium border ${formData.event_mode === 'paid'
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                Paid
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Visibility</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateField('visibility', 'public')}
                                                className={`py-2 rounded-lg text-sm font-medium border ${formData.visibility === 'public'
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                Public
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('visibility', 'private')}
                                                className={`py-2 rounded-lg text-sm font-medium border ${formData.visibility === 'private'
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                Private
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">save</span>
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
