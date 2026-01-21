import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general')

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
                    <div className="max-w-4xl">
                        {/* Tabs */}
                        <div className="flex gap-1 mb-6 border-b border-gray-200">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

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
                                                defaultValue="Imam Ahmed"
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                defaultValue="imam@masjid.com"
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    <button className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">
                                        Save Changes
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
                                            defaultValue="Masjid Al-Ikhlas"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <textarea
                                            rows={3}
                                            defaultValue="Jl. Masjid No. 123, Jakarta"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <button className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">
                                    Save Changes
                                </button>
                            </div>
                        )}

                        {/* Notifications Settings */}
                        {activeTab === 'notifications' && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="font-bold text-text-main mb-4">Notification Preferences</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Email notifications for new registrations', checked: true },
                                        { label: 'WhatsApp notifications', checked: false },
                                        { label: 'Daily summary report', checked: true },
                                    ].map((item, idx) => (
                                        <label key={idx} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                defaultChecked={item.checked}
                                                className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Integrations Settings */}
                        {activeTab === 'integrations' && (
                            <div className="space-y-4">
                                {[
                                    { name: 'Midtrans', desc: 'Payment gateway for paid events', icon: 'payments', connected: false },
                                    { name: 'WhatsApp (WAHA)', desc: 'Send QR tickets via WhatsApp', icon: 'chat', connected: false },
                                    { name: 'Google Calendar', desc: 'Sync events with calendar', icon: 'calendar_month', connected: false },
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
                                        <button className={`px-4 py-2 rounded-lg text-sm font-medium ${integration.connected
                                                ? 'bg-gray-100 text-gray-600'
                                                : 'bg-primary hover:bg-primary-hover text-white'
                                            }`}>
                                            {integration.connected ? 'Connected' : 'Connect'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
