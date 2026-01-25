import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { landingAPI, uploadAPI, type LandingPageConfig } from '../../lib/api'

export default function LandingPageEditor() {
    const [config, setConfig] = useState<LandingPageConfig>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            setLoading(true)
            const data = await landingAPI.get()
            setConfig(data)
        } catch (err: any) {
            console.error('Landing config load error:', err)
            setError(err.message || 'Failed to load configuration')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSaving(true)
            setError('')
            setSuccess('')
            await landingAPI.update(config)
            setSuccess('Landing page updated successfully')
        } catch (err) {
            setError('Failed to update landing page')
        } finally {
            setSaving(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: 'hero' | 'header', field: string) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setSaving(true)
            const result = await uploadAPI.uploadImage(file)
            if (section === 'hero') {
                updateHero(field, result.url)
            } else if (section === 'header') {
                setConfig(prev => ({
                    ...prev,
                    header: { ...prev.header, [field]: result.url }
                }))
            }
        } catch (err: any) {
            console.error('Upload error:', err)
            setError(err.message || 'Failed to upload image')
        } finally {
            setSaving(false)
        }
    }

    const updateHero = (field: string, value: string) => {
        setConfig(prev => ({
            ...prev,
            hero: { ...prev.hero, [field]: value }
        }))
    }

    if (loading) return <AdminLayout>Loading...</AdminLayout>

    return (
        <AdminLayout title="Landing Page Editor" currentPage="landing-editor">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Landing Page Editor</h1>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-hover disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
                {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>}

                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-4">Header Configuration</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                            <input
                                type="text"
                                value={config.header?.brandName || ''}
                                onChange={e => setConfig(prev => ({ ...prev, header: { ...prev.header, brandName: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="MasjidEvent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Image</label>
                            <div className="flex items-center gap-4">
                                {config.header?.logoUrl && (
                                    <img src={config.header.logoUrl} alt="Logo" className="h-10 object-contain border rounded bg-gray-50 px-2" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleImageUpload(e, 'header', 'logoUrl')}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-bold text-gray-900 mb-2">Menu Items</h3>
                            <div className="space-y-2 mb-2">
                                {(config.header?.menuItems || []).map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={item.label}
                                            onChange={e => {
                                                const newItems = [...(config.header?.menuItems || [])]
                                                newItems[idx].label = e.target.value
                                                setConfig(prev => ({ ...prev, header: { ...prev.header, menuItems: newItems } }))
                                            }}
                                            className="flex-1 px-3 py-1 border rounded"
                                            placeholder="Label"
                                        />
                                        <input
                                            type="text"
                                            value={item.link}
                                            onChange={e => {
                                                const newItems = [...(config.header?.menuItems || [])]
                                                newItems[idx].link = e.target.value
                                                setConfig(prev => ({ ...prev, header: { ...prev.header, menuItems: newItems } }))
                                            }}
                                            className="flex-1 px-3 py-1 border rounded"
                                            placeholder="Link (#section or /url)"
                                        />
                                        <button
                                            onClick={() => {
                                                const newItems = (config.header?.menuItems || []).filter((_, i) => i !== idx)
                                                setConfig(prev => ({ ...prev, header: { ...prev.header, menuItems: newItems } }))
                                            }}
                                            className="text-red-500 hover:text-red-700 px-2"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setConfig(prev => ({
                                    ...prev,
                                    header: {
                                        ...prev.header,
                                        menuItems: [...(prev.header?.menuItems || []), { label: '', link: '#' }]
                                    }
                                }))}
                                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add Menu Item
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Login Button Label</label>
                                <input
                                    type="text"
                                    value={config.header?.authButtons?.loginLabel || ''}
                                    onChange={e => setConfig(prev => ({ ...prev, header: { ...prev.header, authButtons: { ...prev.header?.authButtons, loginLabel: e.target.value } } }))}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="Masuk"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Login Button Link</label>
                                <input
                                    type="text"
                                    value={config.header?.authButtons?.loginLink || ''}
                                    onChange={e => setConfig(prev => ({ ...prev, header: { ...prev.header, authButtons: { ...prev.header?.authButtons, loginLink: e.target.value } } }))}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="/login"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Register Button Label</label>
                                <input
                                    type="text"
                                    value={config.header?.authButtons?.ctaLabel || ''}
                                    onChange={e => setConfig(prev => ({ ...prev, header: { ...prev.header, authButtons: { ...prev.header?.authButtons, ctaLabel: e.target.value } } }))}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="Mulai Gratis"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Register Button Link</label>
                                <input
                                    type="text"
                                    value={config.header?.authButtons?.ctaLink || ''}
                                    onChange={e => setConfig(prev => ({ ...prev, header: { ...prev.header, authButtons: { ...prev.header?.authButtons, ctaLink: e.target.value } } }))}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="/register"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-4">Hero Section</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
                            <input
                                type="text"
                                value={config.hero?.badge || ''}
                                onChange={e => updateHero('badge', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Platform No.1 Untuk Masjid"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={config.hero?.title || ''}
                                onChange={e => updateHero('title', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Solusi Manajemen Event"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title Highlight (Colored)</label>
                            <input
                                type="text"
                                value={config.hero?.titleHighlight || ''}
                                onChange={e => updateHero('titleHighlight', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Komunitas & Masjid"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={config.hero?.description || ''}
                                onChange={e => updateHero('description', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg h-24"
                                placeholder="Kelola pendaftaran..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary CTA Text</label>
                                <input
                                    type="text"
                                    value={config.hero?.ctaPrimary || ''}
                                    onChange={e => updateHero('ctaPrimary', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="Mulai Gratis"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary CTA Link</label>
                                <input
                                    type="text"
                                    value={config.hero?.ctaPrimaryLink || ''}
                                    onChange={e => updateHero('ctaPrimaryLink', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="/login"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary CTA Text</label>
                                <input
                                    type="text"
                                    value={config.hero?.ctaSecondary || ''}
                                    onChange={e => updateHero('ctaSecondary', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="Lihat Demo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary CTA Link</label>
                                <input
                                    type="text"
                                    value={config.hero?.ctaSecondaryLink || ''}
                                    onChange={e => updateHero('ctaSecondaryLink', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="#"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image</label>
                            <div className="flex items-center gap-4">
                                {config.hero?.image && (
                                    <img src={config.hero.image} alt="Hero" className="w-20 h-20 object-cover rounded-lg border" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleImageUpload(e, 'hero', 'image')}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trusted By Text</label>
                            <input
                                type="text"
                                value={config.hero?.trustedBy || ''}
                                onChange={e => updateHero('trustedBy', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Dipercaya oleh 500+ Masjid"
                            />
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-4">Features Section</h2>
                    <p className="text-gray-500 text-sm mb-4">Edit feature titles and descriptions (basic config)</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                            <input
                                type="text"
                                value={config.features?.title || ''}
                                onChange={e => setConfig(prev => ({ ...prev, features: { ...prev.features, title: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Semua yang Anda Butuhkan..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section Subtitle</label>
                            <input
                                type="text"
                                value={config.features?.subtitle || ''}
                                onChange={e => setConfig(prev => ({ ...prev, features: { ...prev.features, subtitle: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Fitur Unggulan"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section Description</label>
                            <textarea
                                value={config.features?.description || ''}
                                onChange={e => setConfig(prev => ({ ...prev, features: { ...prev.features, description: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg h-20"
                                placeholder="Platform kami dirancang..."
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-4">Pricing Section</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                            <input
                                type="text"
                                value={config.pricing?.title || ''}
                                onChange={e => setConfig(prev => ({ ...prev, pricing: { ...prev.pricing, title: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Pilih Paket..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section Description</label>
                            <textarea
                                value={config.pricing?.description || ''}
                                onChange={e => setConfig(prev => ({ ...prev, pricing: { ...prev.pricing, description: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg h-20"
                                placeholder="Mulai dari gratis..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Button Link (All Plans)</label>
                            <input
                                type="text"
                                value={config.pricing?.buttonLink || ''}
                                onChange={e => setConfig(prev => ({ ...prev, pricing: { ...prev.pricing, buttonLink: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="/register"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom CTA Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-4">Bottom CTA Section</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={config.cta?.title || ''}
                                onChange={e => setConfig(prev => ({ ...prev, cta: { ...prev.cta, title: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Siap Mengelola Event..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={config.cta?.description || ''}
                                onChange={e => setConfig(prev => ({ ...prev, cta: { ...prev.cta, description: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg h-20"
                                placeholder="Bergabunglah dengan ratusan pengurus..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                            <input
                                type="text"
                                value={config.cta?.buttonText || ''}
                                onChange={e => setConfig(prev => ({ ...prev, cta: { ...prev.cta, buttonText: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Buat Akun Gratis Sekarang"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                            <input
                                type="text"
                                value={config.cta?.buttonLink || ''}
                                onChange={e => setConfig(prev => ({ ...prev, cta: { ...prev.cta, buttonLink: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="/login"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Small Note</label>
                            <input
                                type="text"
                                value={config.cta?.note || ''}
                                onChange={e => setConfig(prev => ({ ...prev, cta: { ...prev.cta, note: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Tidak perlu kartu kredit..."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-4">Footer Configuration</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
                            <textarea
                                value={config.footer?.description || ''}
                                onChange={e => setConfig(prev => ({ ...prev, footer: { ...prev.footer, description: e.target.value } }))}
                                className="w-full px-4 py-2 border rounded-lg h-20"
                                placeholder="Platform manajemen event terpercaya..."
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    value={config.footer?.address || ''}
                                    onChange={e => setConfig(prev => ({ ...prev, footer: { ...prev.footer, address: e.target.value } }))}
                                    className="w-full px-4 py-2 border rounded-lg h-24"
                                    placeholder="Jakarta, Indonesia..."
                                />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                                    <input
                                        type="text"
                                        value={config.footer?.contactEmail || ''}
                                        onChange={e => setConfig(prev => ({ ...prev, footer: { ...prev.footer, contactEmail: e.target.value } }))}
                                        className="w-full px-4 py-2 border rounded-lg"
                                        placeholder="support@masjidevent.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
                                    <input
                                        type="text"
                                        value={config.footer?.copyrightText || ''}
                                        onChange={e => setConfig(prev => ({ ...prev, footer: { ...prev.footer, copyrightText: e.target.value } }))}
                                        className="w-full px-4 py-2 border rounded-lg"
                                        placeholder="© 2026 MasjidEvent Platform. All rights reserved."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-bold text-gray-900 mb-2">Social Links</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Link</label>
                                    <input
                                        type="text"
                                        value={config.footer?.socialLinks?.instagram || ''}
                                        onChange={e => setConfig(prev => ({
                                            ...prev,
                                            footer: {
                                                ...prev.footer,
                                                socialLinks: { ...prev.footer?.socialLinks, instagram: e.target.value }
                                            }
                                        }))}
                                        className="w-full px-4 py-2 border rounded-lg"
                                        placeholder="#"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website Link</label>
                                    <input
                                        type="text"
                                        value={config.footer?.socialLinks?.website || ''}
                                        onChange={e => setConfig(prev => ({
                                            ...prev,
                                            footer: {
                                                ...prev.footer,
                                                socialLinks: { ...prev.footer?.socialLinks, website: e.target.value }
                                            }
                                        }))}
                                        className="w-full px-4 py-2 border rounded-lg"
                                        placeholder="#"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Link (mailto:)</label>
                                    <input
                                        type="text"
                                        value={config.footer?.socialLinks?.email || ''}
                                        onChange={e => setConfig(prev => ({
                                            ...prev,
                                            footer: {
                                                ...prev.footer,
                                                socialLinks: { ...prev.footer?.socialLinks, email: e.target.value }
                                            }
                                        }))}
                                        className="w-full px-4 py-2 border rounded-lg"
                                        placeholder="mailto:support@example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </AdminLayout>
    )
}
