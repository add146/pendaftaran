import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { superAdminAPI } from '../../lib/api'
import { Link } from 'react-router-dom'

function StatCard({ icon, label, value, color = 'primary' }: {
    icon: string
    label: string
    value: string | number
    color?: string
}) {
    const colorClasses = {
        primary: 'bg-primary/10 text-primary',
        blue: 'bg-blue-600/10 text-blue-600',
        green: 'bg-green-600/10 text-green-600',
        purple: 'bg-purple-600/10 text-purple-600',
        orange: 'bg-orange-600/10 text-orange-600'
    }

    return (
        <div className="p-6 rounded-xl bg-surface-light border border-border-light shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className={`flex items-center justify-center size-12 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
                    <span className="material-symbols-outlined text-[28px]">{icon}</span>
                </div>
            </div>
            <p className="text-text-sub text-sm font-medium">{label}</p>
            <h3 className="text-3xl font-bold text-text-main mt-1">{value}</h3>
        </div>
    )
}

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            setLoading(true)
            const data = await superAdminAPI.getStats()
            setStats(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load statistics')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <AdminLayout title="Super Admin Dashboard" currentPage="super-dashboard">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </AdminLayout>
        )
    }

    if (error) {
        return (
            <AdminLayout title="Super Admin Dashboard" currentPage="super-dashboard">
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                </div>
            </AdminLayout>
        )
    }

    const nonprofitCount = stats?.organizations_by_plan.find((p: any) => p.plan === 'nonprofit')?.count || 0
    const profitCount = stats?.organizations_by_plan.find((p: any) => p.plan === 'profit')?.count || 0

    return (
        <AdminLayout title="Super Admin Dashboard" currentPage="super-dashboard">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-text-main">System Overview</h1>
                    <p className="text-text-sub mt-1">Manage all organizations and subscriptions</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        icon="apartment"
                        label="Total Organizations"
                        value={stats?.total_organizations || 0}
                        color="primary"
                    />
                    <StatCard
                        icon="group"
                        label="Total Users"
                        value={stats?.total_users || 0}
                        color="blue"
                    />
                    <StatCard
                        icon="event"
                        label="Total Events"
                        value={stats?.total_events || 0}
                        color="green"
                    />
                    <StatCard
                        icon="pending_actions"
                        label="Pending Approvals"
                        value={stats?.pending_subscription_approvals || 0}
                        color="orange"
                    />
                </div>

                {/* Organizations by Plan */}
                <div className="bg-surface-light rounded-xl border border-border-light p-6">
                    <h2 className="text-lg font-semibold text-text-main mb-4">Organizations by Plan</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-green-600 font-medium text-sm">Non-Profit</div>
                            <div className="text-2xl font-bold text-green-900 mt-1">{nonprofitCount}</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-blue-600 font-medium text-sm">Profit</div>
                            <div className="text-2xl font-bold text-blue-900 mt-1">{profitCount}</div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        to="/super-admin/organizations"
                        className="p-4 bg-surface-light border border-border-light rounded-lg hover:bg-background-light transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">apartment</span>
                            <span className="font-medium text-text-main">Manage Organizations</span>
                        </div>
                    </Link>
                    <Link
                        to="/super-admin/pending-subscriptions"
                        className="p-4 bg-surface-light border border-border-light rounded-lg hover:bg-background-light transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-orange-600">approval</span>
                            <span className="font-medium text-text-main">Pending Approvals</span>
                        </div>
                    </Link>
                    <Link
                        to="/super-admin/users"
                        className="p-4 bg-surface-light border border-border-light rounded-lg hover:bg-background-light transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-blue-600">manage_accounts</span>
                            <span className="font-medium text-text-main">Manage Users</span>
                        </div>
                    </Link>
                </div>
            </div>
        </AdminLayout>
    )
}
