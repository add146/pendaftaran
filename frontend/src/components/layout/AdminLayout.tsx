import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { WahaStatusProvider } from '../../hooks/useWahaStatus'
import { organizationsAPI, authAPI } from '../../lib/api'

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
    const [organization, setOrganization] = useState<{ id: string; name: string; logo_url?: string } | null>(null)

    useEffect(() => {
        const loadOrg = async () => {
            try {
                let orgId = localStorage.getItem('orgId')
                if (!orgId) {
                    // Try to get from me endpoint if not in storage (e.g. after fresh login)
                    try {
                        const me = await authAPI.me()
                        orgId = me.organization_id
                        if (orgId) localStorage.setItem('orgId', orgId)
                    } catch {
                        // Ignore auth errors, maybe cleaner redirection happens elsewhere or public page
                    }
                }

                if (orgId) {
                    const data = await organizationsAPI.get(orgId)
                    setOrganization({ ...data, id: orgId })
                }
            } catch (err) {
                console.error('Failed to load organization info for sidebar:', err)
            }
        }
        loadOrg()
    }, [])

    return (
        <WahaStatusProvider>
            <div className="flex h-screen w-full bg-background-light">
                <Sidebar
                    currentPage={currentPage}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    organization={organization}
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
        </WahaStatusProvider>
    )
}

