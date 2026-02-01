import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { eventsAPI, uploadAPI, settingsAPI, type Event, type BulkDiscount } from '../../lib/api'
import CustomFieldsEditor from '../../components/CustomFieldsEditor'
import CertificateEditor from '../../components/CertificateEditor'
import IDCardEditor from '../../components/IDCardEditor'
import { useSearchParams } from 'react-router-dom'

interface TicketType {
    name: string
    price: string
    quota: string
}

export default function EditEvent() {
    const { t } = useTranslation()
    const { id } = useParams<{ id: string }>()
    // const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [showSuccess, setShowSuccess] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_date: '',
        event_time: '',
        location: '',
        location_map_url: '',
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
        online_instructions: '',
        note: '',
        icon_type: 'info' as 'info' | 'warning' | 'danger',
        certificate_config: null as any,
        donation_enabled: 0,
        donation_min_amount: '',
        donation_description: ''

    })

    const [tickets, setTickets] = useState<TicketType[]>([])
    const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscount[]>([])
    const [images, setImages] = useState<string[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        if (images.length >= 3) {
            setError(t('admin.event_form.messages.max_images'))
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
            setError(t('admin.event_form.messages.upload_error'))
            setUploadingImage(false)
        }

        // Reset input
        e.target.value = ''
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
    }

    // Midtrans check
    const [_midtransConfig, setMidtransConfig] = useState<{ production_server_key?: string; production_client_key?: string } | null>(null)
    const [hasMidtransProdKeys, setHasMidtransProdKeys] = useState(false)

    useEffect(() => {
        // Load Midtrans settings to check for production keys
        settingsAPI.get('midtrans_config')
            .then(data => {
                if (data && data.value) {
                    const config = data.value
                    setMidtransConfig(config)
                    // Check if production keys are filled
                    const hasKeys = !!config.production_server_key && !!config.production_client_key
                    setHasMidtransProdKeys(hasKeys)
                    // console.log('[DEBUG] Midtrans Production Keys status:', hasKeys)
                }
            })
            .catch(err => {
                console.warn('Failed to check Midtrans config:', err)
            })

        if (!id) return

        eventsAPI.get(id)
            .then((data: Event & { ticket_types?: { name: string; price: number; quota?: number }[]; payment_mode?: string; whatsapp_cs?: string; bank_name?: string; account_holder_name?: string; account_number?: string }) => {
                console.log('[DEBUG] EditEvent loaded data:', data)
                console.log('[DEBUG] Raw API Data:', data)
                console.log('[DEBUG] event_type from API:', data.event_type)

                const newFormData = {
                    title: data.title || '',
                    description: data.description || '',
                    event_date: data.event_date || '',
                    event_time: data.event_time || '',
                    location: data.location || '',
                    location_map_url: data.location_map_url || '',
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
                    online_instructions: data.online_instructions || '',
                    note: data.note || '',
                    icon_type: (data.icon_type as 'info' | 'warning' | 'danger') || 'info',
                    certificate_config: data.certificate_config ? JSON.parse(data.certificate_config) : null,
                    donation_enabled: data.donation_enabled || 0,
                    donation_min_amount: data.donation_min_amount?.toString() || '',
                    donation_description: data.donation_description || ''

                }
                console.log('[DEBUG] Setting FormData:', newFormData)
                setFormData(newFormData)
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
                if (data.bulk_discounts) {
                    setBulkDiscounts(data.bulk_discounts)
                }
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [id])

    const updateField = (field: string, value: any) => {
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

    const addDiscount = () => {
        // @ts-ignore
        setBulkDiscounts([...bulkDiscounts, { min_qty: 2, discount_type: 'percent', discount_value: 0 }])
    }

    const updateDiscount = (index: number, field: keyof BulkDiscount, value: any) => {
        setBulkDiscounts(bulkDiscounts.map((d, i) => i === index ? { ...d, [field]: value } : d))
    }

    const removeDiscount = (index: number) => {
        setBulkDiscounts(bulkDiscounts.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!formData.title || !formData.event_date) {
            setError(t('admin.event_form.messages.error')) // Basic validation
            return
        }

        setSaving(true)
        setError('')
        setShowSuccess(false)

        try {
            await eventsAPI.update(id!, {
                title: formData.title,
                description: formData.description,
                event_date: formData.event_date,
                event_time: formData.event_time,
                location: formData.location,
                location_map_url: formData.location_map_url,
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
                bulk_discounts: bulkDiscounts,
                event_type: formData.event_type,
                online_platform: formData.event_type !== 'offline' ? formData.online_platform : undefined,
                online_url: formData.event_type !== 'offline' ? formData.online_url : undefined,
                online_password: formData.event_type !== 'offline' ? formData.online_password : undefined,
                online_instructions: formData.event_type !== 'offline' ? formData.online_instructions : undefined,
                note: formData.note,
                icon_type: formData.icon_type,
                certificate_config: formData.certificate_config ? JSON.stringify(formData.certificate_config) : null,
                donation_enabled: formData.donation_enabled,
                donation_min_amount: formData.donation_min_amount ? parseInt(formData.donation_min_amount) : 0,
                donation_description: formData.donation_description

            } as Record<string, unknown>)

            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)

            // Re-fetch data to ensure everything is in sync (optional but good for consistency)
            // But since we updated local state, it might be fine. 
            // We do NOT navigate away.
        } catch (err) {
            setError(err instanceof Error ? err.message : t('admin.event_form.messages.error'))
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
                    <h2 className="text-xl font-bold">{t('admin.event_form.title')}</h2>
                </div>
            </header>

            <main className="px-4 py-8 md:px-10 lg:px-20">
                <div className={`mx-auto ${activeTab === 'certificate' ? 'max-w-[1600px]' : 'max-w-4xl'} transition-all duration-300`}>
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 mb-6 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('admin.event_form.tabs.general')}
                        </button>
                        <button
                            onClick={() => setActiveTab('certificate')}
                            className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'certificate' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('admin.event_form.tabs.certificate')}
                        </button>
                        <button
                            onClick={() => setActiveTab('id-card')}
                            className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'id-card' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('admin.event_form.tabs.id_card')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        {activeTab === 'general' ? (
                            <>
                                <div className="lg:col-span-2 space-y-6">
                                    {showSuccess && (
                                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2 animate-fadeIn">
                                            <span className="material-symbols-outlined">check_circle</span>
                                            {t('admin.event_form.messages.success')}
                                        </div>
                                    )}
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                        <h3 className="text-lg font-bold mb-4">{t('admin.event_form.sections.details')}</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.title')} *</label>
                                                <input
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={(e) => updateField('title', e.target.value)}
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.description')}</label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={(e) => updateField('description', e.target.value)}
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
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                                />
                                            </div>

                                            {formData.event_type !== 'online' && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.location_map_url') || 'Link Google Maps'}</label>
                                                    <input
                                                        type="url"
                                                        value={formData.location_map_url}
                                                        onChange={(e) => updateField('location_map_url', e.target.value)}
                                                        placeholder="https://www.google.com/maps/place/..."
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Link Google Maps untuk lokasi event (Offline/Hybrid). <b>Gunakan Link Panjang</b> dari address bar browser, jangan gunakan link share (pendek).</p>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.capacity')}</label>
                                                <input
                                                    type="number"
                                                    value={formData.capacity}
                                                    onChange={(e) => updateField('capacity', e.target.value)}
                                                    placeholder={t('admin.event_form.placeholders.leave_empty')}
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.whatsapp_cs')} *</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">+62</span>
                                                    <input
                                                        type="tel"
                                                        value={formData.whatsapp_cs}
                                                        onChange={(e) => updateField('whatsapp_cs', e.target.value)}
                                                        placeholder="81234567890"
                                                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{t('admin.event_form.hints.whatsapp_cs')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Online Details */}
                                    {formData.event_type !== 'offline' && (
                                        <div className="bg-blue-50 rounded-xl p-6 shadow-sm border border-blue-100 space-y-4">
                                            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                                <span className="material-symbols-outlined">videocam</span>
                                                {t('admin.event_form.sections.online')}
                                            </h3>

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

                                    {/* Event Images Slider */}
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold">{t('admin.event_form.sections.images')}</h3>
                                            <span className="text-sm text-gray-500">{images.length}/3</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            {images.map((img, index) => (
                                                <div key={index} className="relative aspect-[4/5] rounded-lg overflow-hidden bg-gray-100 group">
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
                                                <label className="aspect-[4/5] rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                                    {uploadingImage ? (
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-gray-400 text-[32px]">add_photo_alternate</span>
                                                            <span className="text-xs text-gray-500 mt-1">{t('admin.event_form.buttons.add_image')}</span>
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

                                    {/* Custom Form Fields */}
                                    {id && <CustomFieldsEditor eventId={id} />}

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
                                                            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center md:text-left">
                                                                <span className="material-symbols-outlined text-primary text-[28px] md:text-[24px]">chat</span>
                                                                <div>
                                                                    <p className="font-medium text-sm md:text-base">{t('admin.event_form.options.manual')}</p>
                                                                    <p className="text-[10px] md:text-xs text-gray-500">{t('admin.event_form.hints.manual_payment')}</p>
                                                                </div>
                                                            </div>
                                                        </label>
                                                        <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${formData.payment_mode === 'auto'
                                                            ? (!hasMidtransProdKeys ? 'border-amber-500 bg-amber-50' : 'border-primary bg-primary/5')
                                                            : 'border-gray-200'
                                                            } ${!hasMidtransProdKeys ? 'cursor-not-allowed opacity-80' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                name="payment_mode"
                                                                value="auto"
                                                                checked={formData.payment_mode === 'auto'}
                                                                onChange={() => updateField('payment_mode', 'auto')}
                                                                disabled={!hasMidtransProdKeys}
                                                                className="hidden"
                                                            />
                                                            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center md:text-left">
                                                                <span className={`material-symbols-outlined text-[28px] md:text-[24px] ${formData.payment_mode === 'auto' ? 'text-primary' : 'text-gray-400'}`}>credit_card</span>
                                                                <div>
                                                                    <p className={`font-medium text-sm md:text-base ${formData.payment_mode === 'auto' ? '' : 'text-gray-500'}`}>{t('admin.event_form.options.auto')}</p>
                                                                    {!hasMidtransProdKeys ? (
                                                                        <p className="text-[10px] md:text-xs text-amber-600 flex items-center gap-1 justify-center md:justify-start">
                                                                            <span className="material-symbols-outlined text-[10px]">warning</span>
                                                                            {t('admin.event_form.messages.production_keys_required')}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-[10px] md:text-xs text-gray-500">{t('admin.event_form.hints.auto_payment')}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>

                                                {formData.payment_mode === 'manual' && (
                                                    <div className="space-y-4">


                                                        <div className="border-t border-gray-200 pt-4">
                                                            <h4 className="font-medium text-sm mb-3">Informasi Rekening Bank</h4>
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.bank_name')} *</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.bank_name}
                                                                        onChange={(e) => updateField('bank_name', e.target.value)}
                                                                        placeholder={t('admin.event_form.placeholders.bank_name')}
                                                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.account_holder')} *</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.account_holder_name}
                                                                        onChange={(e) => updateField('account_holder_name', e.target.value)}
                                                                        placeholder={t('admin.event_form.placeholders.account_holder')}
                                                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.account_number')} *</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.account_number}
                                                                        onChange={(e) => updateField('account_number', e.target.value)}
                                                                        placeholder={t('admin.event_form.placeholders.account_number')}
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
                                                <h3 className="text-lg font-bold">{t('admin.event_form.sections.tickets')}</h3>
                                                <button
                                                    type="button"
                                                    onClick={addTicket}
                                                    className="flex items-center gap-1 text-primary text-sm font-medium hover:text-primary-hover"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                                    {t('admin.event_form.buttons.add_ticket')}
                                                </button>
                                            </div>

                                            {tickets.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">confirmation_number</span>
                                                    <p>{t('admin.event_form.messages.no_tickets')}</p>
                                                    <button
                                                        type="button"
                                                        onClick={addTicket}
                                                        className="mt-2 text-primary text-sm font-medium"
                                                    >
                                                        {t('admin.event_form.buttons.add_first_ticket')}
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
                                                                    <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.ticket_name')}</label>
                                                                    <input
                                                                        type="text"
                                                                        value={ticket.name}
                                                                        onChange={(e) => updateTicket(index, 'name', e.target.value)}
                                                                        placeholder={t('admin.event_form.placeholders.ticket_name')}
                                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.price')} (Rp)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={ticket.price}
                                                                        onChange={(e) => updateTicket(index, 'price', e.target.value)}
                                                                        placeholder="50000"
                                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.quota')} (optional)</label>
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

                                    {/* Bulk Discounts */}
                                    {formData.event_mode === 'paid' && (
                                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold">{t('admin.event_form.sections.discounts')}</h3>
                                                <button
                                                    type="button"
                                                    onClick={addDiscount}
                                                    className="flex items-center gap-1 text-primary text-sm font-medium hover:text-primary-hover"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                                    {t('admin.event_form.buttons.add_discount')}
                                                </button>
                                            </div>

                                            {bulkDiscounts.length === 0 ? (
                                                <p className="text-sm text-gray-500">{t('admin.event_form.messages.no_discounts')}</p>
                                            ) : (
                                                <div className="space-y-4">
                                                    {bulkDiscounts.map((discount, index) => (
                                                        <div key={index} className="p-4 border border-gray-200 rounded-lg flex items-center gap-4">
                                                            <div>
                                                                <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.min_qty')}</label>
                                                                <input
                                                                    type="number"
                                                                    value={discount.min_qty}
                                                                    onChange={(e) => updateDiscount(index, 'min_qty', parseInt(e.target.value))}
                                                                    className="w-24 px-3 py-2 text-sm rounded-lg border border-gray-300"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.type')}</label>
                                                                <select
                                                                    value={discount.discount_type}
                                                                    onChange={(e) => updateDiscount(index, 'discount_type', e.target.value)}
                                                                    className="w-32 px-3 py-2 text-sm rounded-lg border border-gray-300"
                                                                >
                                                                    <option value="percent">Percent (%)</option>
                                                                    <option value="nominal">Nominal (Rp)</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-medium mb-1">{t('admin.event_form.labels.value')}</label>
                                                                <input
                                                                    type="number"
                                                                    value={discount.discount_value}
                                                                    onChange={(e) => updateDiscount(index, 'discount_value', parseFloat(e.target.value))}
                                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeDiscount(index)}
                                                                className="text-red-500 hover:text-red-700 mt-5"
                                                            >
                                                                <span className="material-symbols-outlined">delete</span>
                                                            </button>
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
                                        <h3 className="font-bold mb-4">{t('admin.event_form.sections.settings')}</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.status')}</label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => updateField('status', e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="draft">{t('admin.event_form.options.draft')}</option>
                                                    <option value="open">{t('admin.event_form.options.open')}</option>
                                                    <option value="closed">{t('admin.event_form.options.closed')}</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-3">{t('admin.event_form.labels.pricing_model')}</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <label className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${formData.event_mode === 'free'
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name="event_mode"
                                                            value="free"
                                                            checked={formData.event_mode === 'free'}
                                                            onChange={() => updateField('event_mode', 'free')}
                                                            className="hidden"
                                                        />
                                                        <span className="font-medium text-sm">{t('admin.event_form.options.free')}</span>
                                                    </label>
                                                    <label className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${formData.event_mode === 'paid'
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name="event_mode"
                                                            value="paid"
                                                            checked={formData.event_mode === 'paid'}
                                                            onChange={() => updateField('event_mode', 'paid')}
                                                            className="hidden"
                                                        />
                                                        <span className="font-medium text-sm">{t('admin.event_form.options.paid')}</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-100 pt-4">
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.sections.donations')}</label>
                                                <label className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.donation_enabled === 1}
                                                        onChange={(e) => updateField('donation_enabled', e.target.checked ? 1 : 0)}
                                                        disabled={!hasMidtransProdKeys}
                                                        className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <span className={`text-sm font-medium ${!hasMidtransProdKeys ? 'text-gray-400' : ''}`}>{t('admin.event_form.labels.enable_donations')}</span>
                                                </label>
                                                {!hasMidtransProdKeys && (
                                                    <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                                        {t('admin.event_form.hints.midtrans_warning')}
                                                    </p>
                                                )}
                                                {formData.donation_enabled === 1 && (
                                                    <div className="space-y-3 pl-6 mt-3 animate-fadeIn">
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1 text-gray-500">{t('admin.event_form.labels.min_amount')} (Rp)</label>
                                                            <input
                                                                type="number"
                                                                value={formData.donation_min_amount}
                                                                onChange={(e) => updateField('donation_min_amount', e.target.value)}
                                                                placeholder="e.g. 10000"
                                                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1 text-gray-500">{t('admin.event_form.labels.donation_desc')}</label>
                                                            <input
                                                                type="text"
                                                                value={formData.donation_description}
                                                                onChange={(e) => updateField('donation_description', e.target.value)}
                                                                placeholder={t('admin.event_form.placeholders.donation_desc')}
                                                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>


                                            <div>
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.event_format')}</label>
                                                <select
                                                    value={formData.event_type}
                                                    onChange={(e) => updateField('event_type', e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary mb-3"
                                                >
                                                    <option value="offline">{t('admin.event_form.options.offline')}</option>
                                                    <option value="online">{t('admin.event_form.options.online')}</option>
                                                    <option value="hybrid">{t('admin.event_form.options.hybrid')}</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2">{t('admin.event_form.labels.visibility')}</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateField('visibility', 'public')}
                                                        className={`py-2 rounded-lg text-sm font-medium border ${formData.visibility === 'public'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-gray-200 text-gray-600'
                                                            }`}
                                                    >
                                                        {t('admin.event_form.options.public')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateField('visibility', 'private')}
                                                        className={`py-2 rounded-lg text-sm font-medium border ${formData.visibility === 'private'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-gray-200 text-gray-600'
                                                            }`}
                                                    >
                                                        {t('admin.event_form.options.private')}
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
                                                {t('admin.event_form.buttons.saving')}
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[20px]">save</span>
                                                {t('admin.event_form.buttons.save')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : activeTab === 'certificate' ? (
                            <div className="lg:col-span-3">
                                <CertificateEditor
                                    config={formData.certificate_config}
                                    onChange={(newConfig) => updateField('certificate_config', newConfig as any)}
                                    onSave={handleSubmit}
                                    isSaving={saving}
                                />
                            </div>
                        ) : null}

                        {activeTab === 'id-card' && (
                            <div className="lg:col-span-3">
                                {id && <IDCardEditor eventId={id} />}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
