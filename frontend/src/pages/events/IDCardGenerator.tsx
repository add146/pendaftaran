import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function IDCardGenerator() {
    const { id: _id } = useParams()
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
    const [showPunchHole, setShowPunchHole] = useState(true)
    const [includeQR, setIncludeQR] = useState(true)

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen flex flex-col">
            {/* Top Navbar */}
            <header className="sticky top-0 z-50 w-full bg-surface-light border-b border-border-light">
                <div className="px-4 lg:px-10 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-text-main">
                        <Link to="/dashboard" className="size-8 text-primary">
                            <span className="material-symbols-outlined text-[32px]">mosque</span>
                        </Link>
                        <h2 className="text-lg font-bold leading-tight tracking-tight">MasjidEvents</h2>
                    </div>
                    <div className="flex items-center gap-8">
                        <nav className="hidden md:flex items-center gap-9">
                            <Link className="text-text-main text-sm font-medium leading-normal hover:text-primary transition-colors" to="/dashboard">Dashboard</Link>
                            <Link className="text-primary text-sm font-medium leading-normal" to="#">Events</Link>
                            <a className="text-text-main text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Attendees</a>
                            <a className="text-text-main text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Settings</a>
                        </nav>
                        <div className="rounded-full size-10 bg-primary/20 flex items-center justify-center text-primary font-bold">IA</div>
                    </div>
                </div>
            </header>

            <div className="flex-1 px-4 lg:px-40 py-5">
                <div className="flex flex-col max-w-[1280px] mx-auto">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap gap-2 px-4 py-2">
                        <Link className="text-text-sub text-sm md:text-base font-medium leading-normal hover:underline" to="/dashboard">Dashboard</Link>
                        <span className="text-text-sub text-sm md:text-base font-medium leading-normal">/</span>
                        <Link className="text-text-sub text-sm md:text-base font-medium leading-normal hover:underline" to="#">Events</Link>
                        <span className="text-text-sub text-sm md:text-base font-medium leading-normal">/</span>
                        <Link className="text-text-sub text-sm md:text-base font-medium leading-normal hover:underline" to="#">Pengajian Akbar</Link>
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
                                    backgroundImage: 'radial-gradient(#1e7b49 1px, transparent 1px)',
                                    backgroundSize: '20px 20px'
                                }}
                            ></div>

                            {/* The ID Card (Portrait Lanyard) */}
                            <div className={`relative bg-white rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden transition-transform duration-300 hover:scale-[1.02] border border-gray-100 z-10 ${orientation === 'portrait' ? 'w-[320px] h-[520px]' : 'w-[520px] h-[320px]'
                                }`}>
                                {/* Lanyard Hole */}
                                {showPunchHole && (
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-3 bg-gray-100 rounded-full shadow-inner border border-gray-200 z-20 flex items-center justify-center">
                                        <div className="w-8 h-1 bg-black/10 rounded-full"></div>
                                    </div>
                                )}

                                {/* Header */}
                                <div className="bg-primary h-[140px] flex flex-col items-center justify-end pb-4 px-4 text-center text-white relative">
                                    <div className="relative z-10 flex flex-col items-center">
                                        <h3 className="font-display font-extrabold text-xl uppercase tracking-wider leading-tight mb-2 drop-shadow-sm">
                                            PENGAJIAN AKBAR
                                        </h3>
                                        <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                            <p className="text-[10px] font-semibold tracking-wide">12 MUHARRAM 1446 H</p>
                                        </div>
                                    </div>
                                </div>

                                {/* QR Code Section */}
                                {includeQR && (
                                    <div className="flex-1 flex flex-col items-center justify-center px-6 pt-6 pb-2 relative">
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
                                )}

                                {/* Participant Details */}
                                <div className="px-6 pb-8 text-center bg-gradient-to-t from-gray-50 to-white">
                                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">AHMAD FAUZI</h2>
                                    <p className="text-xs font-bold text-primary tracking-widest uppercase mb-3 border-b border-gray-100 pb-3">Participant</p>
                                    <div className="flex flex-col gap-1 text-gray-500">
                                        <div className="flex items-center justify-center gap-1 text-xs font-medium">
                                            <span className="material-symbols-outlined text-[14px] text-gray-400">location_on</span>
                                            <span>Jakarta Selatan</span>
                                        </div>
                                        <div className="mt-2 bg-gray-100 py-1 px-3 rounded text-[10px] font-mono font-bold text-gray-600 tracking-wider">
                                            REG-2026-00123
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Accent */}
                                <div className="h-2 bg-primary w-full"></div>
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

                                {/* Orientation Selector */}
                                <div className="mb-8">
                                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Orientation</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Portrait Option */}
                                        <label className="cursor-pointer group relative">
                                            <input
                                                type="radio"
                                                name="orientation"
                                                checked={orientation === 'portrait'}
                                                onChange={() => setOrientation('portrait')}
                                                className="peer sr-only"
                                            />
                                            <div className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${orientation === 'portrait' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                                <div className={`w-8 h-10 border-2 rounded-sm bg-white ${orientation === 'portrait' ? 'border-primary' : 'border-gray-400'
                                                    }`}></div>
                                                <span className={`text-sm font-medium ${orientation === 'portrait' ? 'font-bold text-primary' : 'text-gray-600'
                                                    }`}>Portrait</span>
                                            </div>
                                            {orientation === 'portrait' && (
                                                <div className="absolute top-2 right-2 text-primary">
                                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                                </div>
                                            )}
                                        </label>

                                        {/* Landscape Option */}
                                        <label className="cursor-pointer group relative">
                                            <input
                                                type="radio"
                                                name="orientation"
                                                checked={orientation === 'landscape'}
                                                onChange={() => setOrientation('landscape')}
                                                className="peer sr-only"
                                            />
                                            <div className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${orientation === 'landscape' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                                <div className={`w-10 h-8 border-2 rounded-sm bg-white ${orientation === 'landscape' ? 'border-primary' : 'border-gray-400'
                                                    }`}></div>
                                                <span className={`text-sm font-medium ${orientation === 'landscape' ? 'font-bold text-primary' : 'text-gray-600'
                                                    }`}>Landscape</span>
                                            </div>
                                            {orientation === 'landscape' && (
                                                <div className="absolute top-2 right-2 text-primary">
                                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Additional Options */}
                                <div className="space-y-4 mb-6">
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={showPunchHole}
                                            onChange={(e) => setShowPunchHole(e.target.checked)}
                                            className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Show Punch Hole</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={includeQR}
                                            onChange={(e) => setIncludeQR(e.target.checked)}
                                            className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Include QR Code</span>
                                    </label>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                                    <button className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]">
                                        <span className="material-symbols-outlined">download</span>
                                        Download PDF
                                    </button>
                                    <button className="flex items-center justify-center gap-2 w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-lg transition-all">
                                        <span className="material-symbols-outlined">print</span>
                                        Print Immediately
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
        </div>
    )
}
