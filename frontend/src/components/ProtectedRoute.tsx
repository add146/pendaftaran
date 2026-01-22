import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredRole?: 'admin' | 'super_admin'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const location = useLocation()

    // Check if user is authenticated
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
        // Not authenticated, redirect to login
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Check role if required
    if (requiredRole) {
        try {
            const user = JSON.parse(userStr)
            if (requiredRole === 'super_admin' && user.role !== 'super_admin') {
                // User is not super admin, redirect to dashboard
                return <Navigate to="/dashboard" replace />
            }
        } catch {
            // Invalid user data, redirect to login
            return <Navigate to="/login" replace />
        }
    }

    return <>{children}</>
}
