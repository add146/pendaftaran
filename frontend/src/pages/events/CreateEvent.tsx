import { useState } from 'react'
import { Link } from 'react-router-dom'

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
    const steps = [
        { num: 1, label: 'General Info' },
        { num: 2, label: 'Tickets' },
        { num: 3, label: 'Preview' },
    ]

    return (
        <nav className="mb-8 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            {steps.map((step, idx) => (
                <>
                    <div
                        key={step.num}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === step.num
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-muted'
                            }`}
                    >
                        <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${currentStep === step.num
                                    ? 'bg-primary text-white'
                                    : 'border border-current'
                                }`}
                        >
                            {step.num}
                        </span>
                        <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    {idx < steps.length - 1 && (
                        <div className="h-px w-8 bg-border-light"></div>
                    )}
                </>
            ))}
        </nav>
    )
}

export default function CreateEvent() {
    const [currentStep, setCurrentStep] = useState(1)
    const [eventMode, setEventMode] = useState<'free' | 'paid'>('free')
    const [visibility, setVisibility] = useState<'public' | 'private'>('public')

    return (
        <div className="bg-background-light text-text-main font-display min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-light bg-background-light/80 backdrop-blur-md px-6 py-3 lg:px-10">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined icon-filled text-2xl">mosque</span>
                    </Link>
                    <h2 className="text-xl font-bold tracking-tight text-text-main">MosqueManager</h2>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-black/5 transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        IA
                    </div>
                </div>
            </header>

            <main className="flex-1 px-4 py-8 md:px-10 lg:px-20">
                <div className="mx-auto max-w-6xl">
                    {/* Stepper */}
                    <StepIndicator currentStep={currentStep} />

                    {/* Page Heading */}
                    <div className="mb-10 flex flex-col gap-2">
                        <h1 className="text-3xl font-black tracking-tight text-text-main md:text-4xl">Create New Event</h1>
                        <p className="text-text-muted">Step {currentStep} of 3: {currentStep === 1 ? 'Fill in the basic details for your upcoming event.' : currentStep === 2 ? 'Configure ticket types and pricing.' : 'Review and publish your event.'}</p>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                        {/* Left Column: Main Form */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Event Title */}
                            <div className="rounded-xl bg-card-light p-6 shadow-sm ring-1 ring-border-light">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-text-main">Event Title</span>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-border-light bg-background-light px-4 py-3 text-base font-normal text-text-main placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                                        placeholder="e.g., Annual Community Iftar 2024"
                                    />
                                </label>
                            </div>

                            {/* Description */}
                            <div className="rounded-xl bg-card-light p-6 shadow-sm ring-1 ring-border-light">
                                <span className="mb-2 block text-sm font-semibold text-text-main">About the Event</span>
                                <div className="overflow-hidden rounded-lg border border-border-light">
                                    {/* Toolbar */}
                                    <div className="flex flex-wrap gap-1 border-b border-border-light bg-background-light px-3 py-2">
                                        {['format_bold', 'format_italic', 'format_underlined', 'format_list_bulleted', 'format_list_numbered', 'link', 'image'].map((icon) => (
                                            <button key={icon} className="rounded p-1.5 text-text-muted hover:bg-gray-200 hover:text-text-main transition-colors" type="button">
                                                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {/* Textarea */}
                                    <textarea
                                        className="min-h-[200px] w-full resize-none border-0 bg-white p-4 text-base text-text-main focus:ring-0"
                                        placeholder="Describe the event details, agenda, and what attendees can expect..."
                                    ></textarea>
                                </div>
                            </div>

                            {/* Date, Time & Quota */}
                            <div className="rounded-xl bg-card-light p-6 shadow-sm ring-1 ring-border-light">
                                <h3 className="mb-4 text-lg font-bold text-text-main">Schedule & Capacity</h3>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-text-main">Start Date</span>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-border-light bg-background-light px-4 py-3 pl-11 text-base font-normal text-text-main focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">calendar_today</span>
                                        </div>
                                    </label>
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-text-main">Start Time</span>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                className="w-full rounded-lg border-border-light bg-background-light px-4 py-3 pl-11 text-base font-normal text-text-main focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">schedule</span>
                                        </div>
                                    </label>
                                    <label className="block md:col-span-2">
                                        <span className="mb-2 block text-sm font-semibold text-text-main">Event Location</span>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-border-light bg-background-light px-4 py-3 pl-11 text-base font-normal text-text-main placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="Search for a location or enter address"
                                            />
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">location_on</span>
                                        </div>
                                        {/* Map Placeholder */}
                                        <div className="mt-3 h-48 w-full overflow-hidden rounded-lg bg-gray-100 relative flex items-center justify-center">
                                            <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-text-main shadow-md hover:bg-gray-50">
                                                <span className="material-symbols-outlined text-primary">add_location_alt</span>
                                                Pin on Map
                                            </button>
                                        </div>
                                    </label>
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-text-main">Total Capacity (Quota)</span>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full rounded-lg border-border-light bg-background-light px-4 py-3 pl-11 text-base font-normal text-text-main placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="0"
                                            />
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">group</span>
                                        </div>
                                        <p className="mt-1 text-xs text-text-muted">Leave blank for unlimited capacity.</p>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="sticky top-24 rounded-xl bg-card-light p-6 shadow-sm ring-1 ring-border-light">
                                <h3 className="mb-4 text-lg font-bold text-text-main">Configuration</h3>

                                {/* Event Mode */}
                                <div className="mb-6 space-y-4">
                                    <p className="text-sm font-semibold text-text-main">Event Mode</p>
                                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-background-light p-1">
                                        <button
                                            onClick={() => setEventMode('free')}
                                            className={`rounded-md py-2 text-sm font-medium transition-all ${eventMode === 'free'
                                                    ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                                                    : 'text-text-muted hover:text-text-main'
                                                }`}
                                        >
                                            Free
                                        </button>
                                        <button
                                            onClick={() => setEventMode('paid')}
                                            className={`rounded-md py-2 text-sm font-medium transition-all ${eventMode === 'paid'
                                                    ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                                                    : 'text-text-muted hover:text-text-main'
                                                }`}
                                        >
                                            Paid
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-muted">
                                        Free events do not require payment processing. Attendees will receive a QR code immediately.
                                    </p>
                                </div>

                                <hr className="my-6 border-border-light" />

                                {/* Visibility */}
                                <div className="mb-6 space-y-4">
                                    <p className="text-sm font-semibold text-text-main">Visibility</p>
                                    <label className="flex cursor-pointer items-start gap-3">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            checked={visibility === 'public'}
                                            onChange={() => setVisibility('public')}
                                            className="mt-1 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-text-main">Public</span>
                                            <span className="text-xs text-text-muted">Listed on your community page and search results.</span>
                                        </div>
                                    </label>
                                    <label className="flex cursor-pointer items-start gap-3">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            checked={visibility === 'private'}
                                            onChange={() => setVisibility('private')}
                                            className="mt-1 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-text-main">Private</span>
                                            <span className="text-xs text-text-muted">Only accessible via direct link invite.</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Tip */}
                                <div className="mt-4 rounded-lg bg-primary/5 p-4 border border-primary/10">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary mt-0.5">lightbulb</span>
                                        <p className="text-xs text-text-main leading-relaxed">
                                            <span className="font-bold text-primary">Tip:</span> Use a clear, descriptive title to help attendees find your event easily on the mobile app.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-12 border-t border-border-light pt-6 flex flex-col-reverse justify-end gap-4 sm:flex-row">
                        <button className="px-6 py-3 rounded-lg border border-border-light bg-transparent text-sm font-semibold text-text-main hover:bg-gray-50 transition-colors">
                            Save as Draft
                        </button>
                        <button
                            onClick={() => currentStep < 3 ? setCurrentStep(currentStep + 1) : null}
                            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-primary text-sm font-semibold text-white shadow-md hover:bg-primary-hover transition-all"
                        >
                            {currentStep < 3 ? 'Next: Ticketing' : 'Publish Event'}
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
