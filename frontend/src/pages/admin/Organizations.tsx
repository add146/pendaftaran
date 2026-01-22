import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { superAdminAPI } from '../../lib/api'

interface Organization {
    id: string
    name: string
    slug: string
    logo_url: string | null
    waha_enabled: number
    created_at: string
    plan: string
    subscription_status: string
    user_count: number
    event_count: number
}

export default function Organizations() {
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Create form
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newOrg, setNewOrg] = useState({ name: '', slug: '', plan: 'nonprofit' as 'nonprofit' | 'profit' })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const data = await superAdminAPI.getOrganizations()
            setOrganizations(data.organizations)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load organizations')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setCreating(true)
            setError('')
            await superAdminAPI.createOrganization(newOrg)
            setSuccess('Organization created successfully!')
            setShowCreateForm(false)
            setNewOrg({ name: '', slug: '', plan: 'nonprofit' })
            await loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create organization')
        } finally {
            setCreating(false)
        }
    }

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }

    if (loading) {
        return (
            <AdminLayout title="Manage Organizations">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading organizations...</div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout title="Manage Organizations">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-text-main">Manage Organizations</h1>
                        <p className="text-text-sub mt-1">Create and manage organizations</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium"
                    >
                        <span className="material-symbols-outlined">add_business</span>
                        Create Organization
                    </button>
                </div>

                {/* Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                        {error}
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between items-center">
                        {success}
                        <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">×</button>
                    </div>
                )}

                {/* Create Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold text-text-main mb-4">Create New Organization</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                    <input
                                        type="text"
                                        value={newOrg.name}
                                        onChange={(e) => {
                                            const name = e.target.value
                                            setNewOrg({ ...newOrg, name, slug: generateSlug(name) })
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        placeholder="Masjid Al-Ikhlas"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                                    <input
                                        type="text"
                                        value={newOrg.slug}
                                        onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        placeholder="masjid-al-ikhlas"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Auto-generated from name if empty</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${newOrg.plan === 'nonprofit' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input
                                                type="radio"
                                                name="plan"
                                                value="nonprofit"
                                                checked={newOrg.plan === 'nonprofit'}
                                                onChange={() => setNewOrg({ ...newOrg, plan: 'nonprofit' })}
                                                className="sr-only"
                                            />
                                            <div>
                                                <div className="font-semibold text-text-main">Non-Profit</div>
                                                <div className="text-xs text-gray-500">Free - For masjid, yayasan, etc</div>
                                            </div>
                                        </label>
                                        <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${newOrg.plan === 'profit' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input
                                                type="radio"
                                                name="plan"
                                                value="profit"
                                                checked={newOrg.plan === 'profit'}
                                                onChange={() => setNewOrg({ ...newOrg, plan: 'profit' })}
                                                className="sr-only"
                                            />
                                            <div>
                                                <div className="font-semibold text-text-main">Profit</div>
                                                <div className="text-xs text-gray-500">Paid - For businesses</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50"
                                    >
                                        {creating ? 'Creating...' : 'Create Organization'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Organizations Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {organizations.map(org => (
                        <div key={org.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 rounded-lg size-12 flex items-center justify-center text-primary shrink-0">
                                    <span className="material-symbols-outlined">apartment</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-text-main truncate">{org.name}</h3>
                                    <p className="text-sm text-gray-500 truncate">/{org.slug}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="text-lg font-bold text-text-main">{org.user_count}</div>
                                    <div className="text-xs text-gray-500">Users</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-text-main">{org.event_count}</div>
                                    <div className="text-xs text-gray-500">Events</div>
                                </div>
                                <div>
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${org.plan === 'nonprofit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {org.plan === 'nonprofit' ? 'Non-Profit' : 'Profit'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-400">
                                Created: {new Date(org.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {organizations.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            No organizations found. Create your first organization above.
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
