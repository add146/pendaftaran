import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'

interface SidebarProps {
    currentPage?: string
    isOpen?: boolean
    onClose?: () => void
    organization?: {
        id: string
        name: string
        logo_url?: string
    } | null
}

// Get user role from localStorage
const getUserRole = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return user.role || 'admin'
    } catch {
        return 'admin'
    }
}

interface NavItem {
    id: string
    label: string
    icon: string
    href: string
}

export default function Sidebar({ currentPage = 'dashboard', isOpen = false, onClose, organization }: SidebarProps) {
    const { t } = useTranslation()
    const userRole = getUserRole()
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin' || userRole === 'super_admin'

    const allNavItems: NavItem[] = [
        { id: 'dashboard', label: t('sidebar.dashboard'), icon: 'dashboard', href: '/dashboard' },
        { id: 'events', label: t('sidebar.events'), icon: 'calendar_today', href: '/events' },
        { id: 'participants', label: t('sidebar.participants'), icon: 'group', href: '/participants' },
        { id: 'payments', label: t('sidebar.payments'), icon: 'credit_card', href: '/payments' },
        { id: 'organization', label: t('sidebar.organization'), icon: 'apartment', href: '/organization' },
        { id: 'donations', label: t('sidebar.donations'), icon: 'volunteer_activism', href: '/donations' },
        { id: 'settings', label: t('sidebar.settings'), icon: 'settings', href: '/settings' },

    ]

    // Filter nav items - users cannot see Organization
    const navItems = isAdmin ? allNavItems : allNavItems.filter(item => item.id !== 'organization')

    // Super admin menu items
    const superAdminItems: NavItem[] = [
        { id: 'super-dashboard', label: t('sidebar.super_dashboard'), icon: 'admin_panel_settings', href: '/super-admin' },
        { id: 'super-orgs', label: t('sidebar.super_orgs'), icon: 'apartment', href: '/super-admin/organizations' },
        { id: 'super-users', label: t('sidebar.super_users'), icon: 'manage_accounts', href: '/super-admin/users' },
        { id: 'landing-editor', label: t('sidebar.landing_page'), icon: 'web', href: '/super-admin/landing' },
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
                        {organization?.logo_url ? (
                            <img
                                src={organization.logo_url}
                                alt={organization.name}
                                className="size-10 shrink-0 rounded-lg object-cover bg-white border border-gray-100"
                            />
                        ) : (
                            <div className="bg-primary/10 rounded-lg size-10 shrink-0 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined icon-filled">mosque</span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <h1 className="text-text-main text-base font-bold leading-tight line-clamp-2">
                                {organization?.name || 'MasjidEvent'}
                            </h1>
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

                {/* Super Admin Section */}
                {isSuperAdmin && (
                    <div className="px-4 py-2 border-t border-border-light">
                        <p className="px-3 py-2 text-xs font-semibold text-text-sub uppercase">Super Admin</p>
                        {superAdminItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentPage === item.id
                                    ? 'bg-orange-500/10 text-orange-600'
                                    : 'text-text-main hover:bg-border-light'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-[24px] ${currentPage === item.id ? 'icon-filled' : ''}`}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="p-4 border-t border-border-light space-y-2">
                    {/* Language Switcher - Super Admin Only as requested */}
                    {isSuperAdmin && (
                        <LanguageSwitcher
                            className="w-full justify-center !bg-gray-100 !border-gray-200 !text-gray-600"
                            orgId={(organization as any)?.id}
                        />
                    )}
                    <button
                        onClick={() => {
                            localStorage.removeItem('auth_token')
                            localStorage.removeItem('user')
                            localStorage.removeItem('orgId')
                            window.location.href = '/'
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-main hover:bg-border-light font-medium transition-colors w-full"
                    >
                        <span className="material-symbols-outlined text-[24px]">logout</span>
                        <span>{t('sidebar.sign_out')}</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
