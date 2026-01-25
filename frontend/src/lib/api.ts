import imageCompression from 'browser-image-compression'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://pendaftaran-qr-api.khibrohstudio.workers.dev'

// Generic fetch wrapper
async function fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('auth_token')

    const headers: HeadersInit = {
        ...options.headers,
    }

    // Only set Content-Type for non-FormData requests
    // FormData requires the browser to set Content-Type with boundary automatically
    if (!(options.body instanceof FormData)) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json'
    }

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        console.error('API Error:', {
            url: `${API_BASE_URL}${endpoint}`,
            status: response.status,
            statusText: response.statusText,
            error
        })
        throw new Error(error.error || `Request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

// Auth API
export const authAPI = {
    login: (email: string, password: string) =>
        fetchAPI<{ token: string; user: { id: string; email: string; name: string; role: string; organization_id: string } }>(
            '/api/auth/login',
            { method: 'POST', body: JSON.stringify({ email, password }) }
        ),

    register: (data: { email: string; password: string; name: string; organizationName?: string }) =>
        fetchAPI<{ message: string; token: string; user: { id: string; email: string; name: string; organization_id: string } }>(
            '/api/auth/register',
            { method: 'POST', body: JSON.stringify(data) }
        ),

    me: () =>
        fetchAPI<{ id: string; email: string; name: string; role: string; organization: string; organization_id: string }>(
            '/api/auth/me'
        ),

    updateProfile: (data: { name: string; email: string }) =>
        fetchAPI<{ message: string }>(
            '/api/auth/profile',
            { method: 'PUT', body: JSON.stringify(data) }
        ),

    changePassword: (currentPassword: string, newPassword: string) =>
        fetchAPI<{ message: string }>(
            '/api/auth/change-password',
            { method: 'PUT', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }
        ),
}

// Super Admin API
export const superAdminAPI = {
    getStats: () =>
        fetchAPI<{
            total_organizations: number
            organizations_by_plan: { plan: string; count: number }[]
            total_users: number
            total_events: number
            pending_subscription_approvals: number
        }>('/api/admin/stats'),

    getOrganizations: (limit = 50, offset = 0) =>
        fetchAPI<{ organizations: any[] }>(
            `/api/admin/organizations?limit=${limit}&offset=${offset}`
        ),

    createOrganization: (data: { name: string; slug?: string; plan: 'nonprofit' | 'profit' }) =>
        fetchAPI<{ message: string; organization: any }>(
            '/api/admin/organizations',
            { method: 'POST', body: JSON.stringify(data) }
        ),

    updateOrganization: (id: string, data: { name?: string; slug?: string; plan?: 'nonprofit' | 'profit' }) =>
        fetchAPI<{ message: string }>(
            `/api/admin/organizations/${id}`,
            { method: 'PUT', body: JSON.stringify(data) }
        ),

    getUsers: (orgId?: string, limit = 100, offset = 0) =>
        fetchAPI<{ users: any[] }>(
            `/api/admin/users?${orgId ? `organization_id=${orgId}&` : ''}limit=${limit}&offset=${offset}`
        ),

    updateUserRole: (userId: string, role: string) =>
        fetchAPI<{ message: string }>(
            `/api/admin/users/${userId}/role`,
            { method: 'PUT', body: JSON.stringify({ role }) }
        ),

    deleteUser: (userId: string) =>
        fetchAPI<{ message: string }>(
            `/api/admin/users/${userId}`,
            { method: 'DELETE' }
        ),

    createUser: (data: { email: string; password: string; name: string; organization_id: string; role?: string }) =>
        fetchAPI<{ message: string; user: any }>(
            '/api/admin/users',
            { method: 'POST', body: JSON.stringify(data) }
        ),

    updateUser: (userId: string, data: { name?: string; email?: string; password?: string; organization_id?: string }) =>
        fetchAPI<{ message: string }>(
            `/api/admin/users/${userId}`,
            { method: 'PUT', body: JSON.stringify(data) }
        ),

    getPendingSubscriptions: () =>
        fetchAPI<{ payments: any[] }>('/api/admin/subscriptions/pending'),

    approveSubscription: (id: string) =>
        fetchAPI<{ message: string }>(
            `/api/admin/subscriptions/${id}/approve`,
            { method: 'PUT' }
        ),

    rejectSubscription: (id: string, reason: string) =>
        fetchAPI<{ message: string }>(
            `/api/admin/subscriptions/${id}/reject`,
            { method: 'PUT', body: JSON.stringify({ reason }) }
        ),
}

// Events API
export const eventsAPI = {
    list: (params?: { status?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.status) query.set('status', params.status)
        if (params?.limit) query.set('limit', params.limit.toString())
        if (params?.offset) query.set('offset', params.offset.toString())
        return fetchAPI<{ data: Event[]; total: number }>(`/api/events?${query}`)
    },

    get: (id: string) =>
        fetchAPI<Event & { ticket_types: TicketType[]; stats: EventStats }>(`/api/events/${id}`),

    create: (data: Partial<Event>) =>
        fetchAPI<{ id: string; slug: string }>('/api/events', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Event>) =>
        fetchAPI<{ message: string }>(`/api/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        fetchAPI<{ message: string }>(`/api/events/${id}`, { method: 'DELETE' }),

    stats: (id: string) => fetchAPI<EventStats>(`/api/events/${id}/stats`),

    getIdCardDesign: (id: string) =>
        fetchAPI<{ primaryColor: string; backgroundColor: string; sponsorLogo: string | null }>(`/api/events/${id}/id-card-design`),

    saveIdCardDesign: (id: string, design: { primaryColor: string; backgroundColor: string; sponsorLogo: string | null }) =>
        fetchAPI<{ message: string; design: any }>(`/api/events/${id}/id-card-design`, {
            method: 'PATCH',
            body: JSON.stringify(design),
        }),
}

// Participants API
export const participantsAPI = {
    list: (eventId: string, params?: { status?: string; payment?: string; search?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.status) query.set('status', params.status)
        if (params?.payment) query.set('payment', params.payment)
        if (params?.search) query.set('search', params.search)
        if (params?.limit) query.set('limit', params.limit.toString())
        if (params?.offset) query.set('offset', params.offset.toString())
        return fetchAPI<{ data: Participant[]; total: number }>(`/api/participants/event/${eventId}?${query}`)
    },

    get: (id: string) => fetchAPI<Participant>(`/api/participants/${id}`),

    register: (data: {
        event_id: string
        ticket_type_id?: string
        full_name: string
        email: string
        phone?: string
        city?: string
        gender?: string
        custom_fields?: Array<{ field_id: string; response: string | string[] }>
    }) =>
        fetchAPI<{ id: string; registration_id: string; qr_code: string; payment_status: string; message: string }>(
            '/api/participants/register',
            { method: 'POST', body: JSON.stringify(data) }
        ),

    checkIn: (id: string, eventId?: string) =>
        fetchAPI<{ message: string; participant: { id: string; full_name: string; registration_id: string; check_in_time: string } }>(
            `/api/participants/${id}/check-in`,
            { method: 'POST', body: JSON.stringify({ event_id: eventId }) }
        ),

    getQR: (id: string) =>
        fetchAPI<{ qr_data: string; participant: { name: string; registration_id: string; event: string; date: string } }>(
            `/api/participants/${id}/qr`
        ),

    approvePayment: (id: string) =>
        fetchAPI<{ message: string; participant: { id: string; full_name: string; registration_id: string; payment_status: string; qr_code: string } }>(
            `/api/participants/${id}/approve-payment`,
            { method: 'POST' }
        ),

    resendWhatsApp: (id: string) =>
        fetchAPI<{ message: string; phone: string; registration_id: string }>(
            `/api/participants/${id}/resend-whatsapp`,
            { method: 'POST' }
        ),

    delete: (id: string) =>
        fetchAPI<{ message: string }>(
            `/api/participants/${id}`,
            { method: 'DELETE' }
        ),

    exportCSV: async (eventId: string): Promise<void> => {
        const token = localStorage.getItem('auth_token')
        const response = await fetch(`${API_BASE_URL}/api/participants/event/${eventId}/export-csv`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Export failed' }))
            throw new Error(error.error || 'Export failed')
        }

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = 'participants-export.csv'
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/)
            if (filenameMatch) {
                filename = filenameMatch[1]
            }
        }

        // Download the file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    },
}

// Upload API

export const uploadAPI = {
    uploadImage: async (file: File) => {
        // Compress image before upload
        const options = {
            maxSizeMB: 0.5, // Reduced to 0.5MB to prevent SQLITE_TOOBIG D1 error
            maxWidthOrHeight: 1920,
            useWebWorker: true
        }

        try {
            const compressedFile = await imageCompression(file, options)
            const formData = new FormData()
            formData.append('image', compressedFile)
            return fetchAPI<{ success: boolean; url: string; filename: string }>(
                '/api/uploads/image',
                { method: 'POST', body: formData }
            )
        } catch (error) {
            console.error('Compression failed:', error)
            // Fallback to original file if compression fails
            const formData = new FormData()
            formData.append('image', file)
            return fetchAPI<{ success: boolean; url: string; filename: string }>(
                '/api/uploads/image',
                { method: 'POST', body: formData }
            )
        }
    },
}

// Custom Fields API
export const customFieldsAPI = {
    list: (eventId: string) =>
        fetchAPI<CustomField[]>(`/api/events/${eventId}/custom-fields`),

    create: (eventId: string, data: {
        field_type: 'text' | 'textarea' | 'radio' | 'checkbox'
        label: string
        required: boolean
        options?: string[]
        display_order: number
    }) =>
        fetchAPI<{ message: string; field_id: string }>(
            `/api/events/${eventId}/custom-fields`,
            { method: 'POST', body: JSON.stringify(data) }
        ),

    update: (eventId: string, fieldId: string, data: {
        label?: string
        required?: boolean
        options?: string[]
        display_order?: number
    }) =>
        fetchAPI<{ message: string }>(
            `/api/events/${eventId}/custom-fields/${fieldId}`,
            { method: 'PUT', body: JSON.stringify(data) }
        ),

    delete: (eventId: string, fieldId: string) =>
        fetchAPI<{ message: string }>(
            `/api/events/${eventId}/custom-fields/${fieldId}`,
            { method: 'DELETE' }
        ),
}

// Settings API
export const settingsAPI = {
    getAll: () => fetchAPI<Record<string, any>>('/api/settings'),

    get: (key: string) => fetchAPI<{ key: string; value: any }>(`/api/settings/${key}`),

    save: (key: string, value: any) =>
        fetchAPI<{ message: string; key: string }>(
            '/api/settings',
            { method: 'POST', body: JSON.stringify({ key, value }) }
        ),

    saveBulk: (settings: Record<string, any>) =>
        fetchAPI<{ message: string; count: number }>(
            '/api/settings/bulk',
            { method: 'POST', body: JSON.stringify(settings) }
        ),
}

// Public API
export const publicAPI = {
    events: () => fetchAPI<{ data: PublicEvent[] }>('/api/public/events'),

    event: (slug: string) =>
        fetchAPI<PublicEvent & { ticket_types: TicketType[]; registration_available: boolean }>(
            `/api/public/events/${slug}`
        ),

    dashboardStats: () =>
        fetchAPI<{
            active_events: number
            total_participants: number
            total_revenue: number
            recent_events: Event[]
        }>('/api/public/dashboard/stats'),

    ticket: (registrationId: string) =>
        fetchAPI<{
            registration_id: string
            full_name: string
            email: string
            phone?: string
            city?: string
            ticket_name?: string
            qr_code: string
            payment_status: string
            event_title: string
            event_date: string
            event_time?: string
            location?: string
        }>(`/api/public/ticket/${registrationId}`),

    getLandingConfig: () =>
        fetchAPI<LandingPageConfig>('/api/public/landing-config'),
}

// Landing Page API
export const landingAPI = {
    get: () => fetchAPI<LandingPageConfig>('/api/admin/landing-config'),

    update: (config: LandingPageConfig) =>
        fetchAPI<{ message: string }>(
            '/api/admin/landing-config',
            { method: 'PUT', body: JSON.stringify(config) }
        ),
}

// Types
export interface Event {
    id: string
    organization_id?: string
    title: string
    description?: string
    event_date: string
    event_time?: string
    location?: string
    location_map_url?: string
    capacity?: number
    event_mode: 'free' | 'paid'
    visibility: 'public' | 'private'
    status: 'draft' | 'open' | 'closed'
    image_url?: string
    images?: string[]
    slug?: string
    created_at: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ticket_types?: any[]
}

export interface PublicEvent extends Event {
    registered_count: number
    organization_name?: string
    midtrans_client_key?: string
    midtrans_environment?: string
}

export interface TicketType {
    id: string
    event_id: string
    name: string
    price: number
    quota?: number
    sold_count?: number
}

export interface EventStats {
    total_registered: number
    checked_in: number
    pending_checkin: number
    paid: number
    pending_payment: number
    failed_payment: number
    revenue: number
}

export interface Participant {
    id: string
    event_id: string
    ticket_type_id?: string
    registration_id: string
    full_name: string
    email: string
    phone?: string
    city?: string
    gender?: string
    payment_status: 'pending' | 'paid' | 'failed'
    check_in_status: 'not_arrived' | 'checked_in'
    check_in_time?: string
    qr_code?: string
    ticket_name?: string
    ticket_price?: number
    event_title?: string
    whatsapp_status?: 'pending' | 'sent' | 'failed'
    whatsapp_sent_at?: string
    created_at: string
}

export interface CustomField {
    id: string
    event_id: string
    field_type: 'text' | 'textarea' | 'radio' | 'checkbox'
    label: string
    required: boolean
    options?: string[]
    display_order: number
    created_at: string
}

export interface Payment {
    id: string
    participant_id: string
    order_id: string
    amount: number
    status: 'pending' | 'paid' | 'failed' | 'refunded'
    payment_type?: string
    created_at: string
    full_name?: string
    email?: string
    event_title?: string
}

// Payments API
export const paymentsAPI = {
    create: (data: {
        participantId: string
        amount: number
        itemName?: string
        customerName?: string
        customerEmail?: string
        customerPhone?: string
    }) =>
        fetchAPI<{ paymentId: string; orderId: string; token: string; redirectUrl: string }>(
            '/api/payments/create',
            { method: 'POST', body: JSON.stringify(data) }
        ),

    get: (orderId: string) =>
        fetchAPI<Payment>(`/api/payments/${orderId}`),

    list: (params?: { limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.limit) query.set('limit', params.limit.toString())
        if (params?.offset) query.set('offset', params.offset.toString())
        return fetchAPI<{ data: Payment[] }>(`/api/payments?${query}`)
    },
}

// Organizations API
export const organizationsAPI = {
    get: (id: string) =>
        fetchAPI<Organization>(`/api/organizations/${id}`),

    update: (id: string, data: { name?: string; logo_url?: string }) =>
        fetchAPI<{ message: string }>(`/api/organizations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getMembers: (id: string) =>
        fetchAPI<{ members: User[] }>(`/api/organizations/${id}/members`),

    toggleWaha: (id: string, enabled: boolean) =>
        fetchAPI<{ message: string; waha_enabled: boolean }>(`/api/organizations/${id}/waha-toggle`, {
            method: 'PUT',
            body: JSON.stringify({ enabled }),
        }),

    getWahaStatus: (id: string) =>
        fetchAPI<{ global_enabled: boolean; org_enabled: boolean; available: boolean; api_url: string; connected: boolean; working: boolean; session_status: string; last_error?: string }>(
            `/api/organizations/${id}/waha-status`
        ),
}

// Subscriptions API
export const subscriptionsAPI = {
    getCurrent: () =>
        fetchAPI<Subscription>('/api/subscriptions/current'),

    upgrade: (paymentMethod: 'midtrans' | 'manual') =>
        fetchAPI<{ message: string; payment_id: string; amount: number; payment_method: string }>(
            '/api/subscriptions/upgrade',
            { method: 'POST', body: JSON.stringify({ payment_method: paymentMethod }) }
        ),

    submitPayment: (paymentId: string, paymentProofUrl?: string) =>
        fetchAPI<{ message: string }>('/api/subscriptions/payment', {
            method: 'POST',
            body: JSON.stringify({ payment_id: paymentId, payment_proof_url: paymentProofUrl }),
        }),

    getPaymentStatus: (paymentId: string) =>
        fetchAPI<SubscriptionPayment>(`/api/subscriptions/payment-status/${paymentId}`),
}

// Additional Types

export interface Organization {
    id: string
    name: string
    slug: string
    logo_url?: string
    waha_enabled: number
    created_at: string
    plan?: string
    subscription_status?: string
}

export interface User {
    id: string
    email: string
    name: string
    role: string
    created_at: string
}

export interface Subscription {
    id: string
    organization_id: string
    plan: 'nonprofit' | 'profit'
    status: 'active' | 'pending_payment' | 'canceled' | 'expired'
    payment_method?: string
    payment_status?: string
    payment_proof_url?: string
    amount: number
    started_at: string
    expires_at?: string
    created_at: string
}

export interface SubscriptionPayment {
    id: string
    subscription_id: string
    organization_id: string
    amount: number
    payment_method: string
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
    payment_proof_url?: string
    approved_by?: string
    approved_at?: string
    period_start: string
    period_end: string
    created_at: string
}

export interface LandingPageConfig {
    header?: {
        logoUrl?: string
        brandName?: string
        menuItems?: Array<{ label: string; link: string }>
        authButtons?: {
            loginLabel?: string
            loginLink?: string
            ctaLabel?: string
            ctaLink?: string
        }
    }
    hero?: {
        badge?: string
        title?: string
        titleHighlight?: string
        description?: string
        ctaPrimary?: string
        ctaPrimaryLink?: string
        ctaSecondary?: string
        ctaSecondaryLink?: string
        trustedBy?: string
        image?: string
    }
    features?: {
        title?: string
        subtitle?: string
        description?: string
        items?: Array<{
            icon: string
            title: string
            description: string
        }>
    }
    pricing?: {
        title?: string
        subtitle?: string
        description?: string
        items?: Array<{
            name: string
            description: string
            price: string
            period: string
            popular?: boolean
            features: Array<{ text: string; included: boolean }>
        }>
        buttonLink?: string
    }
    cta?: {
        title?: string
        description?: string
        buttonText?: string
        buttonLink?: string
        note?: string
    }
}
