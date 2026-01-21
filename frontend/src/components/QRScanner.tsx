import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { participantsAPI } from '../lib/api'

interface QRScannerProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
    onCheckInSuccess?: (participant: { full_name: string; registration_id: string; check_in_time: string }) => void
}

export default function QRScanner({ isOpen, onClose, eventId, onCheckInSuccess }: QRScannerProps) {
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<{
        success: boolean
        message: string
        participant?: { full_name: string; registration_id: string; check_in_time: string }
    } | null>(null)
    const [manualEntry, setManualEntry] = useState(false)
    const [manualId, setManualId] = useState('')
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen && !manualEntry && containerRef.current) {
            startScanner()
        }
        return () => {
            stopScanner()
        }
    }, [isOpen, manualEntry])

    const startScanner = async () => {
        if (scannerRef.current) return

        try {
            const scanner = new Html5Qrcode('qr-reader')
            scannerRef.current = scanner

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                onScanSuccess,
                () => { } // Ignore scan errors
            )
            setScanning(true)
        } catch (err) {
            console.error('Failed to start scanner:', err)
            setResult({ success: false, message: 'Failed to access camera. Please check permissions.' })
        }
    }

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop()
                scannerRef.current = null
                setScanning(false)
            } catch (err) {
                console.error('Failed to stop scanner:', err)
            }
        }
    }

    const onScanSuccess = async (decodedText: string) => {
        await stopScanner()
        await processCheckIn(decodedText)
    }

    const processCheckIn = async (id: string) => {
        setResult(null)
        try {
            const response = await participantsAPI.checkIn(id)
            setResult({
                success: true,
                message: 'Check-in Successful!',
                participant: response.participant
            })
            onCheckInSuccess?.(response.participant)
        } catch (err: any) {
            setResult({
                success: false,
                message: err.message || 'Check-in failed'
            })
        }
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualId.trim()) {
            processCheckIn(manualId.trim())
        }
    }

    const handleScanNext = () => {
        setResult(null)
        setManualId('')
        if (!manualEntry) {
            startScanner()
        }
    }

    const handleClose = () => {
        stopScanner()
        setResult(null)
        setManualId('')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-95 transition-opacity backdrop-blur-sm"
                    onClick={handleClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">​</span>

                {/* Modal Panel */}
                <div className="relative inline-block align-bottom bg-background-light rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
                    {/* Modal Header */}
                    <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg leading-6 font-bold text-text-main">QR Code Scanner</h3>
                        <button
                            className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={handleClose}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row h-[600px] md:h-[500px]">
                        {/* Camera View / Manual Entry */}
                        <div className="relative w-full md:w-2/3 bg-black flex items-center justify-center overflow-hidden">
                            {!manualEntry ? (
                                <>
                                    <div id="qr-reader" ref={containerRef} className="w-full h-full"></div>
                                    {!scanning && !result && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                                <p>Starting camera...</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-8">
                                    <form onSubmit={handleManualSubmit} className="w-full max-w-md">
                                        <label className="block text-white mb-2 font-medium">Enter Registration ID:</label>
                                        <input
                                            type="text"
                                            value={manualId}
                                            onChange={(e) => setManualId(e.target.value)}
                                            placeholder="REG-2026-00001"
                                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-primary"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full mt-4 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                        >
                                            Check In
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Sidebar / Feedback */}
                        <div className="w-full md:w-1/3 bg-background-light flex flex-col border-l border-gray-100">
                            {/* Mode Switcher */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex bg-gray-200 p-1 rounded-lg">
                                    <button
                                        onClick={() => { setManualEntry(false); setResult(null); }}
                                        className={`flex-1 text-xs font-bold py-1.5 px-3 rounded-md transition-all ${!manualEntry ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Scan QR
                                    </button>
                                    <button
                                        onClick={() => { setManualEntry(true); stopScanner(); setResult(null); }}
                                        className={`flex-1 text-xs font-bold py-1.5 px-3 rounded-md transition-all ${manualEntry ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Manual Entry
                                    </button>
                                </div>
                            </div>

                            {/* Result Area */}
                            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                                {result ? (
                                    <>
                                        <div className={`size-16 rounded-full flex items-center justify-center mb-4 ${result.success ? 'bg-green-100 animate-bounce' : 'bg-red-100'}`}>
                                            <span className={`material-symbols-outlined text-4xl ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.success ? 'check_circle' : 'error'}
                                            </span>
                                        </div>
                                        <h4 className={`text-xl font-bold mb-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                            {result.message}
                                        </h4>
                                        {result.participant && (
                                            <>
                                                <p className="text-sm text-gray-500 mb-6">Verified at {result.participant.check_in_time}</p>
                                                <div className="w-full bg-white p-4 rounded-xl border border-gray-100 mb-6">
                                                    <div className="text-sm text-gray-500 uppercase tracking-wider text-xs font-bold mb-1">Participant</div>
                                                    <div className="text-lg font-bold text-text-main">{result.participant.full_name}</div>
                                                    <div className="text-sm font-mono text-gray-500 mt-1">#{result.participant.registration_id}</div>
                                                </div>
                                            </>
                                        )}
                                        <button
                                            onClick={handleScanNext}
                                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span>Scan Next</span>
                                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-gray-400">
                                        <span className="material-symbols-outlined text-6xl mb-4 opacity-50">qr_code_scanner</span>
                                        <p className="text-sm">{manualEntry ? 'Enter a registration ID to check in' : 'Position QR code in front of camera'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
