import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface AdminLayoutProps {
    children: React.ReactNode
    title?: string
    currentPage?: string
    showCreateButton?: boolean
}

export default function AdminLayout({
    children,
    title,
    currentPage,
    showCreateButton = true
}: AdminLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen w-full bg-background-light">
            <Sidebar
                currentPage={currentPage}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
                <Header
                    title={title}
                    showCreateButton={showCreateButton}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
