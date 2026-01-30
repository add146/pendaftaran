import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventsAPI, uploadAPI, settingsAPI } from '../../lib/api'
import { useTranslation } from 'react-i18next'

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
    bank_name: string
    account_holder_name: string
    account_number: string
    visibility: 'public' | 'private'
    event_type: 'offline' | 'online' | 'hybrid'
    online_platform?: 'google_meet' | 'zoom' | 'youtube' | 'custom'
    online_url?: string
    online_password?: string
    online_instructions?: string
    note?: string
    icon_type?: 'info' | 'warning' | 'danger'
}

export default function CreateEvent() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [images, setImages] = useState<string[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)
    const [hasMidtransProdKeys, setHasMidtransProdKeys] = useState(false)

    useEffect(() => {
        const checkKeys = async () => {
            try {
                const data = await settingsAPI.get('midtrans_config')
                if (data && data.value) {
                    const config = data.value
                    const hasKeys = !!config.production_server_key && !!config.production_client_key
                    setHasMidtransProdKeys(hasKeys)
                }
            } catch (err) {
                console.error('Failed to fetch midtrans config', err)
            }
        }
        checkKeys()
    }, [])

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
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        visibility: 'public',
        event_type: 'offline',
        online_platform: 'google_meet',
        online_url: '',
        online_password: '',
        online_instructions: '',
        note: '',
        icon_type: 'info'
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
            const result = await uploadAPI.uploadImage(file)
            setImages(prev => [...prev, result.url].slice(0, 3))
            setUploadingImage(false)
        } catch (err: any) {
            console.error('Upload error:', err)
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
                bank_name: formData.bank_name,
                account_holder_name: formData.account_holder_name,
                account_number: formData.account_number,
                visibility: formData.visibility,
                status: asDraft ? 'draft' : 'open',
                images: images,
                event_type: formData.event_type,
                online_platform: formData.event_type !== 'offline' ? formData.online_platform : undefined,
                online_url: formData.event_type !== 'offline' ? formData.online_url : undefined,
                online_password: formData.event_type !== 'offline' ? formData.online_password : undefined,
                online_instructions: formData.event_type !== 'offline' ? formData.online_instructions : undefined,
                note: formData.note,
                icon_type: formData.icon_type
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
                    <h2 className="text-xl font-bold tracking-tight text-text-main">{t('edit_event.create_title')}</h2>
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
                                    {step === 1 ? t('admin.event_form.steps.details') : step === 2 ? t('admin.event_form.steps.settings') : t('admin.event_form.steps.review')}
                                </span>
                                {step < 3 && <div className="w-12 h-px bg-gray-200 mx-2"></div>}
                            </div>
                        ))}
                    </nav>

                    {/* Step 1: Basic Details */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">{t('admin.event_form.sections.details')}</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.title')} *</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => updateField('title', e.target.value)}
                                            placeholder="e.g., Friday Youth Halaqa"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.description')}</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            placeholder={t('admin.event_form.placeholders.description') || "Describe your event..."}
                                            rows={4}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none bg-white text-gray-900"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.date')} *</label>
                                            <input
                                                type="date"
                                                value={formData.event_date}
                                                onChange={(e) => updateField('event_date', e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.time')}</label>
                                            <input
                                                type="time"
                                                value={formData.event_time}
                                                onChange={(e) => updateField('event_time', e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.location')}</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => updateField('location', e.target.value)}
                                            placeholder="e.g., Masjid Al-Ikhlas, Main Hall"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.capacity')}</label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => updateField('capacity', e.target.value)}
                                            placeholder={t('admin.event_form.placeholders.leave_empty')}
                                            min="1"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
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
                                <h3 className="text-lg font-bold mb-4">{t('admin.event_form.sections.settings')}</h3>

                                <div className="space-y-6">
                                    {/* Event Format */}
                                    <div>
                                        <label className="block text-sm font-medium mb-3">{t('admin.event_form.labels.event_format')}</label>
                                        <div className="grid grid-cols-3 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => updateField('event_type', 'offline')}
                                                className={`p-4 rounded-lg border-2 text-left transition-colors ${formData.event_type === 'offline'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-primary mb-2">location_on</span>
                                                <p className="font-bold">Offline</p>
                                                <p className="text-xs text-gray-500">In-person at a venue</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('event_type', 'online')}
                                                className={`p-4 rounded-lg border-2 text-left transition-colors ${formData.event_type === 'online'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-primary mb-2">videocam</span>
                                                <p className="font-bold">{t('admin.event_form.options.online')}</p>
                                                <p className="text-xs text-gray-500">{t('registration.online_desc')}</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('event_type', 'hybrid')}
                                                className={`p-4 rounded-lg border-2 text-left transition-colors ${formData.event_type === 'hybrid'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-primary mb-2">hub</span>
                                                <p className="font-bold">{t('admin.event_form.options.hybrid')}</p>
                                                <p className="text-xs text-gray-500">{t('admin.event_form.options.hybrid')}</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Online Details */}
                                    {formData.event_type !== 'offline' && (
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-4">
                                            <h4 className="font-bold text-blue-900 flex items-center gap-2">
                                                <span className="material-symbols-outlined">videocam</span>
                                                {t('admin.event_form.sections.online')}
                                            </h4>

                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-blue-900">{t('admin.event_form.labels.platform')}</label>
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
                                                <label className="block text-sm font-medium mb-2 text-blue-900">{t('admin.event_form.labels.url')}</label>
                                                <input
                                                    type="url"
                                                    value={formData.online_url || ''}
                                                    onChange={(e) => updateField('online_url', e.target.value)}
                                                    placeholder={t('admin.event_form.placeholders.url')}
                                                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-primary focus:ring-1 focus:ring-primary"
                                                />
                                                <p className="text-xs text-blue-700 mt-1">{t('ticket.save_page_online')}</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 text-blue-900">{t('admin.event_form.labels.password')}</label>
                                                    <input
                                                        type="text"
                                                        value={formData.online_password || ''}
                                                        onChange={(e) => updateField('online_password', e.target.value)}
                                                        placeholder={t('admin.event_form.placeholders.password')}
                                                        className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-primary focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-blue-900">{t('admin.event_form.labels.instructions')}</label>
                                                <textarea
                                                    value={formData.online_instructions || ''}
                                                    onChange={(e) => updateField('online_instructions', e.target.value)}
                                                    placeholder={t('admin.event_form.placeholders.instructions')}
                                                    rows={2}
                                                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium mb-3">{t('admin.event_form.labels.pricing_model')}</label>
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
                                                <p className="font-bold">{t('admin.event_form.options.free')}</p>
                                                <p className="text-sm text-gray-500">{t('event.free_event')}</p>
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
                                                <p className="font-bold">{t('admin.event_form.options.paid')}</p>
                                                <p className="text-sm text-gray-500">{t('event.paid_event')}</p>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-3">{t('admin.event_form.labels.visibility')}</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => updateField('visibility', 'public')}
                                                className={`p-4 rounded-lg border-2 text-left transition-all ${formData.visibility === 'public' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <span className="material-symbols-outlined text-primary mb-2">public</span>
                                                <p className="font-bold">{t('admin.event_form.options.public')}</p>
                                                <p className="text-sm text-gray-500">Anyone can find and register</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('visibility', 'private')}
                                                className={`p-4 rounded-lg border-2 text-left transition-all ${formData.visibility === 'private' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <span className="material-symbols-outlined text-primary mb-2">lock</span>
                                                <p className="font-bold">{t('admin.event_form.options.private')}</p>
                                                <p className="text-sm text-gray-500">Only accessible via direct link</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Event Images */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">{t('admin.event_form.sections.images')}</h3>
                                    <span className="text-sm text-gray-500">{images.length}/3</span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative aspect-[4/5] rounded-lg overflow-hidden border border-gray-200">
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
                                        <label className="aspect-[4/5] rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            {uploadingImage ? (
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-gray-400">add_photo_alternate</span>
                                                    <span className="text-xs text-gray-500 mt-1">{t('admin.event_form.buttons.add_image')}</span>
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">{t('admin.event_form.hints.upload_size')}</p>

                            </div>

                            {/* Additional Info (Note & Icon) */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">{t('admin.event_form.sections.additional')}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.note')}</label>
                                        <textarea
                                            value={formData.note || ''}
                                            onChange={(e) => updateField('note', e.target.value)}
                                            placeholder={t('admin.event_form.placeholders.note')}
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none bg-white text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.icon_type')}</label>
                                        <div className="flex gap-4">
                                            {['info', 'warning', 'danger'].map((type) => (
                                                <label key={type} className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-colors ${formData.icon_type === type
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}>
                                                    <input
                                                        type="radio"
                                                        name="icon_type"
                                                        value={type}
                                                        checked={formData.icon_type === type}
                                                        onChange={() => updateField('icon_type', type)}
                                                        className="hidden"
                                                    />
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`material-symbols-outlined ${type === 'info' ? 'text-blue-500' : type === 'warning' ? 'text-orange-500' : 'text-red-500'
                                                            }`}>
                                                            {type === 'info' ? 'info' : type === 'warning' ? 'warning' : 'error'}
                                                        </span>
                                                        <span className="capitalize font-medium text-sm">{type}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Settings (for paid events) */}
                            {formData.event_mode === 'paid' && (
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold mb-4">{t('admin.event_form.sections.payment')}</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.payment_mode')}</label>
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
                                                            <p className="font-medium">{t('admin.event_form.options.manual')}</p>
                                                            <p className="text-xs text-gray-500">{t('admin.event_form.hints.manual_payment')}</p>
                                                        </div>
                                                    </div>
                                                </label>
                                                <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${formData.payment_mode === 'auto' ? 'border-primary bg-primary/5' : 'border-gray-200'} ${!hasMidtransProdKeys ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name="payment_mode"
                                                        value="auto"
                                                        checked={formData.payment_mode === 'auto'}
                                                        onChange={() => updateField('payment_mode', 'auto')}
                                                        disabled={!hasMidtransProdKeys}
                                                        className="hidden"
                                                    />
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary">credit_card</span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{t('admin.event_form.options.auto')}</p>
                                                                {!hasMidtransProdKeys && (
                                                                    <span className="material-symbols-outlined text-amber-500 text-[16px] animate-pulse" title="Production Keys Required">warning</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">Pembayaran online langsung</p>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                            {!hasMidtransProdKeys && (
                                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                                    {t('admin.event_form.messages.production_keys_required')} (Go to Settings to enable)
                                                </p>
                                            )}
                                        </div>

                                        {formData.payment_mode === 'manual' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.whatsapp_cs')} *</label>
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
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{t('admin.event_form.hints.whatsapp_cs')}</p>

                                                <div className="pt-4 border-t border-gray-200">
                                                    <h4 className="font-medium mb-3 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[20px]">account_balance</span>
                                                        {t('admin.event_form.form.bank_info')}
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">{t('admin.event_form.labels.bank_name')} *</label>
                                                            <input
                                                                type="text"
                                                                value={formData.bank_name}
                                                                onChange={(e) => updateField('bank_name', e.target.value)}
                                                                placeholder="contoh: BCA, Mandiri, BRI"
                                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">{t('admin.event_form.labels.account_holder')} *</label>
                                                            <input
                                                                type="text"
                                                                value={formData.account_holder_name}
                                                                onChange={(e) => updateField('account_holder_name', e.target.value)}
                                                                placeholder={t('admin.event_form.placeholders.account_holder')}
                                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">{t('admin.event_form.labels.account_number')} *</label>
                                                            <input
                                                                type="text"
                                                                value={formData.account_number}
                                                                onChange={(e) => updateField('account_number', e.target.value)}
                                                                placeholder={t('admin.event_form.placeholders.account_number')}
                                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Informasi ini akan ditampilkan ke peserta untuk transfer manual</p>
                                                </div>
                                            </>
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
                                <h3 className="text-lg font-bold mb-4">{t('admin.event_form.review.title')}</h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">{t('admin.event_form.labels.title')}</span>
                                        <span className="font-medium">{formData.title || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">{t('admin.event_form.labels.date')}</span>
                                        <span className="font-medium">{formData.event_date || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">{t('admin.event_form.labels.time')}</span>
                                        <span className="font-medium">{formData.event_time || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">{t('admin.event_form.labels.location')}</span>
                                        <span className="font-medium">{formData.location || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">{t('admin.event_form.labels.capacity')}</span>
                                        <span className="font-medium">{formData.capacity || 'Unlimited'}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">{t('admin.event_form.labels.event_format')}</span>
                                        <div className="text-right">
                                            <span className="font-medium capitalize block">{formData.event_type}</span>
                                            {formData.event_type !== 'offline' && (
                                                <span className="text-xs text-blue-600 block">{formData.online_platform}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-500">{t('admin.event_form.labels.pricing_model')}</span>
                                        <span className="font-medium capitalize">{formData.event_mode}</span>
                                    </div>
                                    <div className="flex justify-between py-3">
                                        <span className="text-gray-500">{t('admin.event_form.labels.visibility')}</span>
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
                                    {t('admin.event_form.buttons.back')}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={loading}
                                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                                {t('admin.event_form.buttons.save_draft')}
                            </button>
                            {currentStep < 3 ? (
                                <button
                                    onClick={() => setCurrentStep(currentStep + 1)}
                                    className="px-8 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover flex items-center gap-2"
                                >
                                    {t('admin.event_form.buttons.next')}
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
                                            {t('admin.event_form.buttons.publishing')}
                                        </>
                                    ) : (
                                        <>
                                            {t('admin.event_form.buttons.publish')}
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main >
        </div >
    )
}
