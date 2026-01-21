import { Link } from 'react-router-dom'

interface SidebarProps {
    currentPage?: string
    isOpen?: boolean
    onClose?: () => void
}

export default function Sidebar({ currentPage = 'dashboard', isOpen = false, onClose }: SidebarProps) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
        { id: 'events', label: 'Events', icon: 'calendar_today', href: '/events' },
        { id: 'participants', label: 'Participants', icon: 'group', href: '/participants' },
        { id: 'payments', label: 'Payments', icon: 'credit_card', href: '/payments' },
        { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
    ]

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 h-full
                w-64 flex flex-col border-r border-border-light bg-surface-light 
                transition-transform duration-300 ease-in-out shrink-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-lg size-10 shrink-0 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined icon-filled">mosque</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-text-main text-base font-bold leading-tight">MasjidEvent</h1>
                            <p className="text-text-sub text-xs font-normal">Event Manager</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-1 rounded-md hover:bg-border-light text-text-sub"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            to={item.href}
                            onClick={onClose} // Close sidebar when link clicked on mobile
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentPage === item.id
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-main hover:bg-border-light'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[24px] ${currentPage === item.id ? 'icon-filled' : ''}`}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-border-light">
                    <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-main hover:bg-border-light font-medium transition-colors w-full">
                        <span className="material-symbols-outlined text-[24px]">logout</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
