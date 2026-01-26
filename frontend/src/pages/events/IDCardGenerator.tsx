import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { eventsAPI, uploadAPI } from '../../lib/api'

export default function IDCardGenerator() {
    const { id } = useParams<{ id: string }>()
    const [primaryColor, setPrimaryColor] = useState('#1e7b49')
    const [backgroundColor, setBackgroundColor] = useState('#ffffff')
    const [sponsorLogo, setSponsorLogo] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const sponsorLogoInputRef = useRef<HTMLInputElement>(null)

    // Load existing design on mount
    useEffect(() => {
        if (!id) return

        eventsAPI.getIdCardDesign(id)
            .then(design => {
                setPrimaryColor(design.primaryColor || '#1e7b49')
                setBackgroundColor(design.backgroundColor || '#ffffff')
                setSponsorLogo(design.sponsorLogo || null)
            })
            .catch(err => {
                console.error('Failed to load ID card design:', err)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [id])

    const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Limit to 20MB (as requested) because it will be compressed
        if (file.size > 20 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'File too large. Max 20MB.' })
            return
        }

        try {
            setSaving(true)
            setMessage(null)

            // Upload and compress image automatically (max 0.5MB for D1 storage)
            const result = await uploadAPI.uploadImage(file, { maxSizeMB: 0.5 })
            setSponsorLogo(result.url)

            setMessage({ type: 'success', text: 'Logo uploaded and compressed successfully!' })
            setTimeout(() => setMessage(null), 3000)
        } catch (error: any) {
            console.error('Upload error:', error)
            setMessage({ type: 'error', text: error.message || 'Failed to upload logo' })
        } finally {
            setSaving(false)
        }
    }

    const removeSponsorLogo = () => {
        setSponsorLogo(null)
        if (sponsorLogoInputRef.current) {
            sponsorLogoInputRef.current.value = ''
        }
    }

    const handleSaveDesign = async () => {
        if (!id) return

        setSaving(true)
        setMessage(null)

        try {
            await eventsAPI.saveIdCardDesign(id, {
                primaryColor,
                backgroundColor,
                sponsorLogo
            })
            setMessage({ type: 'success', text: 'Design saved successfully!' })
            setTimeout(() => setMessage(null), 3000)
        } catch (err: any) {
            console.error('Save error:', err)
            setMessage({ type: 'error', text: err.message || 'Failed to save design' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <AdminLayout title="ID Card Generator" currentPage="events" showCreateButton={false}>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout title="ID Card Generator" currentPage="events" showCreateButton={false}>
            <div className="flex-1 px-4 lg:px-40 py-5">
                <div className="flex flex-col max-w-[1280px] mx-auto">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap gap-2 px-4 py-2">
                        <Link className="text-text-sub text-sm md:text-base font-medium leading-normal hover:underline" to="/dashboard">Dashboard</Link>
                        <span className="text-text-sub text-sm md:text-base font-medium leading-normal">/</span>
                        <Link className="text-text-sub text-sm md:text-base font-medium leading-normal hover:underline" to="/events">Events</Link>
                        <span className="text-text-sub text-sm md:text-base font-medium leading-normal">/</span>
                        <span className="text-text-main text-sm md:text-base font-medium leading-normal">ID Cards</span>
                    </div>

                    {/* Page Header */}
                    <div className="px-4 pb-3 pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-text-main text-[28px] font-bold leading-tight tracking-tight">ID Card Generator</h2>
                        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-100">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2"></span>
                            Event Active
                        </span>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 py-6">
                        {/* Left: Card Preview Canvas */}
                        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-border-light p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
                            {/* Canvas Background Grid */}
                            <div
                                className="absolute inset-0 opacity-5 pointer-events-none"
                                style={{
                                    backgroundImage: `radial-gradient(${primaryColor} 1px, transparent 1px)`,
                                    backgroundSize: '20px 20px'
                                }}
                            ></div>

                            {/* The ID Card (Portrait only) */}
                            <div
                                className="relative rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] flex flex-col w-[320px] h-[520px] overflow-hidden transition-transform duration-300 hover:scale-[1.02] border border-gray-100 z-10"
                                style={{ backgroundColor }}
                            >
                                {/* Header - More space for title, simplified date */}
                                <div
                                    className="h-[120px] flex flex-col items-center justify-center px-4 text-center text-white relative"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <h3 className="font-display font-extrabold text-xl uppercase tracking-wider leading-tight mb-2 drop-shadow-sm px-2">
                                        PENGAJIAN AKBAR
                                    </h3>
                                    {/* Simplified date - two dates, smaller, not bold */}
                                    {/* Simplified date - pill style */}
                                    <div className="mt-2 flex justify-center">
                                        <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 backdrop-blur-sm border border-white/20 shadow-sm">
                                            <span className="material-symbols-outlined text-white text-[14px]">calendar_today</span>
                                            <span className="text-white font-bold text-[10px] tracking-wide uppercase">
                                                SENIN, 23 JAN 2026
                                            </span>
                                            <span className="text-white/50 mx-0.5 font-light text-sm">|</span>
                                            <span className="text-white font-bold text-[10px] tracking-wide uppercase">
                                                09:00
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* QR Code Section - Always shown */}
                                <div
                                    className="flex-1 flex flex-col items-center justify-center px-6 pt-6 pb-2 relative"
                                    style={{ backgroundColor }}
                                >
                                    <div className="p-3 bg-white border-2 border-dashed border-gray-200 rounded-xl shadow-sm mb-4">
                                        {/* QR Code Placeholder */}
                                        <div className="w-32 h-32 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                                            <div className="grid grid-cols-5 gap-1 p-2">
                                                {Array.from({ length: 25 }).map((_, i) => (
                                                    <div key={i} className={`w-4 h-4 ${Math.random() > 0.5 ? 'bg-white' : 'bg-gray-900'}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mb-1">Scan for Check-in</p>
                                </div>

                                {/* Participant Details - Apply background color here too */}
                                <div
                                    className="px-6 pb-4 text-center"
                                    style={{ backgroundColor }}
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">AHMAD FAUZI</h2>
                                    <p className="text-xs font-bold tracking-widest uppercase mb-3 border-b border-gray-200 pb-3" style={{ color: primaryColor }}>Participant</p>
                                    <div className="flex flex-col gap-1 text-gray-500">
                                        <div className="flex items-center justify-center gap-1 text-xs font-medium">
                                            <span className="material-symbols-outlined text-[14px] text-gray-400">location_on</span>
                                            <span>Jakarta Selatan</span>
                                        </div>
                                        <div className="mt-2 text-[10px] font-mono font-bold text-gray-400 tracking-wider">
                                            REG-2026-00123
                                        </div>
                                    </div>
                                </div>

                                {/* Sponsor Logo Section */}
                                {sponsorLogo && (
                                    <div className="px-6 pb-3 flex items-center justify-center" style={{ backgroundColor }}>
                                        <img
                                            src={sponsorLogo}
                                            alt="Sponsor Logo"
                                            className="max-h-12 max-w-[150px] object-contain"
                                        />
                                    </div>
                                )}

                                {/* Footer Accent */}
                                <div className="h-2 w-full" style={{ backgroundColor: primaryColor }}></div>
                            </div>

                            <div className="mt-6 text-xs text-gray-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">zoom_in</span>
                                Hover card to zoom
                            </div>
                        </div>

                        {/* Right: Controls Sidebar */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            {/* Configuration Panel */}
                            <div className="bg-white rounded-xl shadow-sm border border-border-light p-6">
                                <h3 className="text-text-main tracking-tight text-xl font-bold leading-tight mb-6">Card Settings</h3>

                                {/* Color Pickers */}
                                <div className="space-y-4 mb-6">
                                    {/* Primary Color */}
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Primary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer p-1"
                                            />
                                            <input
                                                type="text"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                                                placeholder="#1e7b49"
                                            />
                                        </div>
                                    </div>

                                    {/* Background Color */}
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Background Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={backgroundColor}
                                                onChange={(e) => setBackgroundColor(e.target.value)}
                                                className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer p-1"
                                            />
                                            <input
                                                type="text"
                                                value={backgroundColor}
                                                onChange={(e) => setBackgroundColor(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sponsor Logo Upload */}
                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Sponsor Logo</label>
                                    <input
                                        ref={sponsorLogoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleSponsorLogoUpload}
                                        className="hidden"
                                        id="sponsorLogoInput"
                                    />

                                    {sponsorLogo ? (
                                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                            <img
                                                src={sponsorLogo}
                                                alt="Sponsor Logo Preview"
                                                className="h-10 max-w-[80px] object-contain"
                                            />
                                            <span className="flex-1 text-sm text-gray-600 truncate">Logo uploaded</span>
                                            <button
                                                onClick={removeSponsorLogo}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <label
                                            htmlFor="sponsorLogoInput"
                                            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-gray-400">add_photo_alternate</span>
                                            <span className="text-sm text-gray-500">Upload Sponsor Logo</span>
                                        </label>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">Max 20MB (auto-compressed), appears at bottom of ID card</p>
                                </div>

                                {/* Message */}
                                {message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {message.text}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            setPrimaryColor('#1e7b49')
                                            setBackgroundColor('#ffffff')
                                            setSponsorLogo(null)
                                            setMessage({ type: 'success', text: 'Reset to default design' })
                                            setTimeout(() => setMessage(null), 2000)
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                                        Reset
                                    </button>
                                    <button
                                        onClick={handleSaveDesign}
                                        disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">save</span>
                                                Save Design
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Action Card */}
                            <div className="bg-primary/5 rounded-xl p-5 border border-primary/20 flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <span className="material-symbols-outlined">groups</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-text-main">Batch Generation</h4>
                                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                            Need cards for everyone? Generate IDs for all 150 registered participants at once.
                                        </p>
                                    </div>
                                </div>
                                <button className="text-primary text-xs font-bold hover:underline self-end flex items-center gap-1">
                                    GENERATE BATCH <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
