import { useParams } from 'react-router-dom'

export default function EventRegistration() {
    const { slug: _slug } = useParams()

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen flex flex-col">
            {/* Top Navigation */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light bg-card-light px-6 lg:px-10 py-3 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="size-8 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[32px]">mosque</span>
                    </div>
                    <h2 className="text-text-main text-lg font-bold leading-tight tracking-tight">Mosque Connect</h2>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <nav className="flex items-center gap-6">
                        <a className="text-text-main text-sm font-medium hover:text-primary transition-colors" href="#">Events</a>
                        <a className="text-text-main text-sm font-medium hover:text-primary transition-colors" href="#">About Us</a>
                        <a className="text-text-main text-sm font-medium hover:text-primary transition-colors" href="#">Contact</a>
                    </nav>
                    <button className="flex items-center justify-center px-4 h-9 bg-background-light border border-border-light text-text-main text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors">
                        Login
                    </button>
                </div>
                <button className="md:hidden text-text-main">
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                    {/* LEFT COLUMN: Event Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Hero Image */}
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br from-primary/30 to-primary/10">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[80px] text-primary/30">mosque</span>
                            </div>
                            <div className="absolute bottom-0 left-0 p-6 z-20">
                                <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full mb-3 shadow-lg">
                                    Religious Gathering
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight drop-shadow-md">
                                    Pengajian Akbar: Preparing for Ramadan
                                </h1>
                            </div>
                        </div>

                        {/* Essential Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-card-light border border-border-light shadow-sm">
                                <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary shrink-0">
                                    <span className="material-symbols-outlined">calendar_month</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Date & Time</p>
                                    <p className="text-sm font-semibold text-text-main mt-1">Sunday, March 10th, 2024</p>
                                    <p className="text-sm text-text-muted">09:00 AM - 11:30 AM</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-card-light border border-border-light shadow-sm">
                                <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary shrink-0">
                                    <span className="material-symbols-outlined">location_on</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Location</p>
                                    <p className="text-sm font-semibold text-text-main mt-1">Masjid Al-Ikhlas, Main Hall</p>
                                    <a className="text-sm text-primary hover:underline mt-0.5 inline-flex items-center gap-1" href="#">
                                        View on Map <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-xl font-bold text-text-main mb-3">About the Event</h3>
                                <p className="text-base text-text-muted leading-relaxed">
                                    Join us for a spiritual gathering designed to prepare our hearts and minds for the blessed month of Ramadan. This special event will focus on practical steps to maximize your worship, purify your intentions, and build consistent habits before the holy month arrives.
                                </p>
                                <p className="text-base text-text-muted leading-relaxed mt-4">
                                    Lunch will be provided for all registered attendees. This event is open to brothers and sisters.
                                </p>
                            </section>

                            <div className="h-px w-full bg-border-light"></div>

                            <section>
                                <h3 className="text-xl font-bold text-text-main mb-4">Featured Speaker</h3>
                                <div className="flex items-center gap-4">
                                    <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/20">
                                        UA
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-text-main">Ustadh Abdullah</p>
                                        <p className="text-sm text-text-muted">Senior Lecturer, Islamic Studies Institute</p>
                                    </div>
                                </div>
                            </section>

                            <div className="h-px w-full bg-border-light"></div>

                            {/* Map Preview */}
                            <section>
                                <h3 className="text-xl font-bold text-text-main mb-4">Getting There</h3>
                                <div className="w-full h-48 bg-gray-200 rounded-xl overflow-hidden relative flex items-center justify-center">
                                    <button className="bg-white text-text-main px-4 py-2 rounded-lg shadow-md font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">directions</span>
                                        Get Directions
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Registration Form */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <div className="bg-card-light rounded-2xl shadow-xl border border-border-light overflow-hidden">
                                {/* Header with Price */}
                                <div className="bg-primary/5 p-6 border-b border-border-light flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-text-muted">Registration Fee</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-primary">Free</span>
                                            <span className="text-xs text-text-muted line-through opacity-60">IDR 50.000</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <span className="material-symbols-outlined text-primary text-2xl">confirmation_number</span>
                                    </div>
                                </div>

                                {/* Form */}
                                <form className="p-6 space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-text-main" htmlFor="fullname">Full Name</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">person</span>
                                            <input
                                                type="text"
                                                id="fullname"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-text-main text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow placeholder:text-gray-400"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-text-main" htmlFor="email">Email Address</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">mail</span>
                                            <input
                                                type="email"
                                                id="email"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-text-main text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow placeholder:text-gray-400"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-text-main" htmlFor="whatsapp">WhatsApp Number</label>
                                        <div className="flex">
                                            <div className="flex items-center justify-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-text-muted text-sm font-medium">
                                                +62
                                            </div>
                                            <input
                                                type="tel"
                                                id="whatsapp"
                                                className="w-full px-4 py-2.5 rounded-r-lg border border-gray-300 bg-white text-text-main text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow placeholder:text-gray-400"
                                                placeholder="812-3456-7890"
                                            />
                                        </div>
                                        <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">qr_code</span>
                                            QR ticket will be sent via WhatsApp
                                        </p>
                                    </div>

                                    {/* Gender Selection */}
                                    <div className="space-y-1.5">
                                        <span className="text-sm font-semibold text-text-main block mb-2">I am attending as</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="cursor-pointer">
                                                <input type="radio" name="gender" defaultChecked className="peer sr-only" />
                                                <div className="text-center py-2 px-3 rounded-lg border border-gray-300 bg-white peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:text-primary transition-all text-sm font-medium text-text-muted">
                                                    Ikhwan (Male)
                                                </div>
                                            </label>
                                            <label className="cursor-pointer">
                                                <input type="radio" name="gender" className="peer sr-only" />
                                                <div className="text-center py-2 px-3 rounded-lg border border-gray-300 bg-white peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:text-primary transition-all text-sm font-medium text-text-muted">
                                                    Akhwat (Female)
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group">
                                            Register Now
                                            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                                        </button>
                                        <p className="text-center text-xs text-text-muted mt-4 flex justify-center items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px] text-green-600">lock</span>
                                            Secure Registration powered by Mosque Connect
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-border-light py-8 mt-auto bg-card-light">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm text-text-muted">© 2026 Mosque Connect. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
