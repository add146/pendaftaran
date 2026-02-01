import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { publicAPI, participantsAPI, paymentsAPI, customFieldsAPI, type PublicEvent, type TicketType, type CustomField, type RegisterParticipantData } from '../../lib/api'
import { useTranslation } from 'react-i18next'

interface ParticipantFormData {
    full_name: string
    email: string
    phone: string
    city: string
    ticket_type_id: string
    attendance_type: 'offline' | 'online'
    custom_fields: Record<string, string | string[]>
}

export default function EventRegistration() {
    const { t } = useTranslation()
    const { slug } = useParams<{ slug: string }>()
    const [event, setEvent] = useState<(PublicEvent & { ticket_types: TicketType[]; registration_available: boolean; payment_mode?: string; whatsapp_cs?: string }) | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    // Result state
    const [registrationResult, setRegistrationResult] = useState<{
        registration_id?: string
        order_id?: string
        participant_count?: number
        amount: number
        participants?: { full_name: string; registration_id: string }[]
    } | null>(null)

    const [showImagePopup, setShowImagePopup] = useState(false)

    // Payment info for success page
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

    // Form state - Array for group support
    const [participants, setParticipants] = useState<ParticipantFormData[]>([{
        full_name: '',
        email: '',
        phone: '',
        city: '',
        ticket_type_id: '',
        attendance_type: 'offline', // Default
        custom_fields: {}
    }])

    // Custom fields metadata
    const [customFields, setCustomFields] = useState<CustomField[]>([])

    const [orderId, setOrderId] = useState('')
    const [participantId, setParticipantId] = useState('') // Fallback for single
    const [donationAmount, setDonationAmount] = useState<number | ''>('')


    useEffect(() => {
        if (!slug) return

        setLoading(true)
        publicAPI.event(slug)
            .then(data => {
                setEvent(data)

                // Set default attendance type
                const defaultAttendance = data.event_type === 'online' ? 'online' : 'offline'

                // Set default ticket if available and update attendance type
                if (data.ticket_types && data.ticket_types.length > 0) {
                    setParticipants(prev => prev.map(p => ({
                        ...p,
                        ticket_type_id: data.ticket_types![0].id,
                        attendance_type: defaultAttendance
                    })))
                } else {
                    setParticipants(prev => prev.map(p => ({
                        ...p,
                        attendance_type: defaultAttendance
                    })))
                }

                // Fetch custom fields using the event ID
                return customFieldsAPI.list(data.id)
            })
            .then(fields => {
                setCustomFields(fields || [])
                setLoading(false)
            })
            .catch(err => {
                console.error('Error loading event data:', err)
                // If it's the second error (custom fields), we still show event but maybe with warning?
                // Actually if event fetch fails, it goes here.
                if (!event) {
                    setError(err.message || 'Event not found')
                } else {
                    // Event loaded, but custom fields failed
                    console.warn('Custom fields failed to load')
                }
                setLoading(false)
            })
    }, [slug])

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
            if (document.body.contains(script)) {
                try {
                    document.body.removeChild(script)
                } catch (e) {
                    console.error('Error removing script', e)
                }
            }
        }
    }, [event])

    // Helper to format currency
    const formatRp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`

    // Calculate totals
    const calculateTotals = () => {
        if (!event) return { subtotal: 0, discount: 0, total: 0 }

        // Assume all have same ticket price for now if single ticket type selected per person
        // Actually each person might have diff ticket?
        // Current UI: we map `ticket_type_id` per person.

        let subtotal = 0
        participants.forEach(p => {
            const t = event.ticket_types?.find(t => t.id === p.ticket_type_id)
            if (t) subtotal += t.price
        })

        let discount = 0
        const count = participants.length

        if (event.bulk_discounts && event.bulk_discounts.length > 0) {
            // Sort by min_qty DESC
            const sortedDiscounts = [...event.bulk_discounts].sort((a, b) => b.min_qty - a.min_qty)
            const applicable = sortedDiscounts.find(d => count >= d.min_qty)

            if (applicable) {
                if (applicable.discount_type === 'percent') {
                    discount = (subtotal * applicable.discount_value) / 100
                } else {
                    discount = applicable.discount_value
                }
            }
        }

        return {
            subtotal,
            discount,
            donation: typeof donationAmount === 'number' ? donationAmount : 0,
            total: Math.max(0, subtotal - discount) + (typeof donationAmount === 'number' ? donationAmount : 0)
        }
    }

    const { subtotal, discount, donation, total } = calculateTotals()

    // Determine effective payment mode (mirroring handleSubmit logic)
    // Use the SAME logic for clientKey availability as the script loader to ensure consistency
    const hasMidtrans = !!(event && (event.midtrans_client_key || import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-TEST'))

    const effectivePaymentMode = event && (
        (event.event_mode === 'free' && total > 0 && hasMidtrans)
            ? 'auto'
            : (event.payment_mode || 'manual')
    )


    const addParticipant = () => {
        setParticipants(prev => [...prev, {
            full_name: '',
            email: '',
            phone: '',
            city: '',
            ticket_type_id: event?.ticket_types?.[0]?.id || '',
            attendance_type: event?.event_type === 'online' ? 'online' : 'offline',
            custom_fields: {}
        }])
    }

    const removeParticipant = (index: number) => {
        setParticipants(prev => prev.filter((_, i) => i !== index))
    }

    const updateParticipant = (index: number, field: keyof ParticipantFormData, value: any) => {
        setParticipants(prev => {
            const temp = [...prev]
            temp[index] = { ...temp[index], [field]: value }
            return temp
        })
    }

    const updateParticipantCustomField = (index: number, fieldId: string, value: string | string[]) => {
        setParticipants(prev => {
            const temp = [...prev]
            temp[index] = {
                ...temp[index],
                custom_fields: {
                    ...temp[index].custom_fields,
                    [fieldId]: value
                }
            }
            return temp
        })
    }

    const handleMidtransPayment = async () => {
        if ((!orderId && !participantId) || !paymentInfo) {
            alert('Registration data not found. Please try registering again.')
            return
        }

        try {
            // @ts-ignore
            const payLoad: any = {
                amount: registrationResult ? registrationResult.amount : paymentInfo.ticket_price, // Use calculated amount
                itemName: `${paymentInfo.ticket_name} - ${paymentInfo.event_title}`,
                customerName: participants[0].full_name,
                customerEmail: participants[0].email,
                customerPhone: participants[0].phone,
                donationAmount: donation // Pass donation amount separately for backend itemization

            }

            if (orderId) payLoad.orderId = orderId
            else payLoad.participantId = participantId

            console.log('Creating payment with:', payLoad)

            const result = await paymentsAPI.create(payLoad)

            console.log('Payment token received:', result.token)

            // @ts-ignore
            window.snap.pay(result.token, {
                onSuccess: function (_result: any) {
                    alert(t('payment.success_alert'))
                    window.location.reload()
                },
                onPending: function (_result: any) {
                    alert(t('payment.pending_alert'))
                },
                onError: function (_result: any) {
                    alert(t('payment.failed_alert'))
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

        // Basic Validation
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i]
            if (!p.full_name || !p.email || !p.phone) {
                setError(`Participant #${i + 1}: Name, Email, and Phone are required.`)
                return
            }

            // Custom fields validation
            const missingFields = customFields
                .filter(field => field.required)
                .filter(field => {
                    const response = p.custom_fields[field.id]
                    if (Array.isArray(response)) return response.length === 0
                    return !response || response.trim() === ''
                })

            if (missingFields.length > 0) {
                setError(`Participant #${i + 1}: Missing required fields (${missingFields.map(f => f.label).join(', ')})`)
                return
            }
        }

        setSubmitting(true)
        setError('')

        try {
            // Transform data for API
            const payload: RegisterParticipantData[] = participants.map(p => {
                const customFieldsData = customFields.map(field => ({
                    field_id: field.id,
                    response: p.custom_fields[field.id] || ''
                })).filter(cf => cf.response !== '')

                return {
                    event_id: event.id,
                    ticket_type_id: p.ticket_type_id || undefined,
                    full_name: p.full_name,
                    email: p.email,
                    phone: p.phone,
                    city: p.city || undefined,
                    attendance_type: p.attendance_type as 'offline' | 'online',
                    custom_fields: customFieldsData,
                    has_donation: typeof donation === 'number' && donation > 0
                }
            })

            // Call API
            const result = await participantsAPI.register(payload)

            // Handle Response
            if (result.order_id) setOrderId(result.order_id)
            if (result.id) setParticipantId(result.id) // Legacy/Single support

            setRegistrationResult({
                registration_id: result.registration_id, // Might be empty if multiple? API returns first ID?
                order_id: result.order_id,
                participant_count: result.participant_count || participants.length,
                amount: total,
                participants: result.participants
            })

            // Construct Payment Info for Success Page
            // If multiple, we show generic "Group Order" or first ticket info
            const firstT = event.ticket_types?.find(t => t.id === participants[0].ticket_type_id)

            // Note: API returns payment_status, message etc. Use result to populate info.
            // But we need bank info etc which usually comes in result extras.
            // In group mode, `result` might not have all legacy fields if generic type.
            // Let's rely on `event` object + `result`.

            // IMPORTANT: API `register` return type needs checking.
            // In `participants.ts`, for bulk it currently returns:
            // { message: 'Registration successful', order_id, participant_count, payment_status, redirect_url, event_title, ... }

            // Let's assume result has necessary fields

            // Logic to determine payment mode
            // If Free Event + Donation + Midtrans Keys Present -> Force 'auto'
            // Otherwise respect event settings
            let effectivePaymentMode = event.payment_mode || 'manual'
            if (event.event_mode === 'free' && total > 0 && event.midtrans_client_key) {
                effectivePaymentMode = 'auto'
            }

            setPaymentInfo({
                payment_mode: effectivePaymentMode,
                whatsapp_cs: event.whatsapp_cs || null,
                bank_name: event.bank_name || null,
                account_holder_name: event.account_holder_name || null,
                account_number: event.account_number || null,
                ticket_name: participants.length > 1 ? `${participants.length} Tickets` : (firstT?.name || 'Ticket'),
                ticket_price: total, // Use calculated total
                event_title: event.title
            })

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
                <h1 className="text-2xl font-bold text-gray-700 mb-2">{t('common.event_not_found')}</h1>
                <p className="text-gray-500 mb-4">{error}</p>
                <Link to="/" className="text-primary hover:underline">{t('common.back_home')}</Link>
            </div>
        )
    }

    if (success) {
        // Success Page (Group Friendly)
        const generateWhatsAppNota = () => {
            if (!paymentInfo) return ''

            let bankSection = ''
            if (paymentInfo.bank_name && paymentInfo.account_holder_name && paymentInfo.account_number) {
                bankSection = `
━━━━━━━━━━━━━━━━━━━━
💳 *${t('nota.transfer_info').toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━

${t('nota.bank')}: *${paymentInfo.bank_name}*
${t('nota.account_name')}: *${paymentInfo.account_holder_name}*
${t('nota.account_number')}: *${paymentInfo.account_number}*
${t('nota.amount')}: *Rp ${paymentInfo.ticket_price.toLocaleString('id-ID')}*

_${t('nota.transfer_instruction')}_`
            } else {
                bankSection = `
${t('nota.confirm_payment')} *Rp ${paymentInfo.ticket_price.toLocaleString('id-ID')}*`
            }

            const nota = `━━━━━━━━━━━━━━━━━━━━
✅ *${paymentInfo.payment_mode === 'manual' ? 'LANJUTKAN PEMBAYARAN' : t('nota.registration_success').toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━

📌 *Event:* ${paymentInfo.event_title}
👤 *${t('nota.registrant_name')}:* ${participants[0].full_name} (${participants[0].email})
👥 *${t('nota.participant_count')}:* ${participants.length} ${t('common.people')}

${registrationResult?.participants && registrationResult.participants.length > 0 ? `👥 *${t('nota.participant_list')}:*
${registrationResult.participants.map((p, i) => `${i + 1}. ${p.full_name} (${p.registration_id})`).join('\n')}

` : ''}🎫 *${t('nota.total_tickets')}:* ${paymentInfo.ticket_name}
💰 *${t('nota.total_bill')}:* Rp ${paymentInfo.ticket_price.toLocaleString('id-ID')}
🔖 *Order ID:* ${registrationResult?.order_id || registrationResult?.registration_id}
${bankSection}`

            return encodeURIComponent(nota)
        }

        const formatWhatsAppNumber = (number: string) => {
            if (!number) return ''
            let cleaned = number.replace(/\D/g, '')
            cleaned = cleaned.replace(/^0/, '')
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
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        {paymentInfo && paymentInfo.ticket_price > 0 && (paymentInfo.payment_mode === 'manual' || paymentInfo.payment_mode === 'auto')
                            ? 'Lanjutkan Pembayaran'
                            : t('registration.success')}
                    </h1>
                    <p className="text-gray-600 mb-4">{t('registration.thank_you')} <strong>{event?.title}</strong></p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-500">Order ID</p>
                        <p className="text-lg font-mono font-bold text-primary">{registrationResult?.order_id || registrationResult?.registration_id}</p>
                        {participants.length > 1 && <p className="text-xs text-gray-400 mt-1">For {participants.length} participants</p>}
                    </div>

                    {paymentInfo && paymentInfo.ticket_price > 0 && (
                        <div className="mb-6">
                            {paymentInfo.payment_mode === 'manual' && paymentInfo.whatsapp_cs ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600">{t('registration.continue_whatsapp')}</p>
                                    <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
                                    >
                                        <span className="material-symbols-outlined">chat</span>
                                        {t('registration.send_nota')}
                                    </a>
                                </div>
                            ) : paymentInfo.payment_mode === 'auto' ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600">{t('registration.continue_online')}</p>
                                    <button
                                        className="flex flex-col items-center justify-center gap-1 w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleMidtransPayment}
                                        disabled={(!orderId && !participantId)}
                                    >
                                        <span className="text-sm font-normal">Total Pembayaran</span>
                                        <span className="text-xl">Rp {paymentInfo.ticket_price.toLocaleString('id-ID')}</span>
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Only show home button if NOT manual OR auto payment (meaning free or done) */}
                    {!(paymentInfo && paymentInfo.ticket_price > 0 && (paymentInfo.payment_mode === 'manual' || paymentInfo.payment_mode === 'auto')) && (
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover"
                        >
                            <span className="material-symbols-outlined text-[20px]">home</span>
                            {t('common.back_home')}
                        </Link>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen flex flex-col">
            <Helmet>
                <title>{event?.title || 'E-TIKET'}</title>
                <meta name="description" content={event?.description?.substring(0, 160).replace(/\n/g, ' ') || 'Daftar event di sini.'} />
            </Helmet>

            {/* Header */}
            <header className="flex items-center justify-between border-b border-border-light bg-white px-6 py-4 sticky top-0 z-50">
                <Link to="/" className="flex items-center gap-3">
                    <div className="size-8 text-primary">
                        <span className="material-symbols-outlined text-[32px]">confirmation_number</span>
                    </div>
                    <h2 className="text-lg font-bold whitespace-normal break-words text-left leading-tight">{event?.title || t('common.loading')}</h2>
                </Link>
                {/* <LanguageSwitcher /> - Disabled for public view */}
            </header>

            <main className="flex-grow">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Mobile Registration Button */}
                    <button
                        onClick={() => document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' })}
                        className="lg:hidden w-full bg-orange-500 text-white font-bold py-3 rounded-xl mb-6 flex items-center justify-center gap-2 shadow-sm hover:bg-orange-600 transition-colors"
                    >
                        <span className="material-symbols-outlined">keyboard_arrow_down</span>
                        {t('registration.registrasi')}
                        <span className="material-symbols-outlined">keyboard_arrow_down</span>
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Event Details */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Hero Image Slider */}
                            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg bg-gray-100 group">
                                {images.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                                        <span className="material-symbols-outlined text-[80px] text-primary/30">event</span>
                                    </div>
                                ) : (
                                    <>
                                        {images.map((img: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                                onClick={() => setShowImagePopup(true)}
                                            >
                                                <img src={img} alt={`${event?.title} ${idx + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none"></div>
                                            </div>
                                        ))}
                                        {/* Simple Dots */}
                                        {images.length > 1 && (
                                            <div className="absolute top-4 left-0 right-0 z-20 flex justify-center gap-2 pointer-events-none">
                                                {images.map((_: any, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                                        className={`w-2 h-2 rounded-full transition-all pointer-events-auto drop-shadow-md ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white'}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 p-6 z-20 pointer-events-none">
                                            <span className={`inline-block px-3 py-1 text-white text-xs font-bold uppercase tracking-wider rounded-full mb-3 ${event?.event_mode === 'paid' ? 'bg-amber-500' : 'bg-green-500'}`}>
                                                {event?.event_mode === 'paid' ? t('event.paid_event') : t('event.free_event')}
                                            </span>
                                            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">{event?.title}</h1>
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Image Popup Modal */}
                            {showImagePopup && images[currentIndex] && (
                                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setShowImagePopup(false)}>
                                    <button className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"><span className="material-symbols-outlined text-[36px]">close</span></button>
                                    <img src={images[currentIndex]} alt={event?.title} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                                </div>
                            )}

                            {/* Event Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined">calendar_month</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">{t('event.date_time')}</p>
                                        <p className="font-semibold">{event?.event_date ? formatDate(event.event_date) : '-'}</p>
                                        <p className="text-sm text-gray-500">{event?.event_time || t('event.time_tba')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">{t('event.location')}</p>
                                        <p className="font-semibold">{event?.location || t('event.location_tba')}</p>
                                    </div>
                                </div>
                            </div>

                            {event?.description && (
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-bold mb-3">{t('event.about')}</h3>
                                    <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Registration Form */}
                        <div className="lg:col-span-2">
                            <div className="lg:sticky lg:top-24 space-y-6">
                                <div id="registration-form" className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                                    <h3 className="text-xl font-bold mb-6">{t('registration.register_now')}</h3>

                                    {/* Discounts Info */}
                                    {event?.bulk_discounts && event.bulk_discounts.length > 0 && (
                                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <h4 className="flex items-center gap-2 font-bold text-green-800 mb-2">
                                                <span className="material-symbols-outlined">verified</span>
                                                Promo Hemat!
                                            </h4>
                                            <ul className="space-y-1 text-sm text-green-700">
                                                {event.bulk_discounts.map((d, i) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                        Daftar minimal {d.min_qty} orang, hemat {d.discount_type === 'percent' ? `${d.discount_value}%` : `Rp ${d.discount_value.toLocaleString('id-ID')}`}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {!event?.registration_available ? (
                                        <div className="text-center py-8">
                                            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">event_busy</span>
                                            <p className="text-gray-500">{t('registration.closed')}</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {error && (
                                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
                                            )}

                                            {/* Participants Loop */}
                                            {participants.map((p, index) => (
                                                <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="font-bold text-gray-700">{t('registration.participant')} #{index + 1}</h4>
                                                        {participants.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeParticipant(index)}
                                                                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                {t('common.delete')}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">{t('registration.full_name')} *</label>
                                                            <input
                                                                type="text"
                                                                value={p.full_name}
                                                                onChange={e => updateParticipant(index, 'full_name', e.target.value)}
                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                placeholder="Enter full name"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">{t('registration.email')} *</label>
                                                            <input
                                                                type="email"
                                                                value={p.email}
                                                                onChange={e => updateParticipant(index, 'email', e.target.value)}
                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                placeholder="Enter email"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">{t('registration.phone')} *</label>
                                                            <input
                                                                type="tel"
                                                                value={p.phone}
                                                                onChange={e => updateParticipant(index, 'phone', e.target.value)}
                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                placeholder="08123456789"
                                                                required
                                                            />
                                                        </div>
                                                        {/* Attendance Type (For Hybrid Events) */}
                                                        {event.event_type === 'hybrid' && (
                                                            <div>
                                                                <label className="block text-sm font-medium mb-2">{t('registration.attendance_type')}</label>
                                                                <div className="flex gap-4">
                                                                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${p.attendance_type === 'offline' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                                                        <input
                                                                            type="radio"
                                                                            name={`attendance_${index}`}
                                                                            value="offline"
                                                                            checked={p.attendance_type === 'offline'}
                                                                            onChange={e => updateParticipant(index, 'attendance_type', e.target.value)}
                                                                            className="hidden"
                                                                        />
                                                                        <div className="flex flex-col items-center text-center gap-2">
                                                                            <span className="material-symbols-outlined text-[32px] text-primary">store</span>
                                                                            <div>
                                                                                <p className="font-bold text-gray-800">{t('registration.offline')}</p>
                                                                                <p className="text-xs text-gray-500">{t('registration.offline_desc')}</p>
                                                                            </div>
                                                                        </div>
                                                                    </label>
                                                                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${p.attendance_type === 'online' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                                                        <input
                                                                            type="radio"
                                                                            name={`attendance_${index}`}
                                                                            value="online"
                                                                            checked={p.attendance_type === 'online'}
                                                                            onChange={e => updateParticipant(index, 'attendance_type', e.target.value)}
                                                                            className="hidden"
                                                                        />
                                                                        <div className="flex flex-col items-center text-center gap-2">
                                                                            <span className="material-symbols-outlined text-[32px] text-primary">videocam</span>
                                                                            <div>
                                                                                <p className="font-bold text-gray-800">{t('registration.online')}</p>
                                                                                <p className="text-xs text-gray-500">{t('registration.online_desc')}</p>
                                                                            </div>
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Ticket Type */}
                                                        {event.ticket_types && event.ticket_types.length > 0 && event.event_mode === 'paid' && (
                                                            <div>
                                                                <label className="block text-sm font-medium mb-2">{t('registration.ticket_type')}</label>
                                                                <select
                                                                    value={p.ticket_type_id}
                                                                    onChange={e => updateParticipant(index, 'ticket_type_id', e.target.value)}
                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary"
                                                                >
                                                                    {event.ticket_types.map(t => (
                                                                        <option key={t.id} value={t.id}>{t.name} - {formatRp(t.price)}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}

                                                        {/* Custom Fields */}
                                                        {customFields.length > 0 && (
                                                            <div className="pt-2 border-t border-gray-200 mt-2">
                                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t('registration.additional_info')}</p>
                                                                {customFields.map(field => (
                                                                    <div key={field.id} className="mb-3">
                                                                        <label className="block text-sm font-medium mb-1">{field.label} {field.required && '*'}</label>
                                                                        {field.field_type === 'text' && (
                                                                            <input
                                                                                type="text"
                                                                                value={(p.custom_fields[field.id] as string) || ''}
                                                                                onChange={e => updateParticipantCustomField(index, field.id, e.target.value)}
                                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300"
                                                                                required={field.required}
                                                                            />
                                                                        )}
                                                                        {field.field_type === 'textarea' && (
                                                                            <textarea
                                                                                value={(p.custom_fields[field.id] as string) || ''}
                                                                                onChange={e => updateParticipantCustomField(index, field.id, e.target.value)}
                                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 resize-none h-24"
                                                                                required={field.required}
                                                                            />
                                                                        )}
                                                                        {field.field_type === 'radio' && field.options && (
                                                                            <div className="flex flex-wrap gap-4">
                                                                                {field.options.map((opt, i) => (
                                                                                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`p${index}_f${field.id}`}
                                                                                            value={opt}
                                                                                            checked={p.custom_fields[field.id] === opt}
                                                                                            onChange={e => updateParticipantCustomField(index, field.id, e.target.value)}
                                                                                            required={field.required && !p.custom_fields[field.id]}
                                                                                        />
                                                                                        {opt}
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {field.field_type === 'checkbox' && field.options && (
                                                                            <div className="flex flex-wrap gap-4">
                                                                                {field.options.map((opt, i) => {
                                                                                    const current = (p.custom_fields[field.id] as string[]) || []
                                                                                    const isChecked = Array.isArray(current) ? current.includes(opt) : current === opt

                                                                                    return (
                                                                                        <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                value={opt}
                                                                                                checked={isChecked}
                                                                                                onChange={e => {
                                                                                                    const val = e.target.value
                                                                                                    let newVal: string[] = Array.isArray(current) ? [...current] : (current ? [current] : [])

                                                                                                    if (e.target.checked) {
                                                                                                        newVal.push(val)
                                                                                                    } else {
                                                                                                        newVal = newVal.filter(v => v !== val)
                                                                                                    }
                                                                                                    updateParticipantCustomField(index, field.id, newVal)
                                                                                                }}
                                                                                            />
                                                                                            {opt}
                                                                                        </label>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add Participant Button */}
                                            <button
                                                type="button"
                                                onClick={addParticipant}
                                                className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-primary font-bold hover:bg-primary/5 hover:border-primary transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">person_add</span>
                                                Tambah Peserta
                                            </button>

                                            {/* Donation Section */}
                                            {event.donation_enabled === 1 && (
                                                <div className="bg-pink-500/5 rounded-xl p-6 shadow-sm border border-pink-200 mt-6">
                                                    <h3 className="font-bold flex items-center gap-2 mb-2 text-gray-800">
                                                        <span className="material-symbols-outlined text-pink-500">volunteer_activism</span>
                                                        Donasi (Sukarela)
                                                    </h3>
                                                    {event.donation_description && (
                                                        <p className="text-sm text-gray-600 mb-4">{event.donation_description}</p>
                                                    )}
                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase">Jumlah Donasi</label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 font-bold">Rp</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={donationAmount}
                                                                onChange={(e) => setDonationAmount(e.target.value ? parseInt(e.target.value) : '')}
                                                                placeholder={`Minimal Rp ${(event.donation_min_amount || 0).toLocaleString('id-ID')}`}
                                                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                                min={event.donation_min_amount || 0}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            Donasi Anda akan ditambahkan ke total pembayaran.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}


                                            {/* Price Calculation (Summary) */}
                                            {total > 0 && (
                                                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                                    {event.event_mode === 'paid' && (
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>Total Tiket ({participants.length}x)</span>
                                                            <span>{formatRp(subtotal)}</span>
                                                        </div>
                                                    )}
                                                    {discount > 0 && (
                                                        <div className="flex justify-between text-green-600 font-medium">
                                                            <span>Diskon Group</span>
                                                            <span>- {formatRp(discount)}</span>
                                                        </div>
                                                    )}
                                                    {(donation || 0) > 0 && (
                                                        <div className="flex justify-between text-pink-600 font-medium">
                                                            <span>Donasi</span>
                                                            <span>+ {formatRp(donation || 0)}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
                                                        <span>Total Bayar</span>
                                                        <span>{formatRp(total)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Payment Method Notes */}
                                            {total > 0 && effectivePaymentMode === 'manual' && (
                                                <p className="text-xs text-gray-500 text-center italic">
                                                    *transfer antar rekening
                                                </p>
                                            )}
                                            {total > 0 && effectivePaymentMode === 'auto' && (
                                                <p className="text-xs text-gray-500 text-center italic">
                                                    *menggunakan QRIS / Virtual Account
                                                </p>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-hover disabled:opacity-50 transition-all active:scale-[0.98]"
                                            >
                                                {submitting ? 'Memproses...' : (total > 0 ? 'Bayar Sekarang' : 'Daftar Sekarang')}

                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
