import { useState, useEffect } from 'react'
import { donationsAPI, type Donation } from '../lib/api'
import { formatDateWIB } from '../lib/timezone'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Donations() {
    const { t } = useTranslation()
    const [donations, setDonations] = useState<Donation[]>([])
    const [stats, setStats] = useState({ total_donors: 0, total_amount: 0 })
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
    const limit = 20

    useEffect(() => {
        loadData()
    }, [page, dateFilter])

    const getDateParams = () => {
        const now = new Date()
        let start_date = undefined
        let end_date = undefined

        if (dateFilter === 'today') {
            start_date = now.toISOString().split('T')[0]
            end_date = now.toISOString().split('T')[0]
        } else if (dateFilter === 'week') {
            const first = now.getDate() - now.getDay()
            const firstDate = new Date(now.setDate(first))
            start_date = firstDate.toISOString().split('T')[0]
            end_date = new Date().toISOString().split('T')[0]
        } else if (dateFilter === 'month') {
            const firstDate = new Date(now.getFullYear(), now.getMonth(), 1)
            start_date = firstDate.toISOString().split('T')[0]
            const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            end_date = lastDate.toISOString().split('T')[0]
        }

        return { start_date, end_date }
    }

    const loadData = async () => {
        setLoading(true)
        try {
            const { start_date, end_date } = getDateParams()
            const params = { limit, offset: (page - 1) * limit, start_date, end_date }

            const [listData, statsData] = await Promise.all([
                donationsAPI.list(params),
                donationsAPI.stats({ start_date, end_date })
            ])
            setDonations(listData.data)
            setStats(statsData)
        } catch (error) {
            console.error('Error loading donations:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async () => {
        try {
            const { start_date, end_date } = getDateParams()
            const blob = await donationsAPI.export({ start_date, end_date })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `donations-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Error exporting CSV:', error)
            alert(t('admin.donations.export_error'))
        }
    }

    const formatRp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`


    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <Helmet>
                <title>{t('admin.donations.title')} - Dashboard</title>
            </Helmet>

            <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{t('admin.donations.title')}</h1>
                        <p className="text-gray-500">{t('admin.donations.subtitle')}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {[
                            { id: 'all', label: t('admin.donations.filter.all') },
                            { id: 'today', label: t('admin.donations.filter.today') },
                            { id: 'week', label: t('admin.donations.filter.week') },
                            { id: 'month', label: t('admin.donations.filter.month') },
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => { setDateFilter(filter.id as any); setPage(1) }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === filter.id
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            {t('common.export_csv')}
                        </button>
                        <button onClick={loadData} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                            <span className="material-symbols-outlined text-gray-600">refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
                        <span className="material-symbols-outlined text-[28px]">volunteer_activism</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">{t('admin.donations.stats.total_amount')} {dateFilter !== 'all' ? `(${t(`admin.donations.filter.${dateFilter}`)})` : ''}</p>
                        <h3 className="text-2xl font-bold text-gray-800">{formatRp(stats.total_amount)}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <span className="material-symbols-outlined text-[28px]">group</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">{t('admin.donations.stats.total_donors')} {dateFilter !== 'all' ? `(${t(`admin.donations.filter.${dateFilter}`)})` : ''}</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total_donors} {t('common.people')}</h3>
                    </div>
                </div>
            </div>

            {/* Donations Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">{t('admin.donations.table.donor')}</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">{t('admin.donations.table.event')}</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">{t('admin.donations.table.amount')}</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">{t('admin.donations.table.status')}</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">{t('admin.donations.table.date')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">{t('common.loading')}</td>
                                </tr>
                            ) : donations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">{t('admin.donations.no_data')}</td>
                                </tr>
                            ) : (
                                donations.map((donation) => (
                                    <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-gray-900">{donation.donor_name || 'Anonymous'}</div>
                                            <div className="text-sm text-gray-500">{donation.donor_email}</div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{donation.event_title}</td>
                                        <td className="py-4 px-6 font-medium text-gray-900">{formatRp(donation.amount)}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${donation.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                donation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {donation.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{formatDateWIB(donation.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-gray-100 p-4 flex items-center justify-between">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                        {t('common.previous')}
                    </button>
                    <span className="text-sm text-gray-600">{t('common.page')} {page}</span>
                    <button
                        disabled={donations.length < limit}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                        {t('common.next')}
                    </button>
                </div>
            </div>
        </div>
    )
}
