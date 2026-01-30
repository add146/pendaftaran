import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '../components/layout/AdminLayout'
import { paymentsAPI, type Payment } from '../lib/api'
import { formatDateWIB } from '../lib/timezone'

export default function Payments() {
    const { t } = useTranslation()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        paymentsAPI.list()
            .then(data => {
                setPayments(data.data || [])
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setError(t('admin.payments.error_loading'))
                setLoading(false)
            })
    }, [])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }



    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            refunded: 'bg-gray-100 text-gray-800'
        }
        return styles[status] || 'bg-gray-100 text-gray-800'
    }

    const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
    const pendingPayments = payments.filter(p => p.status === 'pending').length

    return (
        <AdminLayout title={t('admin.payments.title')} currentPage="payments" showCreateButton={false}>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600">payments</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin.payments.stats.total_revenue')}</p>
                                <p className="text-xl font-bold text-text-main">{formatCurrency(totalRevenue)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-yellow-600">pending</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin.payments.stats.pending_payments')}</p>
                                <p className="text-xl font-bold text-text-main">{pendingPayments}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600">receipt_long</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin.payments.stats.total_transactions')}</p>
                                <p className="text-xl font-bold text-text-main">{payments.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Midtrans Setup Card */}
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-lg bg-primary/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">credit_card</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-text-main">{t('admin.payments.midtrans.title')}</h3>
                                <p className="text-sm text-gray-600">{t('admin.payments.midtrans.desc')}</p>
                            </div>
                        </div>
                        <a
                            href="https://dashboard.sandbox.midtrans.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            {t('admin.payments.midtrans.button')}
                        </a>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-text-main">{t('admin.payments.table.recent_title')}</h3>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500">
                            <span className="material-symbols-outlined text-[40px] mb-2">error</span>
                            <p>{error}</p>
                        </div>
                    ) : payments.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">{t('admin.payments.table.order_id')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">{t('admin.payments.table.customer')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">{t('admin.payments.table.event')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">{t('admin.payments.table.amount')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">{t('admin.payments.table.status')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">{t('admin.payments.table.date')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm">{payment.order_id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium">{payment.full_name || '-'}</p>
                                                    <p className="text-sm text-gray-500">{payment.email || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{payment.event_title || '-'}</td>
                                            <td className="px-6 py-4 font-medium">{formatCurrency(payment.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{formatDateWIB(payment.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">receipt_long</span>
                            <p className="font-medium">{t('admin.payments.no_data.title')}</p>
                            <p className="text-sm mt-1">{t('admin.payments.no_data.desc')}</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
