import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../lib/api'

export default function Login() {
    const navigate = useNavigate()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Login form
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Register form
    const [registerName, setRegisterName] = useState('')
    const [registerEmail, setRegisterEmail] = useState('')
    const [registerPassword, setRegisterPassword] = useState('')
    const [organizationName, setOrganizationName] = useState('')

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await authAPI.register({
                email: registerEmail,
                password: registerPassword,
                name: registerName,
                organizationName: organizationName || undefined
            })

            // Save token and user data
            localStorage.setItem('auth_token', response.token)
            localStorage.setItem('user', JSON.stringify(response.user))
            if (response.user.organization_id) {
                localStorage.setItem('orgId', response.user.organization_id)
            }

            // Redirect to dashboard
            navigate('/dashboard')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed')
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
                        <span className="material-symbols-outlined text-primary text-[40px]">mosque</span>
                        <h1 className="text-2xl font-bold text-gray-900">MasjidEvent</h1>
                    </div>
                    <p className="text-gray-600">Event Management Platform</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Toggle Tabs */}
                    <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    {isLogin ? (
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
                    ) : (
                        /* Register Form */
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={registerName}
                                    onChange={(e) => setRegisterName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Organization Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Masjid Al-Ikhlas"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={registerEmail}
                                    onChange={(e) => setRegisterEmail(e.target.value)}
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
                                    value={registerPassword}
                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-hover disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    {/* Back to Landing */}
                    <div className="mt-6 text-center">
                        <Link to="/" className="text-sm text-gray-600 hover:text-primary">
                            ← Back to Home
                        </Link>
                    </div>
                </div>

                {/* Info */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    )
}
