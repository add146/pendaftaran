import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI, publicAPI, type LandingPageConfig } from '../lib/api'

export default function Register() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [config, setConfig] = useState<LandingPageConfig>({})

    useEffect(() => {
        publicAPI.getLandingConfig().then(setConfig).catch(console.error)
    }, [])

    // Register form
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [organizationName, setOrganizationName] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await authAPI.register({ email, password, name, organizationName })

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
                        {config.header?.logoUrl ? (
                            <img src={config.header.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                        ) : (
                            <span className="material-symbols-outlined text-primary text-[40px]">mosque</span>
                        )}
                        <h1 className="text-2xl font-bold text-gray-900">{config.header?.brandName || 'MasjidEvent'}</h1>
                    </div>
                    <p className="text-gray-600">Create your account</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Check if registration is enabled */}
                    {config.publicRegistrationEnabled === false ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-gray-400 text-[64px] mb-4">person_off</span>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Closed</h2>
                            <p className="text-gray-600 mb-6">
                                Public registration is currently disabled. Please contact the administrator for more information.
                            </p>
                            <Link
                                to="/"
                                className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors"
                            >
                                Back to Home
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Register</h2>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Register Form */}
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Your Name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Organization Name
                                    </label>
                                    <input
                                        type="text"
                                        value={organizationName}
                                        onChange={(e) => setOrganizationName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Masjid Al-Ikhlas"
                                        required
                                    />
                                </div>

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
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-hover disabled:bg-gray-400 transition-colors"
                                >
                                    {loading ? 'Creating Account...' : 'Register'}
                                </button>
                            </form>

                            {/* Back to Login */}
                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
                                        Login here
                                    </Link>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )
}
