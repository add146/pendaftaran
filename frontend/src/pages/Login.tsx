import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI, publicAPI, type LandingPageConfig } from '../lib/api'

export default function Login() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [config, setConfig] = useState<LandingPageConfig>({})

    useEffect(() => {
        publicAPI.getLandingConfig().then(data => {
            console.log('Landing Config Loaded:', data)
            setConfig(data)
        }).catch(console.error)
    }, [])

    // Login form
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await authAPI.login(email, password)

            // Save token and user data
            localStorage.setItem('auth_token', response.token)
            localStorage.setItem('user', JSON.stringify(response.user))
            if (response.user.organization_id) {
                localStorage.setItem('orgId', response.user.organization_id)
            }

            // Redirect to dashboard
            navigate('/dashboard')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-2">
                        {config.header?.logoUrl ? (
                            <img src={config.header.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                        ) : (
                            <span className="material-symbols-outlined text-primary text-[40px]">mosque</span>
                        )}
                        <h1 className="text-2xl font-bold text-gray-900">{config.header?.brandName || 'MasjidEvent'}</h1>
                    </div>
                    <p className="text-gray-600">Event Management Platform</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Login</h2>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-hover disabled:bg-gray-400 transition-colors"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    {/* Back to Landing */}
                    <div className="mt-6 text-center">
                        <Link to="/" className="text-sm text-gray-600 hover:text-primary">
                            ← Back to Home
                        </Link>
                    </div>
                </div>

                {/* Register Link (if enabled) */}
                {config.publicRegistrationEnabled && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-primary hover:text-primary-hover">
                                Sign up
                            </Link>
                        </p>
                    </div>
                )}

                {/* Info */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
            {/* Debug Banner - Temporary */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 text-center font-mono">
                Debug: Config Loaded = {Object.keys(config).length > 0 ? 'Yes' : 'No'} | Registration = {String(config.publicRegistrationEnabled)}
            </div>
        </div>
    )
}
