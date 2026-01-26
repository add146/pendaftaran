import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { eventsAPI, uploadAPI, type Event } from '../../lib/api'
import CustomFieldsEditor from '../../components/CustomFieldsEditor'

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
        payment_mode: 'manual' as 'manual' | 'auto',
        whatsapp_cs: '',
        bank_name: '',
        account_holder_name: '',
        account_number: '',

        visibility: 'public' as 'public' | 'private',
        status: 'draft' as 'draft' | 'open' | 'closed',
        event_type: 'offline' as 'offline' | 'online' | 'hybrid',
        online_platform: 'google_meet' as 'google_meet' | 'zoom' | 'youtube' | 'custom',
        online_url: '',
        online_password: '',
        online_instructions: ''
    })

    const [tickets, setTickets] = useState<TicketType[]>([])
    const [images, setImages] = useState<string[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        if (images.length >= 3) {
            setError('Maximum 3 images allowed')
            return
        }

        setUploadingImage(true)
        const file = files[0]

        try {
            const result = await uploadAPI.uploadImage(file)
            setImages(prev => [...prev, result.url].slice(0, 3))
            setUploadingImage(false)
        } catch (err: any) {
            console.error('Upload error:', err)
            setError('Failed to upload image')
            setUploadingImage(false)
        }

        // Reset input
        e.target.value = ''
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
    }

    useEffect(() => {
        if (!id) return

        eventsAPI.get(id)
            .then((data: Event & { ticket_types?: { name: string; price: number; quota?: number }[]; payment_mode?: string; whatsapp_cs?: string; bank_name?: string; account_holder_name?: string; account_number?: string }) => {
                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    event_date: data.event_date || '',
                    event_time: data.event_time || '',
                    location: data.location || '',
                    capacity: data.capacity?.toString() || '',
                    event_mode: data.event_mode || 'free',
                    payment_mode: (data.payment_mode as 'manual' | 'auto') || 'manual',
                    whatsapp_cs: data.whatsapp_cs || '',
                    bank_name: data.bank_name || '',
                    account_holder_name: data.account_holder_name || '',
                    account_number: data.account_number || '',

                    visibility: data.visibility || 'public',
                    status: data.status || 'draft',
                    event_type: data.event_type || 'offline',
                    online_platform: (data.online_platform as any) || 'google_meet',
                    online_url: data.online_url || '',
                    online_password: data.online_password || '',
                    online_instructions: data.online_instructions || ''
                })
                if (data.ticket_types) {
                    setTickets(data.ticket_types.map(t => ({
                        name: t.name,
                        price: t.price.toString(),
                        quota: t.quota?.toString() || ''
                    })))
                }
                // Load images from image_url (stored as JSON array)
                if (data.image_url) {
                    try {
                        const imgArray = JSON.parse(data.image_url)
                        if (Array.isArray(imgArray)) {
                            setImages(imgArray)
                        }
                    } catch {
                        // Single URL fallback
                        setImages([data.image_url])
                    }
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
                payment_mode: formData.payment_mode,
                whatsapp_cs: formData.whatsapp_cs,
                bank_name: formData.bank_name,
                account_holder_name: formData.account_holder_name,
                account_number: formData.account_number,
                visibility: formData.visibility,
                status: formData.status,
                images: images,
                ticket_types: tickets,
                event_type: formData.event_type,
                online_platform: formData.event_type !== 'offline' ? formData.online_platform : undefined,
                online_url: formData.event_type !== 'offline' ? formData.online_url : undefined,
                online_password: formData.event_type !== 'offline' ? formData.online_password : undefined,
                online_instructions: formData.event_type !== 'offline' ? formData.online_instructions : undefined
            } as Record<string, unknown>)

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
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none bg-white text-gray-900"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Event Date *</label>
                                            <input
                                                type="date"
                                                value={formData.event_date}
                                                onChange={(e) => updateField('event_date', e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Start Time</label>
                                            <input
                                                type="time"
                                                value={formData.event_time}
                                                onChange={(e) => updateField('event_time', e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => updateField('location', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Capacity</label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => updateField('capacity', e.target.value)}
                                            placeholder="Leave empty for unlimited"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Online Details */}
                            {formData.event_type !== 'offline' && (
                                <div className="bg-blue-50 rounded-xl p-6 shadow-sm border border-blue-100 space-y-4">
                                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                        <span className="material-symbols-outlined">videocam</span>
                                        Online Event Details
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-blue-900">Platform</label>
                                        <select
                                            value={formData.online_platform}
                                            onChange={(e) => updateField('online_platform', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                                        >
                                            <option value="google_meet">Google Meet</option>
                                            <option value="zoom">Zoom</option>
                                            <option value="youtube">YouTube Live</option>
                                            <option value="custom">Other / Custom</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-blue-900">Meeting URL (Optional)</label>
                                        <input
                                            type="url"
                                            value={formData.online_url || ''}
                                            onChange={(e) => updateField('online_url', e.target.value)}
                                            placeholder="https://meet.google.com/..."
                                            className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-blue-900">Password (Optional)</label>
                                            <input
                                                type="text"
                                                value={formData.online_password || ''}
                                                onChange={(e) => updateField('online_password', e.target.value)}
                                                placeholder="Meeting passcode"
                                                className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-blue-900">Joining Instructions</label>
                                        <textarea
                                            value={formData.online_instructions || ''}
                                            onChange={(e) => updateField('online_instructions', e.target.value)}
                                            placeholder="e.g. Please join 10 minutes early..."
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Event Images Slider */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">Event Images (Slider)</h3>
                                    <span className="text-sm text-gray-500">{images.length}/3</span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 group">
                                            <img src={img} alt={`Event ${index + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center">
                                                Image {index + 1}
                                            </div>
                                        </div>
                                    ))}

                                    {images.length < 3 && (
                                        <label className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                            {uploadingImage ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-gray-400 text-[32px]">add_photo_alternate</span>
                                                    <span className="text-xs text-gray-500 mt-1">Add Image</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>

                                <p className="text-xs text-gray-500">Upload up to 3 images for the event slider. Recommended size: 1200x600px</p>
                            </div>

                            {/* Custom Form Fields */}
                            {id && <CustomFieldsEditor eventId={id} />}

                            {/* Payment Settings (for paid events) */}
                            {formData.event_mode === 'paid' && (
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold mb-4">Payment Settings</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Payment Mode</label>
                                            <div className="flex gap-4">
                                                <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${formData.payment_mode === 'manual' ? 'border-primary bg-primary/5' : 'border-gray-200'
                                                    }`}>
                                                    <input
                                                        type="radio"
                                                        name="payment_mode"
                                                        value="manual"
                                                        checked={formData.payment_mode === 'manual'}
                                                        onChange={() => updateField('payment_mode', 'manual')}
                                                        className="hidden"
                                                    />
                                                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center md:text-left">
                                                        <span className="material-symbols-outlined text-primary text-[28px] md:text-[24px]">chat</span>
                                                        <div>
                                                            <p className="font-medium text-sm md:text-base">Manual (WhatsApp)</p>
                                                            <p className="text-[10px] md:text-xs text-gray-500">Kirim nota ke WhatsApp CS</p>
                                                        </div>
                                                    </div>
                                                </label>
                                                <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${formData.payment_mode === 'auto' ? 'border-primary bg-primary/5' : 'border-gray-200'
                                                    }`}>
                                                    <input
                                                        type="radio"
                                                        name="payment_mode"
                                                        value="auto"
                                                        checked={formData.payment_mode === 'auto'}
                                                        onChange={() => updateField('payment_mode', 'auto')}
                                                        className="hidden"
                                                    />
                                                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center md:text-left">
                                                        <span className="material-symbols-outlined text-primary text-[28px] md:text-[24px]">credit_card</span>
                                                        <div>
                                                            <p className="font-medium text-sm md:text-base">Otomatis (Midtrans)</p>
                                                            <p className="text-[10px] md:text-xs text-gray-500">Pembayaran online langsung</p>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.payment_mode === 'manual' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">WhatsApp CS Number *</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">+62</span>
                                                        <input
                                                            type="tel"
                                                            value={formData.whatsapp_cs}
                                                            onChange={(e) => updateField('whatsapp_cs', e.target.value)}
                                                            placeholder="81234567890"
                                                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">Nomor ini akan menerima nota pembayaran dari pendaftar</p>
                                                </div>

                                                <div className="border-t border-gray-200 pt-4">
                                                    <h4 className="font-medium text-sm mb-3">Informasi Rekening Bank</h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Nama Bank *</label>
                                                            <input
                                                                type="text"
                                                                value={formData.bank_name}
                                                                onChange={(e) => updateField('bank_name', e.target.value)}
                                                                placeholder="e.g., BCA, Mandiri, BRI"
                                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Atas Nama *</label>
                                                            <input
                                                                type="text"
                                                                value={formData.account_holder_name}
                                                                onChange={(e) => updateField('account_holder_name', e.target.value)}
                                                                placeholder="Nama pemilik rekening"
                                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Nomor Rekening *</label>
                                                            <input
                                                                type="text"
                                                                value={formData.account_number}
                                                                onChange={(e) => updateField('account_number', e.target.value)}
                                                                placeholder="1234567890"
                                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Informasi rekening untuk transfer manual</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                        <label className="block text-sm font-medium mb-2">Event Format</label>
                                        <select
                                            value={formData.event_type}
                                            onChange={(e) => updateField('event_type', e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary mb-3"
                                        >
                                            <option value="offline">Offline</option>
                                            <option value="online">Online</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Pricing Model</label>
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
            </main >
        </div >
    )
}
