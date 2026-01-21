import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'

export default function Payments() {
    return (
        <div className="flex h-screen w-full bg-background-light">
            <Sidebar currentPage="payments" />

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <Header title="Payments" showCreateButton={false} />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                        <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mb-4">
                            <span className="material-symbols-outlined text-[32px]">payments</span>
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Payment Integration</h2>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Integrate with Midtrans to accept payments for your paid events.
                            Track all transactions and manage refunds from here.
                        </p>
                        <button className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold transition-colors">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            Setup Midtrans
                        </button>
                    </div>

                    {/* Placeholder for future payment list */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-text-main mb-4">Recent Transactions</h3>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-8 text-center text-gray-500">
                                <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">receipt_long</span>
                                <p>No transactions yet</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
