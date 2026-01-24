import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { organizationsAPI, authAPI } from '../lib/api'

interface WahaStatus {
    connected: boolean
    working: boolean
    loading: boolean
    sessionStatus: string
}

interface WahaContextType {
    status: WahaStatus
    refresh: () => void
}

const WahaContext = createContext<WahaContextType | null>(null)

export function WahaStatusProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<WahaStatus>({
        connected: false,
        working: false,
        loading: true,
        sessionStatus: ''
    })
    const [orgId, setOrgId] = useState<string | null>(null)

    const fetchWahaStatus = async (organizationId: string) => {
        setStatus(prev => ({ ...prev, loading: true }))
        try {
            const result = await organizationsAPI.getWahaStatus(organizationId)
            console.log('[WAHA] Status Result:', result)
            setStatus({
                connected: result.connected,
                working: result.working,
                loading: false,
                sessionStatus: result.session_status
            })
        } catch (err: any) {
            console.error('Failed to fetch WAHA status:', err)
            setStatus({ connected: false, working: false, loading: false, sessionStatus: 'ERROR' })
        }
    }

    const fetchUserAndStatus = async () => {
        try {
            // Check if we already have orgId
            let currentOrgId = orgId

            if (!currentOrgId) {
                const user = await authAPI.me()
                if (user.organization_id) {
                    setOrgId(user.organization_id)
                    currentOrgId = user.organization_id
                }
            }

            if (currentOrgId) {
                fetchWahaStatus(currentOrgId)
            } else {
                // If still no orgId, stop loading
                setStatus(prev => ({ ...prev, loading: false }))
            }
        } catch (err) {
            console.error('Failed to fetch user/status:', err)
            setStatus(prev => ({ ...prev, loading: false }))
        }
    }

    const refresh = () => {
        setStatus(prev => ({ ...prev, loading: true }))
        fetchUserAndStatus()
    }

    useEffect(() => {
        const token = localStorage.getItem('auth_token')
        if (token) {
            fetchUserAndStatus()
        } else {
            setStatus(prev => ({ ...prev, loading: false }))
        }
    }, [])

    return (
        <WahaContext.Provider value={{ status, refresh }}>
            {children}
        </WahaContext.Provider>
    )
}

export function useWahaStatus() {
    const context = useContext(WahaContext)
    if (!context) {
        return {
            status: { connected: false, working: false, loading: false, sessionStatus: '' },
            refresh: () => { }
        }
    }
    return context
}
