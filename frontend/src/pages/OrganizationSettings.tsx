import { useState, useEffect } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import { organizationsAPI, subscriptionsAPI, type Subscription, type User } from '../lib/api'

export default function OrganizationSettings() {
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [members, setMembers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [wahaEnabled, setWahaEnabled] = useState(false)
    const [wahaAvailable, setWahaAvailable] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Form states
    const [orgName, setOrgName] = useState('')
    const [logoUrl, setLogoUrl] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)

            // Get orgId from auth.me() API call first
            const { organizationsAPI: orgsAPI, authAPI } = await import('../lib/api')
            let orgId = localStorage.getItem('orgId')

            // If not in localStorage, fetch from /me endpoint
            if (!orgId) {
                const meData = await authAPI.me()
                orgId = meData.organization_id
                if (orgId) {
                    localStorage.setItem('orgId', orgId)
                }
            }

            if (!orgId) {
                setError('Organization ID not found. Please login again.')
                setLoading(false)
                return
            }

            // Load organization data
            const [orgData, subData, membersData, wahaStatus] = await Promise.all([
                orgsAPI.get(orgId),
                subscriptionsAPI.getCurrent(),
                orgsAPI.getMembers(orgId),
                orgsAPI.getWahaStatus(orgId),
            ])

            setSubscription(subData)
            setMembers(membersData.members)
            setWahaEnabled(orgData.waha_enabled === 1)
            setWahaAvailable(wahaStatus.available)

            // Set form values
            setOrgName(orgData.name)
            setLogoUrl(orgData.logo_url || '')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSaving(true)
            setError('')
            setSuccess('')

            const orgId = localStorage.getItem('orgId')
            if (!orgId) throw new Error('Organization ID not found')

            await organizationsAPI.update(orgId, {
                name: orgName,
                logo_url: logoUrl || undefined,
            })

            setSuccess('Organization profile updated successfully')
            await loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleWaha = async () => {
        try {
            setSaving(true)
            setError('')
            const orgId = localStorage.getItem('orgId')
            if (!orgId) throw new Error('Organization ID not found')

            await organizationsAPI.toggleWaha(orgId, !wahaEnabled)
            setWahaEnabled(!wahaEnabled)
            setSuccess(`WAHA ${!wahaEnabled ? 'enabled' : 'disabled'} successfully`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to toggle WAHA')
        } finally {
            setSaving(false)
        }
    }

    const handleUpgrade = async () => {
        if (!confirm('Upgrade to Profit plan for Rp 500,000/year?')) return

        try {
            setSaving(true)
            setError('')

            const result = await subscriptionsAPI.upgrade('manual')
            setSuccess(`${result.message} Payment ID: ${result.payment_id}`)
            await loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upgrade subscription')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading organization settings...</div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        {success}
                    </div>
                )}

                {/* Profile Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Profile</h2>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Organization Name
                            </label>
                            <input
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Logo URL (optional)
                            </label>
                            <input
                                type="url"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>

                {/* Subscription Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Subscription</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Current Plan:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${subscription?.plan === 'nonprofit'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                                }`}>
                                {subscription?.plan === 'nonprofit' ? 'Non-Profit (Free)' : 'Profit'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Status:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${subscription?.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {subscription?.status}
                            </span>
                        </div>

                        {subscription?.plan === 'nonprofit' && (
                            <button
                                onClick={handleUpgrade}
                                disabled={saving}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 mt-4"
                            >
                                Upgrade to Profit - Rp 500,000/year
                            </button>
                        )}

                        {subscription?.expires_at && (
                            <div className="text-sm text-gray-600 mt-2">
                                Expires: {new Date(subscription.expires_at).toLocaleDateString('id-ID')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Members Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Team Members</h2>
                    <div className="space-y-2">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                <div>
                                    <div className="font-medium">{member.name}</div>
                                    <div className="text-sm text-gray-600">{member.email}</div>
                                </div>
                                <span className="text-sm text-gray-500 capitalize">{member.role}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* WAHA Integration */}
                {wahaAvailable && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">WhatsApp Integration (WAHA)</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">Enable WhatsApp Notifications</div>
                                <div className="text-sm text-gray-600">
                                    Send event tickets via WhatsApp automatically
                                </div>
                            </div>
                            <button
                                onClick={handleToggleWaha}
                                disabled={saving}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wahaEnabled ? 'bg-green-600' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wahaEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
