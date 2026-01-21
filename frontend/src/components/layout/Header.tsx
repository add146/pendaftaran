import { Link } from 'react-router-dom'

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
    showCreateButton = true,
    user = { name: 'Imam Ahmed', role: 'Administrator' },
    onMenuClick
}: HeaderProps) {
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
                <h2 className="text-xl font-bold tracking-tight text-text-main hidden sm:block">{title}</h2>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
                {/* Action Button */}
                {showCreateButton && (
                    <>
                        <Link
                            to="/events/create"
                            className="hidden sm:flex items-center gap-2 h-10 px-5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Create New Event</span>
                        </Link>
                        <Link
                            to="/events/create"
                            className="sm:hidden flex items-center justify-center size-10 bg-primary text-white rounded-full shadow-lg"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </Link>
                    </>
                )}

                <div className="h-8 w-px bg-border-light hidden sm:block"></div>

                {/* User Profile */}
                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-text-main leading-none">{user.name}</p>
                        <p className="text-xs text-text-sub mt-1">{user.role}</p>
                    </div>
                    <div
                        className="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-offset-2 ring-primary bg-gray-300"
                        style={{ backgroundImage: user.avatar ? `url("${user.avatar}")` : undefined }}
                    >
                        {!user.avatar && (
                            <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                                {user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
