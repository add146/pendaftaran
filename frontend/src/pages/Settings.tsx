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
                                    <div className="space-y-4">
                                        {[
                                            { name: 'Midtrans', desc: 'Payment gateway for paid events', icon: 'payments', connected: false, url: 'https://dashboard.sandbox.midtrans.com' },
                                            { name: 'WhatsApp (WAHA)', desc: 'Send QR tickets via WhatsApp', icon: 'chat', connected: false, url: '#' },
                                            { name: 'Google Calendar', desc: 'Sync events with calendar', icon: 'calendar_month', connected: false, url: '#' },
                                        ].map((integration) => (
                                            <div key={integration.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <span className="material-symbols-outlined">{integration.icon}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-text-main">{integration.name}</h4>
                                                        <p className="text-sm text-gray-500">{integration.desc}</p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={integration.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${integration.connected
                                                        ? 'bg-gray-100 text-gray-600'
                                                        : 'bg-primary hover:bg-primary-hover text-white'
                                                        }`}
                                                >
                                                    {integration.connected ? 'Connected' : 'Configure'}
                                                    {!integration.connected && <span className="material-symbols-outlined text-[16px]">open_in_new</span>}
                                                </a>
                                            </div>
                                        ))}

                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3 mt-6">
                                            <span className="material-symbols-outlined text-blue-500">info</span>
                                            <div>
                                                <p className="text-sm text-blue-800">
                                                    <strong>Note:</strong> To configure integrations, you need to set environment variables in your Cloudflare Workers dashboard.
                                                </p>
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
