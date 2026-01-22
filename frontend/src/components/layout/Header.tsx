import { Link as _Link } from 'react-router-dom'
import { useWahaStatus } from '../../hooks/useWahaStatus'

interface HeaderProps {
    title?: string
    showCreateButton?: boolean
    user?: {
        name: string
        role: string
        avatar?: string
    }
    onMenuClick?: () => void
}

export default function Header({
    title = 'Dashboard Overview',
    showCreateButton: _showCreateButton = true,
    user: _user = { name: 'Imam Ahmed', role: 'Administrator' },
    onMenuClick
}: HeaderProps) {
    const { status, refresh } = useWahaStatus()

    return (
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border-light bg-surface-light/80 backdrop-blur-md z-10 sticky top-0">
            <div className="flex items-center gap-3 sm:gap-4">
                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 -ml-2 text-text-main hover:bg-border-light rounded-lg transition-colors"
                    onClick={onMenuClick}
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <h2 className="text-xl font-bold tracking-tight text-text-main">{title}</h2>
            </div>

            {/* WAHA Status Indicators */}
            <div className="flex items-center gap-2">
                {status.loading ? (
                    <>
                        <div className="px-3 py-1.5 rounded-md bg-gray-200 animate-pulse">
                            <span className="text-xs font-bold text-transparent">CONNECTED</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-md bg-gray-200 animate-pulse">
                            <span className="text-xs font-bold text-transparent">WORKING</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div
                            className={`px-3 py-1.5 rounded-md ${status.connected ? 'bg-emerald-500' : 'bg-gray-600'}`}
                            title={status.connected ? 'WhatsApp session is connected' : 'WhatsApp session not connected'}
                        >
                            <span className={`text-xs font-bold ${status.connected ? 'text-emerald-950' : 'text-gray-300'}`}>
                                {status.connected ? 'CONNECTED' : 'DISCONNECTED'}
                            </span>
                        </div>
                        <div
                            className={`px-3 py-1.5 rounded-md ${status.working ? 'bg-emerald-500' : 'bg-gray-600'}`}
                            title={status.working ? 'WAHA is working' : `WAHA status: ${status.sessionStatus || 'Not working'}`}
                        >
                            <span className={`text-xs font-bold ${status.working ? 'text-emerald-950' : 'text-gray-300'}`}>
                                {status.working ? 'WORKING' : 'STOPPED'}
                            </span>
                        </div>
                    </>
                )}
                <button
                    onClick={refresh}
                    disabled={status.loading}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                    title="Refresh WAHA status"
                >
                    <span className={`material-symbols-outlined text-[18px] text-gray-500 ${status.loading ? 'animate-spin' : ''}`}>
                        refresh
                    </span>
                </button>
            </div>
        </header>
    )
}

