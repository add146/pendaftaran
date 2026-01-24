import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { publicAPI, type LandingPageConfig } from '../lib/api'

// Feature card component
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="group bg-white p-6 rounded-xl border border-gray-100 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[28px]">{icon}</span>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">{title}</h4>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
    )
}

// Pricing card component
function PricingCard({
    name,
    description,
    price,
    period,
    features,
    popular = false
}: {
    name: string
    description: string
    price: string
    period: string
    features: { text: string; included: boolean }[]
    popular?: boolean
}) {
    return (
        <div className={`relative flex flex-col p-6 rounded-2xl ${popular
            ? 'bg-white border-2 border-primary shadow-xl scale-105 z-10'
            : 'bg-background-light border border-gray-200'
            }`}>
            {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Paling Populer
                </div>
            )}
            <div className="mb-5">
                <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
            <div className="mb-6">
                <span className="text-4xl font-black text-gray-900">{price}</span>
                <span className="text-gray-500 font-medium">{period}</span>
            </div>
            <button className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${popular
                ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                }`}>
                {popular ? 'Pilih Basic' : 'Mulai Sekarang'}
            </button>
            <ul className="flex flex-col gap-3 mt-8 text-sm text-gray-700 flex-1">
                {features.map((feature, idx) => (
                    <li key={idx} className={`flex items-center gap-3 ${!feature.included ? 'opacity-50' : ''}`}>
                        <span className={`material-symbols-outlined text-[20px] ${feature.included ? 'text-primary' : 'text-gray-400'}`}>
                            {feature.included ? 'check_circle' : 'cancel'}
                        </span>
                        {feature.text}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default function Landing() {
    const [config, setConfig] = useState<LandingPageConfig>({})
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
        publicAPI.getLandingConfig().then(setConfig).catch(console.error)
    }, [])

    // Default data with config override
    const features = config.features?.items || [
        { icon: 'app_registration', title: 'Pendaftaran Otomatis', description: 'Formulir pendaftaran online yang mudah dibuat, disesuaikan, dan dikelola tanpa coding.' },
        { icon: 'qr_code_2', title: 'QR Code ID Card', description: 'Sistem check-in super cepat di lokasi dengan pemindaian kode QR digital unik per peserta.' },
        { icon: 'credit_card', title: 'Integrasi Midtrans', description: 'Terima pembayaran tiket atau donasi secara otomatis, aman, dan langsung terverifikasi.' },
        { icon: 'bar_chart', title: 'Laporan Real-time', description: 'Pantau kehadiran, pemasukan, dan data demografi peserta secara langsung melalui dashboard.' },
    ]

    const pricingPlans = config.pricing?.items || [
        {
            name: 'Gratis',
            description: 'Untuk acara kecil & kajian rutin',
            price: 'Rp 0',
            period: '/selamanya',
            features: [
                { text: 'Hingga 50 peserta', included: true },
                { text: '1 Event aktif', included: true },
                { text: 'QR Code Check-in', included: true },
                { text: 'Export Data Excel', included: false },
            ],
        },
        {
            name: 'Basic',
            description: 'Untuk masjid aktif & komunitas',
            price: 'Rp 199rb',
            period: '/bulan',
            popular: true,
            features: [
                { text: 'Hingga 500 peserta', included: true },
                { text: '5 Event aktif', included: true },
                { text: 'Export Data Peserta', included: true },
                { text: 'Integrasi Pembayaran', included: true },
            ],
        },
        {
            name: 'Pro',
            description: 'Untuk event akbar & organisasi',
            price: 'Rp 499rb',
            period: '/bulan',
            features: [
                { text: 'Unlimited peserta', included: true },
                { text: 'Unlimited Event', included: true },
                { text: 'Laporan Prioritas & Analytics', included: true },
                { text: 'Support Prioritas 24/7', included: true },
            ],
        },
    ]

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen">
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-surface-light/95 backdrop-blur">
                <div className="max-w-[1280px] mx-auto px-4 md:px-10 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-primary">
                            <span className="material-symbols-outlined text-[32px]">mosque</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900">MasjidEvent</h2>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        <a className="text-sm font-medium text-gray-600 hover:text-primary transition-colors" href="#features">Fitur</a>
                        <a className="text-sm font-medium text-gray-600 hover:text-primary transition-colors" href="#pricing">Harga</a>
                        <a className="text-sm font-medium text-gray-600 hover:text-primary transition-colors" href="#contact">Kontak</a>
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login" className="hidden sm:flex h-10 px-4 items-center justify-center rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                            Masuk
                        </Link>
                        <Link to="/login" className="flex h-10 px-5 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary-hover transition-all hover:shadow-md">
                            Mulai Gratis
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <span className="material-symbols-outlined text-[28px]">{isMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-lg py-6 px-4 flex flex-col gap-6 animate-fade-in">
                        <nav className="flex flex-col gap-4">
                            <a
                                className="text-base font-medium text-gray-600 hover:text-primary transition-colors py-2 border-b border-gray-50"
                                href="#features"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Fitur
                            </a>
                            <a
                                className="text-base font-medium text-gray-600 hover:text-primary transition-colors py-2 border-b border-gray-50"
                                href="#pricing"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Harga
                            </a>
                            <a
                                className="text-base font-medium text-gray-600 hover:text-primary transition-colors py-2 border-b border-gray-50"
                                href="#contact"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Kontak
                            </a>
                        </nav>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/dashboard"
                                className="flex h-12 w-full items-center justify-center rounded-lg border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Masuk
                            </Link>
                            <Link
                                to="/dashboard"
                                className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary-hover transition-all"
                            >
                                Mulai Gratis
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-br from-background-light to-green-50">
                <div className="max-w-[1280px] mx-auto px-4 md:px-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="flex flex-col gap-6 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 w-fit">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                    {config.hero?.badge || 'Platform No.1 Untuk Masjid'}
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight text-gray-900">
                                {config.hero?.title || 'Solusi Manajemen Event'} <span className="text-primary">{config.hero?.titleHighlight || 'Komunitas & Masjid'}</span>
                            </h1>
                            <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                                {config.hero?.description || 'Kelola pendaftaran, pembayaran otomatis, dan absensi QR code dalam satu platform terintegrasi. Modernkan pengelolaan acara Anda sekarang.'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                <Link to="/dashboard" className="h-12 px-8 rounded-lg bg-primary text-white font-bold text-base hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                                    <span>{config.hero?.ctaPrimary || 'Mulai Gratis'}</span>
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </Link>
                                <button className="h-12 px-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-base hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[20px] text-primary">play_circle</span>
                                    <span>{config.hero?.ctaSecondary || 'Lihat Demo'}</span>
                                </button>
                            </div>
                            <div className="pt-4 flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                            {['M', 'A', 'K'][i - 1]}
                                        </div>
                                    ))}
                                </div>
                                <p>{config.hero?.trustedBy || 'Dipercaya oleh 500+ Masjid'}</p>
                            </div>
                        </div>
                        <div className="relative w-full rounded-2xl shadow-2xl overflow-hidden">
                            {config.hero?.image ? (
                                <img src={config.hero.image} alt="Hero Preview" className="aspect-[4/3] w-full object-cover" />
                            ) : (
                                <div className="aspect-[4/3] w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <div className="text-center p-8">
                                        <span className="material-symbols-outlined text-[80px] text-primary/50">mosque</span>
                                        <p className="mt-4 text-gray-500">Your Event Image Here</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-background-light" id="features">
                <div className="max-w-[1280px] mx-auto px-4 md:px-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-primary font-bold text-sm tracking-widest uppercase mb-3">{config.features?.subtitle || 'Fitur Unggulan'}</h2>
                        <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{config.features?.title || 'Semua yang Anda Butuhkan untuk Event Sukses'}</h3>
                        <p className="text-gray-600 text-lg">
                            {config.features?.description || 'Platform kami dirancang khusus untuk memenuhi kebutuhan unik pengurus masjid dan komunitas dalam mengelola acara.'}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <FeatureCard key={idx} {...feature} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-20 bg-white border-t border-gray-100" id="pricing">
                <div className="max-w-[1280px] mx-auto px-4 md:px-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{config.pricing?.title || 'Pilih Paket Sesuai Kebutuhan'}</h2>
                        <p className="text-gray-600 text-lg">
                            {config.pricing?.description || 'Mulai dari gratis untuk komunitas kecil hingga fitur lengkap untuk organisasi besar.'}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {pricingPlans.map((plan, idx) => (
                            <PricingCard key={idx} {...plan} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-background-light">
                <div className="max-w-[1280px] mx-auto px-4 md:px-10">
                    <div className="relative rounded-3xl overflow-hidden bg-primary px-6 py-16 text-center md:px-12 lg:py-20">
                        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
                            <h2 className="text-3xl md:text-4xl font-black text-white">{config.cta?.title || 'Siap Mengelola Event Masjid Anda?'}</h2>
                            <p className="text-green-50 text-lg max-w-2xl">
                                {config.cta?.description || 'Bergabunglah dengan ratusan pengurus masjid lainnya yang telah beralih ke sistem digital yang lebih efisien dan transparan.'}
                            </p>
                            <Link to="/dashboard" className="h-12 px-8 mt-4 rounded-lg bg-white text-primary font-bold text-base hover:bg-gray-100 shadow-xl transition-all">
                                {config.cta?.buttonText || 'Buat Akun Gratis Sekarang'}
                            </Link>
                            <p className="text-sm text-green-100 mt-2 opacity-80">{config.cta?.note || 'Tidak perlu kartu kredit. Batal kapan saja.'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 pt-16 pb-8" id="contact">
                <div className="max-w-[1280px] mx-auto px-4 md:px-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[28px]">mosque</span>
                                <h2 className="text-xl font-bold text-gray-900">MasjidEvent</h2>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Platform manajemen event terpercaya untuk masjid dan komunitas Muslim modern.
                            </p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Produk</h3>
                            <div className="flex flex-col gap-2">
                                <a className="text-gray-600 hover:text-primary transition-colors text-sm" href="#">Fitur</a>
                                <a className="text-gray-600 hover:text-primary transition-colors text-sm" href="#">Harga</a>
                                <a className="text-gray-600 hover:text-primary transition-colors text-sm" href="#">Studi Kasus</a>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Perusahaan</h3>
                            <div className="flex flex-col gap-2">
                                <a className="text-gray-600 hover:text-primary transition-colors text-sm" href="#">Tentang Kami</a>
                                <a className="text-gray-600 hover:text-primary transition-colors text-sm" href="#">Kebijakan Privasi</a>
                                <a className="text-gray-600 hover:text-primary transition-colors text-sm" href="#">Syarat & Ketentuan</a>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Hubungi Kami</h3>
                            <div className="flex gap-4">
                                {['mail', 'photo_camera', 'public'].map((icon) => (
                                    <a key={icon} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-all" href="#">
                                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                    </a>
                                ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Jakarta, Indonesia<br />
                                support@masjidevent.com
                            </p>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-500 text-center md:text-left">
                            © 2026 MasjidEvent Platform. All rights reserved.
                        </p>
                        <span className="text-xs text-gray-400">Made with <span className="text-red-500">♥</span> for Ummah</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}
