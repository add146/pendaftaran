import { useState, useEffect } from 'react'
import { eventsAPI } from '../lib/api'

interface IDCardEditorProps {
    eventId: string
}

import { useTranslation } from 'react-i18next'

export default function IDCardEditor({ eventId }: IDCardEditorProps) {
    const { t } = useTranslation()
    const [primaryColor, setPrimaryColor] = useState('#1e7b49')
    const [backgroundColor, setBackgroundColor] = useState('#ffffff')
    const [sponsorLogo, setSponsorLogo] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    // const sponsorLogoInputRef = useRef<HTMLInputElement>(null)

    // Load existing design on mount
    useEffect(() => {
        if (!eventId) return

        eventsAPI.getIdCardDesign(eventId)
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
    }, [eventId])

    // Sponsor logo functions removed
    // const handleSponsorLogoUpload = ...
    // const removeSponsorLogo = ...

    const handleSaveDesign = async () => {
        if (!eventId) return

        setSaving(true)
        setMessage(null)

        try {
            await eventsAPI.saveIdCardDesign(eventId, {
                primaryColor,
                backgroundColor,
                sponsorLogo
            })
            setMessage({ type: 'success', text: t('id_card.messages.save_success') })
            setTimeout(() => setMessage(null), 3000)
        } catch (err: any) {
            console.error('Save error:', err)
            setMessage({ type: 'error', text: err.message || t('id_card.messages.save_error') })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-6">{t('id_card.configuration')}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Card Preview Canvas */}
                <div className="lg:col-span-7 bg-gray-50 rounded-2xl border border-gray-200 p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
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
                        className="relative rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] flex flex-col w-[320px] h-[520px] overflow-hidden transition-transform duration-300 hover:scale-[1.02] border border-gray-100 z-10 bg-white"
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
                            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mb-1">{t('id_card.scan_checkin')}</p>
                        </div>

                        {/* Participant Details - Apply background color here too */}
                        <div
                            className="px-6 pb-4 text-center"
                            style={{ backgroundColor }}
                        >
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">AHMAD FAUZI</h2>
                            <p className="text-xs font-bold tracking-widest uppercase mb-3 border-b border-gray-200 pb-3" style={{ color: primaryColor }}>{t('id_card.participant')}</p>
                            <div className="flex flex-col gap-1 text-gray-500">
                                <div className="flex items-center justify-center gap-1 text-xs font-medium">
                                    <span className="material-symbols-outlined text-[14px] text-gray-400">apartment</span>
                                    <span>Jakarta Selatan</span>
                                </div>
                                <div className="mt-2 text-[10px] font-mono font-bold text-gray-400 tracking-wider">
                                    REG-2026-00123
                                </div>
                            </div>
                        </div>

                        {/* Sponsor Logo Section - REMOVED */}
                        {/* {sponsorLogo && ( ... )} */}

                        {/* Footer Accent */}
                        <div className="h-2 w-full" style={{ backgroundColor: primaryColor }}></div>
                    </div>

                    <div className="mt-6 text-xs text-gray-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">zoom_in</span>
                        Hover card to zoom
                    </div>
                </div>

                {/* Right: Controls Sidebar */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Configuration Panel */}
                    <div>
                        <h3 className="text-gray-900 tracking-tight text-lg font-bold leading-tight mb-4">{t('id_card.settings')}</h3>

                        {/* Color Pickers */}
                        <div className="space-y-4 mb-6">
                            {/* Primary Color */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('id_card.primary_color')}</label>
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
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('id_card.background_color')}</label>
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

                        {/* Sponsor Logo Upload - REMOVED as per request */}
                        {/* <div className="mb-6">...</div> */}

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
                                    setMessage({ type: 'success', text: t('id_card.messages.reset_success') })
                                    setTimeout(() => setMessage(null), 2000)
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                                {t('common.reset')}
                            </button>
                            <button
                                onClick={handleSaveDesign}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-[0.98] disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">save</span>
                                        {t('id_card.save_design')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    )
}
