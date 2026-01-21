import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventsAPI } from '../../lib/api'

interface EventFormData {
    title: string
    description: string
    event_date: string
    event_time: string
    location: string
    capacity: string
    event_mode: 'free' | 'paid'
    payment_mode: 'manual' | 'auto'
    whatsapp_cs: string
    visibility: 'public' | 'private'
}

export default function CreateEvent() {
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [images, setImages] = useState<string[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)

    const [formData, setFormData] = useState<EventFormData>({
        title: '',
        description: '',
        event_date: '',
        event_time: '',
        location: '',
        capacity: '',
        event_mode: 'free',
        payment_mode: 'manual',
        whatsapp_cs: '',
        visibility: 'public'
    })

    const updateField = (field: keyof EventFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Image compression and upload
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
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                let width = img.width
                let height = img.height
                const maxWidth = 400

                if (width > maxWidth) {
                    height = (height * maxWidth) / width
                    width = maxWidth
                }

                canvas.width = width
                canvas.height = height
                ctx?.drawImage(img, 0, 0, width, height)

                const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
                setImages(prev => [...prev, dataUrl].slice(0, 3))
                setUploadingImage(false)
                URL.revokeObjectURL(img.src)
            }
            img.onerror = () => {
                setError('Failed to load image')
                setUploadingImage(false)
            }
            img.src = URL.createObjectURL(file)
        } catch {
            setError('Failed to upload image')
            setUploadingImage(false)
        }

        e.target.value = ''
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
    }

    const handleSubmit = async (asDraft: boolean = false) => {
        if (!formData.title || !formData.event_date) {
            setError('Title and date are required')
            return
        }

        setLoading(true)
        setError('')

        try {
            const result = await eventsAPI.create({
                title: formData.title,
                description: formData.description,
                event_date: formData.event_date,
                event_time: formData.event_time,
                location: formData.location,
                capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
                event_mode: formData.event_mode,
                payment_mode: formData.payment_mode,
                whatsapp_cs: formData.whatsapp_cs,
                visibility: formData.visibility,
                status: asDraft ? 'draft' : 'open',
                images: images
            } as Record<string, unknown>)

            navigate(`/events/${result.id}/participants`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-light bg-background-light/80 backdrop-blur-md px-6 py-3 lg:px-10">
                <div className="flex items-center gap-4">
                    <Link to="/events" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h2 className="text-xl font-bold tracking-tight text-text-main">Create New Event</h2>
                </div>
            </header>

            <main className="flex-1 px-4 py-8 md:px-10 lg:px-20">
                <div className="mx-auto max-w-4xl">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    {/* Step Indicator */}
                    <nav className="mb-8 flex items-center justify-center gap-4">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentStep(step)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${currentStep === step
                                        ? 'bg-primary text-white'
                                        : currentStep > step
                                            ? 'bg-green-100 text-green-700'
                                            : 'border border-gray-300 text-gray-400'
                                        }`}
                                >
                                    {currentStep > step ? '✓' : step}
                                </button>
                                <span className={`text-sm font-medium ${currentStep === step ? 'text-primary' : 'text-gray-400'}`}>
                                    {step === 1 ? 'Details' : step === 2 ? 'Settings' : 'Review'}
                                </span>
                                {step < 3 && <div className="w-12 h-px bg-gray-200 mx-2"></div>}
                            </div>
                        ))}
                    </nav>

                    {/* Step 1: Basic Details */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">Event Details</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Event Title *</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => updateField('title', e.target.value)}
                                            placeholder="e.g., Friday Youth Halaqa"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            placeholder="Describe your event..."
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
                                            placeholder="e.g., Masjid Al-Ikhlas, Main Hall"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Capacity (Optional)</label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => updateField('capacity', e.target.value)}
                                            placeholder="Leave empty for unlimited"
                                            min="1"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Settings */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">Event Settings</h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-3">Event Type</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => updateField('event_mode', 'free')}
                                                className={`p-4 rounded-lg border-2 text-left transition-colors ${formData.event_mode === 'free'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-primary mb-2">volunteer_activism</span>
                                                <p className="font-bold">Free Event</p>
                                                <p className="text-sm text-gray-500">No payment required</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('event_mode', 'paid')}
                                                className={`p-4 rounded-lg border-2 text-left transition-colors ${formData.event_mode === 'paid'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-primary mb-2">payments</span>
                                                <p className="font-bold">Paid Event</p>
                                                <p className="text-sm text-gray-500">Requires Midtrans payment</p>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-3">Visibility</label>
                                        <div className="space-y-3">
                                            <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="visibility"
                                                    checked={formData.visibility === 'public'}
                                                    onChange={() => updateField('visibility', 'public')}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <p className="font-medium">Public</p>
                                                    <p className="text-sm text-gray-500">Anyone can find and register</p>
                                                </div>
                                            </label>
                                            <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="visibility"
                                                    checked={formData.visibility === 'private'}
                                                    onChange={() => updateField('visibility', 'private')}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <p className="font-medium">Private</p>
                                                    <p className="text-sm text-gray-500">Only accessible via direct link</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Event Images */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">Event Images (Slider)</h3>
                                    <span className="text-sm text-gray-500">{images.length}/3</span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                                            <img src={img} alt={`Event ${index + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    {images.length < 3 && (
                                        <label className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            {uploadingImage ? (
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-gray-400">add_photo_alternate</span>
                                                    <span className="text-xs text-gray-500 mt-1">Add Image</span>
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">Upload up to 3 images for the event slider. Images will be compressed automatically.</p>
                            </div>

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
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary">chat</span>
                                                        <div>
                                                            <p className="font-medium">Manual (WhatsApp)</p>
                                                            <p className="text-xs text-gray-500">Kirim nota ke WhatsApp CS</p>
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
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary">credit_card</span>
                                                        <div>
                                                            <p className="font-medium">Otomatis (Midtrans)</p>
                                                            <p className="text-xs text-gray-500">Pembayaran online langsung</p>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.payment_mode === 'manual' && (
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
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">Review & Publish</h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">Title</span>
                                        <span className="font-medium">{formData.title || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">Date</span>
                                        <span className="font-medium">{formData.event_date || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">Time</span>
                                        <span className="font-medium">{formData.event_time || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">Location</span>
                                        <span className="font-medium">{formData.location || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">Capacity</span>
                                        <span className="font-medium">{formData.capacity || 'Unlimited'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">Type</span>
                                        <span className="font-medium capitalize">{formData.event_mode}</span>
                                    </div>
                                    <div className="flex justify-between py-3">
                                        <span className="text-gray-500">Visibility</span>
                                        <span className="font-medium capitalize">{formData.visibility}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-8 flex justify-between gap-4">
                        <div>
                            {currentStep > 1 && (
                                <button
                                    onClick={() => setCurrentStep(currentStep - 1)}
                                    className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                                >
                                    Back
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={loading}
                                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                                Save as Draft
                            </button>
                            {currentStep < 3 ? (
                                <button
                                    onClick={() => setCurrentStep(currentStep + 1)}
                                    className="px-8 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover flex items-center gap-2"
                                >
                                    Next
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={loading}
                                    className="px-8 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Publishing...
                                        </>
                                    ) : (
                                        <>
                                            Publish Event
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
