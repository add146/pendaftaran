import { useState, useEffect } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import { authAPI } from '../lib/api'

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

    useEffect(() => {
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
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage('')

        // Simulate save - in production, call API
        await new Promise(resolve => setTimeout(resolve, 500))

        setMessage('Settings saved successfully!')
        setSaving(false)

        setTimeout(() => setMessage(''), 3000)
    }

    const tabs = [
        { id: 'general', label: 'General', icon: 'settings' },
        { id: 'organization', label: 'Organization', icon: 'business' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'integrations', label: 'Integrations', icon: 'extension' },
    ]

    return (
        <div className="flex h-screen w-full bg-background-light">
            <Sidebar currentPage="settings" />

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <Header title="Settings" showCreateButton={false} />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {/* Success Message */}
                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                            <span className="material-symbols-outlined">check_circle</span>
                            {message}
                        </div>
                    )}

                    <div className="max-w-4xl">
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
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                    />
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

                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <h3 className="font-bold text-text-main mb-4">Security</h3>
                                            <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50">
                                                Change Password
                                            </button>
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
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                                <textarea
                                                    rows={3}
                                                    placeholder="Enter organization address"
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="size-20 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-primary text-[32px]">business</span>
                                                    </div>
                                                    <button className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50">
                                                        Upload Logo
                                                    </button>
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
                                                { key: 'email', label: 'Email notifications for new registrations', checked: notifications.email },
                                                { key: 'whatsapp', label: 'WhatsApp notifications', checked: notifications.whatsapp },
                                                { key: 'daily', label: 'Daily summary report', checked: notifications.daily },
                                            ].map((item) => (
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
                                                    <p className="text-sm text-gray-500">Konfigurasi pembayaran otomatis untuk event berbayar</p>
                                                </div>
                                            </div>

                                            {/* Environment Toggle */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                                                <div className="flex gap-4">
                                                    <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${midtransConfig.environment === 'sandbox' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name="midtrans_env"
                                                            value="sandbox"
                                                            checked={midtransConfig.environment === 'sandbox'}
                                                            onChange={() => setMidtransConfig({ ...midtransConfig, environment: 'sandbox' })}
                                                            className="hidden"
                                                        />
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-blue-600">science</span>
                                                            <div>
                                                                <p className="font-medium">Sandbox</p>
                                                                <p className="text-xs text-gray-500">Mode testing/development</p>
                                                            </div>
                                                        </div>
                                                    </label>
                                                    <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${midtransConfig.environment === 'production' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name="midtrans_env"
                                                            value="production"
                                                            checked={midtransConfig.environment === 'production'}
                                                            onChange={() => setMidtransConfig({ ...midtransConfig, environment: 'production' })}
                                                            className="hidden"
                                                        />
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-green-600">verified</span>
                                                            <div>
                                                                <p className="font-medium">Production</p>
                                                                <p className="text-xs text-gray-500">Mode transaksi nyata</p>
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Sandbox Keys */}
                                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                                <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">science</span>
                                                    Sandbox Keys
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Server Key</label>
                                                        <input
                                                            type="password"
                                                            placeholder="SB-Mid-server-xxx"
                                                            value={midtransConfig.sandbox_server_key}
                                                            onChange={(e) => setMidtransConfig({ ...midtransConfig, sandbox_server_key: e.target.value })}
                                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Key</label>
                                                        <input
                                                            type="text"
                                                            placeholder="SB-Mid-client-xxx"
                                                            value={midtransConfig.sandbox_client_key}
                                                            onChange={(e) => setMidtransConfig({ ...midtransConfig, sandbox_client_key: e.target.value })}
                                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-blue-600 mt-2">
                                                    <a href="https://dashboard.sandbox.midtrans.com/settings/config_info" target="_blank" rel="noopener noreferrer" className="underline">
                                                        Dapatkan key di Midtrans Sandbox Dashboard →
                                                    </a>
                                                </p>
                                            </div>

                                            {/* Production Keys */}
                                            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg">
                                                <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">verified</span>
                                                    Production Keys
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Server Key</label>
                                                        <input
                                                            type="password"
                                                            placeholder="Mid-server-xxx"
                                                            value={midtransConfig.production_server_key}
                                                            onChange={(e) => setMidtransConfig({ ...midtransConfig, production_server_key: e.target.value })}
                                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Key</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Mid-client-xxx"
                                                            value={midtransConfig.production_client_key}
                                                            onChange={(e) => setMidtransConfig({ ...midtransConfig, production_client_key: e.target.value })}
                                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-green-600 mt-2">
                                                    <a href="https://dashboard.midtrans.com/settings/config_info" target="_blank" rel="noopener noreferrer" className="underline">
                                                        Dapatkan key di Midtrans Production Dashboard →
                                                    </a>
                                                </p>
                                            </div>

                                            {/* Current Active */}
                                            <div className={`p-3 rounded-lg ${midtransConfig.environment === 'sandbox' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">info</span>
                                                    <span className="text-sm font-medium">
                                                        Active: {midtransConfig.environment === 'sandbox' ? 'Sandbox (Testing)' : 'Production (Live)'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Other Integrations */}
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <h3 className="font-bold text-text-main mb-4">Integrasi Lainnya</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-green-600">chat</span>
                                                        <div>
                                                            <p className="font-medium text-sm">WhatsApp (WAHA)</p>
                                                            <p className="text-xs text-gray-500">Auto-send QR tickets</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400">Coming Soon</span>
                                                </div>
                                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-blue-600">calendar_month</span>
                                                        <div>
                                                            <p className="font-medium text-sm">Google Calendar</p>
                                                            <p className="text-xs text-gray-500">Sync events</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400">Coming Soon</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
