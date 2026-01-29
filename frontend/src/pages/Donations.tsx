
import { useState, useEffect } from 'react'
import { donationsAPI, type Donation } from '../lib/api'
import { Helmet } from 'react-helmet-async'

export default function Donations() {
    const [donations, setDonations] = useState<Donation[]>([])
    const [stats, setStats] = useState({ total_donors: 0, total_amount: 0 })
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const limit = 20

    useEffect(() => {
        loadData()
    }, [page])

    const loadData = async () => {
        setLoading(true)
        try {
            const [listData, statsData] = await Promise.all([
                donationsAPI.list({ limit, offset: (page - 1) * limit }),
                donationsAPI.stats()
            ])
            setDonations(listData.data)
            setStats(statsData)
        } catch (error) {
            console.error('Error loading donations:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatRp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <Helmet>
                <title>Donations - Dashboard</title>
            </Helmet>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Donations</h1>
                    <p className="text-gray-500">Manage and track event donations</p>
                </div>
                <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-gray-600">refresh</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
                        <span className="material-symbols-outlined text-[28px]">volunteer_activism</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Donasi Terkumpul</p>
                        <h3 className="text-2xl font-bold text-gray-800">{formatRp(stats.total_amount)}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <span className="material-symbols-outlined text-[28px]">group</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Donatur</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total_donors} Orang</h3>
                    </div>
                </div>
            </div>

            {/* Donations Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Donatur</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Event</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Jumlah</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">Loading data...</td>
                                </tr>
                            ) : donations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">Belum ada donasi</td>
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
                                        <td className="py-4 px-6 text-sm text-gray-500">{formatDate(donation.created_at)}</td>
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
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {page}</span>
                    <button
                        disabled={donations.length < limit}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
