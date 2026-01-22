import { Link as _Link } from 'react-router-dom'

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
        </header>
    )
}
