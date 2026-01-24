import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import { authAPI, settingsAPI, uploadAPI } from '../lib/api'

interface UserProfile {
    id: string
    name: string
    email: string
    organization: string
}

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general')
    const [_profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // Form states
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [orgName, setOrgName] = useState('')
    const [orgAddress, setOrgAddress] = useState('')
    const [orgLogo, setOrgLogo] = useState('')
    const [notifications, setNotifications] = useState({
        email: true,
        whatsapp: false,
        daily: true
    })

    // Midtrans configuration
    const [midtransConfig, setMidtransConfig] = useState({
        environment: 'sandbox' as 'sandbox' | 'production',
        sandbox_server_key: '',
        sandbox_client_key: '',
        production_server_key: '',
        production_client_key: ''
    })

    // Bank Account configuration for manual payment
    const [bankConfig, setBankConfig] = useState({
        bank_name: '',
        account_holder_name: '',
        account_number: ''
    })

    // WAHA WhatsApp Gateway configuration
    const [wahaConfig, setWahaConfig] = useState({
        enabled: false,
        api_url: '',
        api_key: '',
        session: 'default'
    })

    useEffect(() => {
        // Debug: check if token exists
        const token = localStorage.getItem('auth_token')
        console.log('Auth token exists:', !!token, token ? token.substring(0, 20) + '...' : 'null')

        authAPI.me()
            .then(data => {
                setProfile(data)
                setName(data.name)
                setEmail(data.email)
                setOrgName(data.organization || '')
                setLoading(false)
            })
            .catch(() => {
                setLoading(false)
            })

        // Load Midtrans settings
        settingsAPI.get('midtrans_config')
            .then(data => {
                console.log('Loaded Midtrans config:', data)
                if (data && data.value) {
                    setMidtransConfig(data.value)
                }
            })
            .catch((err) => {
                console.log('No Midtrans config found or error:', err.message)
            })

        // Load bank account settings
        settingsAPI.get('bank_config')
            .then(data => {
                console.log('Loaded Bank config:', data)
                if (data && data.value) {
                    setBankConfig(data.value)
                }
            })
            .catch((err) => {
                console.log('No Bank config found or error:', err.message)
            })

        // Load WAHA settings
        settingsAPI.get('waha_config')
            .then(data => {
                console.log('Loaded WAHA config:', data)
                if (data && data.value) {
                    setWahaConfig(data.value)
                }
            })
            .catch((err) => {
                console.log('No WAHA config found or error:', err.message)
            })

        // Load notification preferences
        settingsAPI.get('notification_preferences')
            .then(data => {
                console.log('Loaded notification preferences:', data)
                if (data && data.value) {
                    setNotifications(data.value)
                }
            })
            .catch((err) => {
                console.log('No notification preferences found or error:', err.message)
            })

        // Load organization settings
        settingsAPI.get('organization_address')
            .then(data => {
                if (data && data.value) {
                    setOrgAddress(data.value)
                }
            })
            .catch((err) => {
                console.log('No organization address found:', err.message)
            })

        settingsAPI.get('organization_logo')
            .then(data => {
                if (data && data.value) {
                    setOrgLogo(data.value)
                }
            })
            .catch((err) => {
                console.log('No organization logo found:', err.message)
            })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage('')

        try {
            // Save all configs individually to match backend expectations
            console.log('Saving Midtrans config:', midtransConfig)

            // Save Midtrans keys individually
            await settingsAPI.save('midtrans_environment', midtransConfig.environment)
            await settingsAPI.save('midtrans_client_key', midtransConfig.environment === 'production' ? midtransConfig.production_client_key : midtransConfig.sandbox_client_key)
            await settingsAPI.save('midtrans_server_key', midtransConfig.environment === 'production' ? midtransConfig.production_server_key : midtransConfig.sandbox_server_key)

            // Still save the full config object for UI state persistence
            await settingsAPI.save('midtrans_config', midtransConfig)

            // Save other configs
            console.log('Saving Bank config:', bankConfig)
            console.log('Saving WAHA config:', wahaConfig)

            // Save Bank keys individually
            await settingsAPI.save('bank_name', bankConfig.bank_name)
            await settingsAPI.save('account_holder_name', bankConfig.account_holder_name)
            await settingsAPI.save('account_number', bankConfig.account_number)
            await settingsAPI.save('bank_config', bankConfig) // Keep for UI state

            // Save WAHA keys individually
            await settingsAPI.save('waha_enabled', wahaConfig.enabled.toString()) // Backend expects "true"/"false" string
            await settingsAPI.save('waha_api_url', wahaConfig.api_url)
            await settingsAPI.save('waha_api_key', wahaConfig.api_key)
            await settingsAPI.save('waha_session', wahaConfig.session)
            await settingsAPI.save('waha_config', wahaConfig) // Keep for UI state

            // Save notification preferences
            console.log('Saving notification preferences:', notifications)
            await settingsAPI.save('notification_preferences', notifications)

            // Save organization settings
            console.log('Saving organization settings')
            await settingsAPI.save('organization_address', orgAddress)
            if (orgLogo) {
                await settingsAPI.save('organization_logo', orgLogo)
            }

            setMessage('Semua konfigurasi berhasil disimpan!')
        } catch (err: any) {
            console.error('Save error:', err)
            setMessage('Gagal menyimpan: ' + (err.message || 'Unknown error'))
        }

        setSaving(false)
        setTimeout(() => setMessage(''), 5000)
    }

    // Handle logo upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setSaving(true)
            setMessage('')

            const result = await uploadAPI.uploadImage(file)
            setOrgLogo(result.url)
            setMessage('Logo berhasil diupload!')
        } catch (err: any) {
            console.error('Upload error:', err)
            setMessage('Gagal upload logo: ' + (err.message || 'Unknown error'))
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(''), 5000)
        }
    }

    // Save profile to users table (separate from settings)
    const handleProfileSave = async () => {
        setSaving(true)
        setMessage('')

        try {
            await authAPI.updateProfile({ name, email })

            // Update localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            user.name = name
            user.email = email
            localStorage.setItem('user', JSON.stringify(user))

            setMessage('Profil berhasil diperbarui!')
        } catch (err: any) {
            console.error('Profile save error:', err)
            setMessage('Gagal menyimpan profil: ' + (err.message || 'Unknown error'))
        }

        setSaving(false)
        setTimeout(() => setMessage(''), 5000)
    }


    // Get user role
    const getUserRole = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            return user.role || 'user'
        } catch {
            return 'user'
        }
    }
    const userRole = getUserRole()
    const isAdmin = userRole === 'admin' || userRole === 'super_admin'
    const isSuperAdmin = userRole === 'super_admin'

    const allTabs = [
        { id: 'general', label: 'General', icon: 'settings' },
        { id: 'organization', label: 'Organization', icon: 'business' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'integrations', label: 'Integrations', icon: 'extension' },
    ]

    // Filter tabs based on role:
    // - users: only General
    // - admin & super_admin: all tabs
    const tabs = isAdmin ? allTabs : allTabs.filter(tab => tab.id === 'general')

    return (
        <AdminLayout title="Settings" currentPage="settings" showCreateButton={false}>
            <div className="p-4 md:p-6 lg:p-8 w-full max-w-5xl mx-auto">
                {/* Success Message */}
                {message && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                        <span className="material-symbols-outlined">check_circle</span>
                        {message}
                    </div>
                )}

                <div className="w-full">
                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {/* General Settings */}
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h3 className="font-bold text-text-main mb-4">Profile Settings</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleProfileSave}
                                            disabled={saving}
                                            className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save Profile'}
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h3 className="font-bold text-text-main mb-4">Security</h3>
                                        <Link
                                            to="/profile"
                                            className="inline-block px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50"
                                        >
                                            Change Password
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Organization Settings */}
                            {activeTab === 'organization' && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                    <h3 className="font-bold text-text-main mb-4">Organization Details</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                            <input
                                                type="text"
                                                value={orgName}
                                                onChange={(e) => setOrgName(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                            <textarea
                                                rows={3}
                                                value={orgAddress}
                                                onChange={(e) => setOrgAddress(e.target.value)}
                                                placeholder="Enter organization address"
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                                            <div className="flex items-center gap-4">
                                                <div className="size-20 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                                                    {orgLogo ? (
                                                        <img src={orgLogo} alt="Organization Logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-primary text-[32px]">business</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    id="logo-upload"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="hidden"
                                                />
                                                <label
                                                    htmlFor="logo-upload"
                                                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 cursor-pointer"
                                                >
                                                    Upload Logo
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}

                            {/* Notifications Settings */}
                            {activeTab === 'notifications' && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                    <h3 className="font-bold text-text-main mb-4">Notification Preferences</h3>
                                    <div className="space-y-4">
                                        {[
                                            { key: 'email', label: 'Email notifications for new registrations', checked: notifications.email, superAdminOnly: true },
                                            { key: 'whatsapp', label: 'WhatsApp notifications', checked: notifications.whatsapp, superAdminOnly: false },
                                            { key: 'daily', label: 'Daily summary report', checked: notifications.daily, superAdminOnly: true },
                                        ]
                                            .filter(item => !item.superAdminOnly || isSuperAdmin)
                                            .map((item) => (
                                                <label key={item.key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.checked}
                                                        onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                        className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                                                    />
                                                    <span className="text-sm text-gray-700">{item.label}</span>
                                                </label>
                                            ))}
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            )}

                            {/* Integrations Settings */}
                            {activeTab === 'integrations' && (
                                <div className="space-y-6">
                                    {/* Midtrans Configuration */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-blue-600">payments</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-text-main">Midtrans Payment Gateway</h3>
                                                <p className="text-sm text-gray-500">Configure online payments for your events</p>
                                            </div>
                                        </div>

                                        {/* Environment Toggle */}
                                        <div className="bg-gray-50 p-4 rounded-lg mb-6 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium text-text-main">Environment</h4>
                                                <p className="text-xs text-gray-500">Select Sandbox for testing, Production for real payments</p>
                                            </div>
                                            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                                                <button
                                                    onClick={() => setMidtransConfig({ ...midtransConfig, environment: 'sandbox' })}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${midtransConfig.environment === 'sandbox'
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Sandbox
                                                </button>
                                                <button
                                                    onClick={() => setMidtransConfig({ ...midtransConfig, environment: 'production' })}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${midtransConfig.environment === 'production'
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Production
                                                </button>
                                            </div>
                                        </div>

                                        {/* Keys Configuration */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Sandbox Keys</h4>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Server Key</label>
                                                    <input
                                                        type="password"
                                                        placeholder="SB-Mid-server-..."
                                                        value={midtransConfig.sandbox_server_key}
                                                        onChange={(e) => setMidtransConfig({ ...midtransConfig, sandbox_server_key: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800 font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Key</label>
                                                    <input
                                                        type="text"
                                                        placeholder="SB-Mid-client-..."
                                                        value={midtransConfig.sandbox_client_key}
                                                        onChange={(e) => setMidtransConfig({ ...midtransConfig, sandbox_client_key: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800 font-mono"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Production Keys</h4>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Server Key</label>
                                                    <input
                                                        type="password"
                                                        placeholder="Mid-server-..."
                                                        value={midtransConfig.production_server_key}
                                                        onChange={(e) => setMidtransConfig({ ...midtransConfig, production_server_key: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800 font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Key</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Mid-client-..."
                                                        value={midtransConfig.production_client_key}
                                                        onChange={(e) => setMidtransConfig({ ...midtransConfig, production_client_key: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800 font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notification URL Instructions */}
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                                            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">info</span>
                                                Pengaturan Notification URL
                                            </h4>
                                            <p className="text-sm text-amber-700 mb-3">
                                                Untuk menerima status pembayaran otomatis dari Midtrans, tambahkan URL berikut di akun Midtrans:
                                            </p>
                                            <div className="bg-white border border-amber-300 rounded-lg p-3 mb-3">
                                                <code className="text-xs sm:text-sm font-mono text-gray-800 break-all">
                                                    https://pendaftaran-qr-api.khibroh.workers.dev/api/payments/notification
                                                </code>
                                            </div>
                                            <p className="text-xs text-amber-600 mb-3">
                                                <strong>Langkah:</strong> Login ke Midtrans Dashboard → Settings → Payment → Notification URL → Paste URL di atas → Save
                                            </p>
                                            <img
                                                src="/midtrans-notification-url.png"
                                                alt="Midtrans Notification URL Setup"
                                                className="w-full rounded-lg border border-gray-200 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Bank Account Configuration - Super Admin only */}
                                    {isSuperAdmin && (
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="size-12 rounded-lg bg-orange-100 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-orange-600">account_balance</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-text-main">Manual Transfer (Bank Account)</h3>
                                                    <p className="text-sm text-gray-500">Configure bank account for manual transfers</p>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
                                                    <input
                                                        type="text"
                                                        placeholder="contoh: BCA, Mandiri, BRI"
                                                        value={bankConfig.bank_name}
                                                        onChange={(e) => setBankConfig({ ...bankConfig, bank_name: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik Rekening</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Nama sesuai rekening"
                                                        value={bankConfig.account_holder_name}
                                                        onChange={(e) => setBankConfig({ ...bankConfig, account_holder_name: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
                                                    <input
                                                        type="text"
                                                        placeholder="1234567890"
                                                        value={bankConfig.account_number}
                                                        onChange={(e) => setBankConfig({ ...bankConfig, account_number: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800 font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* WAHA WhatsApp Gateway - Super Admin only */}
                                    {isSuperAdmin && (
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-green-600">chat</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-text-main">WhatsApp Gateway (WAHA)</h3>
                                                    <p className="text-sm text-gray-500">Auto-send QR code links via WhatsApp</p>
                                                </div>
                                            </div>

                                            {/* Enable Toggle */}
                                            <div className="mb-6">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={wahaConfig.enabled}
                                                        onChange={(e) => setWahaConfig({ ...wahaConfig, enabled: e.target.checked })}
                                                        className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Enable WhatsApp Notifications</span>
                                                </label>
                                            </div>

                                            {/* Configuration Fields */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">WAHA API URL</label>
                                                    <input
                                                        type="url"
                                                        placeholder="https://your-waha-instance.com"
                                                        value={wahaConfig.api_url}
                                                        onChange={(e) => setWahaConfig({ ...wahaConfig, api_url: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                                                    <input
                                                        type="password"
                                                        placeholder="Your WAHA API key"
                                                        value={wahaConfig.api_key}
                                                        onChange={(e) => setWahaConfig({ ...wahaConfig, api_key: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800 font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="default"
                                                        value={wahaConfig.session}
                                                        onChange={(e) => setWahaConfig({ ...wahaConfig, session: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-white text-gray-800"
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-500 mt-4">
                                                <a href="https://waha.devlike.pro/docs/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                                    Learn more about WAHA →
                                                </a>
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="w-full px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <span className="animate-spin material-symbols-outlined text-[20px]">refresh</span>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[20px]">save</span>
                                                Simpan Semua Konfigurasi
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
