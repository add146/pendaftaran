import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicAPI, participantsAPI, paymentsAPI, customFieldsAPI, type PublicEvent, type TicketType, type CustomField } from '../../lib/api'

export default function EventRegistration() {
    const { slug } = useParams<{ slug: string }>()
    const [event, setEvent] = useState<(PublicEvent & { ticket_types: TicketType[]; registration_available: boolean; payment_mode?: string; whatsapp_cs?: string }) | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [registrationId, setRegistrationId] = useState('')
    const [showImagePopup, setShowImagePopup] = useState(false)
    // Payment result from API
    const [paymentInfo, setPaymentInfo] = useState<{
        payment_mode: string
        whatsapp_cs: string | null
        bank_name: string | null
        account_holder_name: string | null
        account_number: string | null
        ticket_name: string
        ticket_price: number
        event_title: string
    } | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        city: '',
        ticket_type_id: ''
    })

    // Custom fields state
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [customFieldResponses, setCustomFieldResponses] = useState<Record<string, string | string[]>>({})

    const [participantId, setParticipantId] = useState('')

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

        // Fetch custom fields for this event
        if (slug) {
            publicAPI.event(slug)
                .then(eventData => {
                    customFieldsAPI.list(eventData.id)
                        .then(fields => setCustomFields(fields))
                        .catch(err => console.error('Failed to load custom fields:', err))
                })
                .catch(() => { /* Event already handled above */ })
        }
    }, [slug])

    // Load Midtrans Snap Script
    // Load Midtrans Snap Script
    useEffect(() => {
        if (!event) return

        const isProduction = event.midtrans_environment === 'production'
        const snapScript = isProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js'

        const clientKey = event.midtrans_client_key || import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-TEST'

        const script = document.createElement('script')
        script.src = snapScript
        script.setAttribute('data-client-key', clientKey)
        script.async = true

        document.body.appendChild(script)

        return () => {
            // Check if script still exists before removing
            if (document.body.contains(script)) {
                document.body.removeChild(script)
            }
        }
    }, [event])

    const handleMidtransPayment = async () => {
        if (!participantId || !paymentInfo) {
            alert('Registration data not found. Please try registering again.')
            return
        }

        try {
            // Check if Snap.js is loaded
            // @ts-ignore
            if (!window.snap) {
                alert('Payment system is loading. Please wait a moment and try again.')
                return
            }

            // Get Snap Token from backend
            console.log('Creating payment with:', {
                participantId,
                amount: paymentInfo.ticket_price,
                itemName: `${paymentInfo.ticket_name} - ${paymentInfo.event_title}`
            })

            const result = await paymentsAPI.create({
                participantId,
                amount: paymentInfo.ticket_price,
                itemName: `${paymentInfo.ticket_name} - ${paymentInfo.event_title}`,
                customerName: formData.full_name,
                customerEmail: formData.email,
                customerPhone: formData.phone
            })

            console.log('Payment token received:', result.token)

            // Open Snap Popup
            // @ts-ignore
            window.snap.pay(result.token, {
                onSuccess: function (_result: any) {
                    alert('Payment success!')
                    window.location.reload()
                },
                onPending: function (_result: any) {
                    alert('Waiting for payment confirmation...')
                },
                onError: function (_result: any) {
                    alert('Payment failed! Please try again.')
                },
                onClose: function () {
                    console.log('Payment popup closed')
                }
            })
        } catch (error: any) {
            console.error('Payment error:', error)
            const errorMessage = error.message || 'Failed to initialize payment'
            alert(`Error: ${errorMessage}. Please contact support if this persists.`)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!event) return

        if (!formData.full_name || !formData.email) {
            setError('Name and email are required')
            return
        }

        setSubmitting(true)
        setError('')

        // Validate required custom fields
        const missingFields = customFields
            .filter(field => field.required)
            .filter(field => {
                const response = customFieldResponses[field.id]
                if (Array.isArray(response)) {
                    return response.length === 0
                }
                return !response || response.trim() === ''
            })

        if (missingFields.length > 0) {
            setError(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`)
            setSubmitting(false)
            return
        }

        try {
            // Prepare custom fields data
            const customFieldsData = customFields.map(field => ({
                field_id: field.id,
                response: Array.isArray(customFieldResponses[field.id])
                    ? customFieldResponses[field.id]
                    : customFieldResponses[field.id] || ''
            }))

            const result = await participantsAPI.register({
                event_id: event.id,
                ticket_type_id: formData.ticket_type_id || undefined,
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone || undefined,
                city: formData.city || undefined,
                custom_fields: customFieldsData.filter(cf => cf.response)
            })
            setRegistrationId(result.registration_id)
            setParticipantId(result.id) // Store UUID for payment

            // Store payment info for flow handling
            const paymentResult = result as typeof result & {
                payment_mode?: string
                whatsapp_cs?: string
                bank_name?: string
                account_holder_name?: string
                account_number?: string
                ticket_name?: string
                ticket_price?: number
                event_title?: string
            }

            if (paymentResult.payment_mode) {
                setPaymentInfo({
                    payment_mode: paymentResult.payment_mode,
                    whatsapp_cs: paymentResult.whatsapp_cs || null,
                    bank_name: paymentResult.bank_name || null,
                    account_holder_name: paymentResult.account_holder_name || null,
                    account_number: paymentResult.account_number || null,
                    ticket_name: paymentResult.ticket_name || '',
                    ticket_price: paymentResult.ticket_price || 0,
                    event_title: paymentResult.event_title || event.title
                })
            }

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
            year: 'numeric',
            timeZone: 'Asia/Jakarta'
        })
    }

    // Parse event images
    const images = (() => {
        if (!event?.image_url) return []
        try {
            const imgs = JSON.parse(event.image_url)
            return Array.isArray(imgs) ? imgs : [event.image_url]
        } catch {
            return [event.image_url]
        }
    })()

    const [currentIndex, setCurrentIndex] = useState(0)

    // Auto-slide effect
    useEffect(() => {
        if (images.length <= 1) return
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [images.length])

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
        // Generate WhatsApp nota message
        const generateWhatsAppNota = () => {
            if (!paymentInfo) return ''

            // Format bank account section if available
            let bankSection = ''
            if (paymentInfo.bank_name && paymentInfo.account_holder_name && paymentInfo.account_number) {
                bankSection = `
━━━━━━━━━━━━━━━━━━━━
💳 *INFORMASI TRANSFER*
━━━━━━━━━━━━━━━━━━━━

Bank: *${paymentInfo.bank_name}*
Atas Nama: *${paymentInfo.account_holder_name}*
No. Rekening: *${paymentInfo.account_number}*
Nominal: *Rp ${paymentInfo.ticket_price.toLocaleString('id-ID')}*

_Mohon transfer sesuai nominal dan kirim bukti transfer ke nomor ini_`
            } else {
                bankSection = `
Mohon konfirmasi pembayaran sebesar *Rp ${paymentInfo.ticket_price.toLocaleString('id-ID')}*`
            }

            const nota = `━━━━━━━━━━━━━━━━━━━━
✅ *PENDAFTARAN BERHASIL*
━━━━━━━━━━━━━━━━━━━━

📌 *Event:* ${paymentInfo.event_title}
👤 *Nama:* ${formData.full_name}
📧 *Email:* ${formData.email}
📱 *Phone:* ${formData.phone || '-'}
🏙️ *Kota:* ${formData.city || '-'}

🎫 *Tiket:* ${paymentInfo.ticket_name}
💰 *Harga:* Rp ${paymentInfo.ticket_price.toLocaleString('id-ID')}
🔖 *ID Registrasi:* ${registrationId}
${bankSection}`

            return encodeURIComponent(nota)
        }

        const formatWhatsAppNumber = (number: string) => {
            if (!number) return ''
            // Remove all non-digit characters
            let cleaned = number.replace(/\D/g, '')
            // Remove leading 0 if present
            cleaned = cleaned.replace(/^0/, '')
            // Add 62 prefix if not already present
            if (!cleaned.startsWith('62')) {
                cleaned = '62' + cleaned
            }
            return cleaned
        }

        const waNumber = formatWhatsAppNumber(paymentInfo?.whatsapp_cs || '')
        const waLink = `https://wa.me/${waNumber}?text=${generateWhatsAppNota()}`

        return (
            <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="size-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-[40px] text-green-600">check_circle</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h1>
                    <p className="text-gray-600 mb-4">Thank you for registering for <strong>{event?.title}</strong></p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-500">Your Registration ID</p>
                        <p className="text-lg font-mono font-bold text-primary">{registrationId}</p>
                    </div>

                    {/* Payment flow based on mode */}
                    {paymentInfo && paymentInfo.ticket_price > 0 && (
                        <div className="mb-6">
                            {paymentInfo.payment_mode === 'manual' && paymentInfo.whatsapp_cs ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600">Silakan lanjutkan pembayaran via WhatsApp:</p>
                                    <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
                                    >
                                        <span className="material-symbols-outlined">chat</span>
                                        Kirim Nota ke WhatsApp
                                    </a>
                                    <p className="text-xs text-gray-500">
                                        Total: Rp {paymentInfo.ticket_price.toLocaleString('id-ID')}
                                    </p>
                                </div>
                            ) : paymentInfo.payment_mode === 'auto' ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600">Lanjutkan pembayaran online:</p>
                                    <button
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleMidtransPayment}
                                        disabled={!participantId}
                                    >
                                        <span className="material-symbols-outlined">credit_card</span>
                                        Bayar Sekarang - Rp {paymentInfo.ticket_price.toLocaleString('id-ID')}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}

                    <p className="text-sm text-gray-500 mb-4">
                        Konfirmasi telah dikirim ke <strong>{formData.email}</strong>
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
                            {/* Hero Image Slider */}
                            {/* Hero Image Slider */}
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-100 group">
                                {images.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                                        <span className="material-symbols-outlined text-[80px] text-primary/30">event</span>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                                        <div className="absolute bottom-0 left-0 p-6 pointer-events-none">
                                            <span className={`inline-block px-3 py-1 text-white text-xs font-bold uppercase tracking-wider rounded-full mb-3 ${event?.event_mode === 'paid' ? 'bg-amber-500' : 'bg-green-500'}`}>
                                                {event?.event_mode === 'paid' ? 'Paid Event' : 'Free Event'}
                                            </span>
                                            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                                                {event?.title}
                                            </h1>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {images.map((img: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                                    }`}
                                                onClick={() => setShowImagePopup(true)} // Opens current image in popup
                                            >
                                                <img src={img} alt={`${event?.title} ${idx + 1}`} className="w-full h-full object-cover" />
                                                {/* Text & Gradient Overlay (only on top layer) */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none"></div>
                                            </div>
                                        ))}

                                        {/* Navigation Arrows */}
                                        {images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
                                                    }}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors pointer-events-auto backdrop-blur-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setCurrentIndex((prev) => (prev + 1) % images.length)
                                                    }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors pointer-events-auto backdrop-blur-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                                                </button>
                                            </>
                                        )}

                                        {/* Navigation Dots (Moved to Top) */}
                                        {images.length > 1 && (
                                            <div className="absolute top-4 left-0 right-0 z-20 flex justify-center gap-2 pointer-events-none">
                                                {images.map((_: any, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setCurrentIndex(idx)
                                                        }}
                                                        className={`w-2 h-2 rounded-full transition-all pointer-events-auto drop-shadow-md ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Text Content Overlay (Fixed on top of all slides) */}
                                        <div className="absolute bottom-0 left-0 p-6 z-20 pointer-events-none">
                                            <span className={`inline-block px-3 py-1 text-white text-xs font-bold uppercase tracking-wider rounded-full mb-3 ${event?.event_mode === 'paid' ? 'bg-amber-500' : 'bg-green-500'}`}>
                                                {event?.event_mode === 'paid' ? 'Paid Event' : 'Free Event'}
                                            </span>
                                            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                                                {event?.title}
                                            </h1>
                                        </div>

                                        {/* Expand Icon */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="material-symbols-outlined text-[48px] text-white drop-shadow-lg bg-black/30 rounded-full p-2">zoom_in</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Image Popup Modal */}
                            {showImagePopup && images[currentIndex] && (
                                <div
                                    className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
                                    onClick={() => setShowImagePopup(false)}
                                >
                                    <button
                                        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                                        onClick={() => setShowImagePopup(false)}
                                    >
                                        <span className="material-symbols-outlined text-[36px]">close</span>
                                    </button>
                                    <img
                                        src={images[currentIndex]}
                                        alt={event?.title}
                                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            )}

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
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 lg:sticky lg:top-24">
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
                                            <label className="block text-sm font-medium mb-1">No. WhatsApp *</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="Contoh: 08123456789"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Kota Tinggal</label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="Masukkan kota tinggal"
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

                                        {/* Custom Fields */}
                                        {customFields.map(field => (
                                            <div key={field.id}>
                                                <label className="block text-sm font-medium mb-1">
                                                    {field.label} {field.required && '*'}
                                                </label>
                                                {field.field_type === 'text' && (
                                                    <input
                                                        type="text"
                                                        value={(customFieldResponses[field.id] as string) || ''}
                                                        onChange={e => setCustomFieldResponses(prev => ({
                                                            ...prev,
                                                            [field.id]: e.target.value
                                                        }))}
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                        required={field.required}
                                                    />
                                                )}
                                                {field.field_type === 'textarea' && (
                                                    <textarea
                                                        value={(customFieldResponses[field.id] as string) || ''}
                                                        onChange={e => setCustomFieldResponses(prev => ({
                                                            ...prev,
                                                            [field.id]: e.target.value
                                                        }))}
                                                        rows={4}
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                                        required={field.required}
                                                    />
                                                )}
                                                {field.field_type === 'radio' && field.options && (
                                                    <div className="space-y-2">
                                                        {field.options.map((option, index) => (
                                                            <label key={index} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`field_${field.id}`}
                                                                    value={option}
                                                                    checked={customFieldResponses[field.id] === option}
                                                                    onChange={e => setCustomFieldResponses(prev => ({
                                                                        ...prev,
                                                                        [field.id]: e.target.value
                                                                    }))}
                                                                    className="w-4 h-4 text-primary"
                                                                    required={field.required && !customFieldResponses[field.id]}
                                                                />
                                                                <span>{option}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                                {field.field_type === 'checkbox' && field.options && (
                                                    <div className="space-y-2">
                                                        {field.options.map((option, index) => {
                                                            const responses = (customFieldResponses[field.id] || []) as string[]
                                                            return (
                                                                <label key={index} className="flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        value={option}
                                                                        checked={responses.includes(option)}
                                                                        onChange={e => {
                                                                            const newResponses = e.target.checked
                                                                                ? [...responses, option]
                                                                                : responses.filter(r => r !== option)
                                                                            setCustomFieldResponses(prev => ({
                                                                                ...prev,
                                                                                [field.id]: newResponses
                                                                            }))
                                                                        }}
                                                                        className="w-4 h-4 text-primary rounded"
                                                                    />
                                                                    <span>{option}</span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

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
