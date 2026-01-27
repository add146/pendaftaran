import { useState, useRef, useEffect } from 'react'
import Draggable from 'react-draggable'
import { uploadAPI } from '../lib/api'

interface CertificateElement {
    id: string
    type: 'text' | 'qr'
    label: string
    x: number // percentage 0-100
    y: number // percentage 0-100
    fontSize: number
    color: string
    fontFamily: string
    align: 'left' | 'center' | 'right'
    width?: number
}

interface CertificateConfig {
    enabled: boolean
    backgroundUrl: string
    elements: CertificateElement[]
}

interface CertificateEditorProps {
    config: CertificateConfig | null;
    onChange: (config: CertificateConfig) => void;
    onSave?: () => void;
    isSaving?: boolean;
}

const DEFAULT_CONFIG: CertificateConfig = {
    enabled: false,
    backgroundUrl: '',
    elements: [
        {
            id: 'participant_name',
            type: 'text',
            label: '{Nama Peserta}',
            x: 50,
            y: 40,
            fontSize: 48,
            color: '#333333',
            fontFamily: 'Playfair Display',
            align: 'center'
        },
        {
            id: 'registration_id',
            type: 'text',
            label: '{ID Registrasi}',
            x: 50,
            y: 55,
            fontSize: 18,
            color: '#666666',
            fontFamily: 'Work Sans',
            align: 'center'
        }
    ]
}

const FONTS = [
    { name: 'Traditional Serif', value: 'Playfair Display' },
    { name: 'Modern Sans', value: 'Work Sans' },
    { name: 'Standard Serif', value: 'Merriweather' },
    { name: 'Simple Sans', value: 'Helvetica' },
]

// Sub-component to handle nodeRef for Draggable
interface DraggableItemProps {
    el: CertificateElement
    handleDragStop: (id: string, e: any, data: { x: number, y: number }) => void
}

const DraggableItem = ({ el, handleDragStop }: DraggableItemProps) => {
    const nodeRef = useRef<HTMLDivElement>(null)

    return (
        <Draggable
            nodeRef={nodeRef}
            bounds="parent"
            position={{
                x: (el.x / 100) * 800,
                y: (el.y / 100) * 565
            }}
            onStop={(e, data) => handleDragStop(el.id, e, data)}
        >
            <div
                ref={nodeRef}
                className={`absolute cursor-move border border-transparent hover:border-primary/50 hover:bg-primary/5 rounded transition-all group z-10 ${el.type === 'text' ? 'px-4 py-2' : ''}`}
                style={{
                    fontSize: `${el.fontSize}px`,
                    color: el.color,
                    fontFamily: el.fontFamily,
                    textAlign: el.align,
                    minWidth: el.type === 'text' ? '200px' : 'auto',
                    transform: 'translate(-50%, -50%)' // Center anchor
                }}
            >
                {/* Handles/Indicators */}
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border border-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border border-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {el.type === 'text' ? el.label : (
                    <div
                        style={{
                            width: `${el.fontSize}px`,
                            height: `${el.fontSize}px`,
                            backgroundColor: 'white',
                            border: '2px solid black',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <span className="material-symbols-outlined text-black" style={{ fontSize: `${el.fontSize * 0.5}px` }}>qr_code_2</span>
                    </div>
                )}
            </div>
        </Draggable>
    )
}

export default function CertificateEditor({ config, onChange, onSave, isSaving = false }: CertificateEditorProps) {
    const [localConfig, setLocalConfig] = useState<CertificateConfig>(() => {
        if (config) {
            return {
                ...DEFAULT_CONFIG,
                ...config,
                elements: config.elements || []
            }
        }
        return DEFAULT_CONFIG
    })
    const [uploading, setUploading] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (config) {
            setLocalConfig({
                ...DEFAULT_CONFIG,
                ...config,
                elements: config.elements || []
            })
        }
    }, [config])

    const updateConfig = (newConfig: CertificateConfig) => {
        setLocalConfig(newConfig)
        onChange(newConfig)
    }

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const result = await uploadAPI.uploadImage(file)
            updateConfig({ ...localConfig, backgroundUrl: result.url })
        } catch (error) {
            console.error('Upload failed', error)
            alert('Failed to upload background image')
        } finally {
            setUploading(false)
        }
    }

    const handleDragStop = (id: string, _e: any, data: { x: number, y: number }) => {
        if (!containerRef.current) return

        const xPercent = (data.x / 800) * 100
        const yPercent = (data.y / 565) * 100

        const newElements = (localConfig.elements || []).map(el =>
            el.id === id ? { ...el, x: xPercent, y: yPercent } : el
        )
        updateConfig({ ...localConfig, elements: newElements })
    }

    const updateElementStyle = (id: string, field: keyof CertificateElement, value: any) => {
        const newElements = (localConfig.elements || []).map(el =>
            el.id === id ? { ...el, [field]: value } : el
        )
        updateConfig({ ...localConfig, elements: newElements })
    }

    const toggleEnabled = () => {
        updateConfig({ ...localConfig, enabled: !localConfig.enabled })
    }

    const addTextElement = () => {
        const newId = `text_${Date.now()}`
        const newElement: CertificateElement = {
            id: newId,
            type: 'text',
            label: 'New Text',
            x: 50,
            y: 50,
            fontSize: 24,
            color: '#000000',
            fontFamily: 'Helvetica',
            align: 'center'
        }
        updateConfig({ ...localConfig, elements: [...localConfig.elements, newElement] })
    }



    const removeElement = (id: string) => {
        const newElements = localConfig.elements.filter(el => el.id !== id)
        updateConfig({ ...localConfig, elements: newElements })
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Font Imports */}
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Work+Sans:wght@300..900&display=swap');
                `}
            </style>

            {/* Header / Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Certificate Designer</h2>
                    <p className="text-gray-500 text-sm">Customize the look and feel of your event certificate.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-gray-100 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${localConfig.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <span className="text-sm font-medium text-gray-600">{localConfig.enabled ? 'Active' : 'Draft'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Preview Area */}
                <div className="lg:col-span-9">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h3 className="font-semibold text-gray-700">Live Preview</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="material-symbols-outlined text-[16px]">aspect_ratio</span>
                            <span>A4 Landscape (297mm x 210mm)</span>
                        </div>
                    </div>

                    <div className="w-full bg-gray-200/80 rounded-2xl border-2 border-dashed border-gray-300 p-4 md:p-10 flex justify-center items-center shadow-inner overflow-auto">
                        <div
                            className="relative bg-white shadow-2xl transition-all duration-300"
                            style={{
                                width: '800px',
                                height: '565px',
                                minWidth: '800px', // Prevent shrinking
                            }}
                        >
                            {/* Paper Content */}
                            <div
                                ref={containerRef}
                                className="w-full h-full relative overflow-hidden"
                                style={{
                                    backgroundImage: localConfig.backgroundUrl ? `url(${localConfig.backgroundUrl})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundColor: localConfig.backgroundUrl ? 'transparent' : '#fff9f0' // Slight cream if no bg
                                }}
                            >
                                {/* Default Pattern if no BG */}
                                {!localConfig.backgroundUrl && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                                        <div className="w-full h-full border-[12px] border-primary/20 absolute top-0 left-0"></div>
                                        <div className="w-[calc(100%-16px)] h-[calc(100%-16px)] border-[2px] border-yellow-500/30 absolute top-2 left-2"></div>
                                        <span className="material-symbols-outlined text-9xl text-gray-200">workspace_premium</span>
                                        <p className="text-gray-400 font-serif mt-4">Upload your certificate background designed in Canva/Figma</p>
                                    </div>
                                )}

                                {(localConfig.elements || []).map(el => (
                                    <DraggableItem
                                        key={el.id}
                                        el={el}
                                        handleDragStop={handleDragStop}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-3 flex flex-col gap-6">

                    {/* Save Button */}
                    {onSave && (
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="w-full py-3 px-6 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">save</span>
                                    Save Design
                                </>
                            )}
                        </button>
                    )}

                    {/* Status & General */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Configuration</h3>

                        <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                            <span className="text-sm font-medium text-gray-700">Enable Certificate</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={localConfig.enabled} onChange={toggleEnabled} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </div>
                        </label>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Background Image</label>
                            {localConfig.backgroundUrl ? (
                                <div className="relative w-full h-32 border-2 border-gray-200 rounded-lg overflow-hidden group">
                                    <img
                                        src={localConfig.backgroundUrl}
                                        alt="Background"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => updateConfig({ ...localConfig, backgroundUrl: '' })}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg transform hover:scale-110"
                                            title="Remove Image"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">upload_file</span>
                                        <p className="text-xs text-gray-500">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                                </label>
                            )}
                        </div>

                        {/* Add Elements Buttons */}
                        <div className="pt-2 flex gap-2">
                            <button
                                onClick={addTextElement}
                                className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">add_box</span>
                                Add Text
                            </button>
                        </div>
                    </div>

                    {/* Text Elements */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 max-h-[600px] overflow-y-auto">
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Elements</h3>

                        {(localConfig.elements || []).map(el => (
                            <div key={el.id} className="p-3 bg-gray-50 rounded-lg space-y-3 border border-transparent hover:border-primary/20">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-gray-400 cursor-move">drag_indicator</span>
                                    {el.type === 'text' ? (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <input
                                                type="text"
                                                value={el.label}
                                                onChange={(e) => updateElementStyle(el.id, 'label', e.target.value)}
                                                className="w-full text-xs font-bold text-primary bg-transparent border-none p-0 focus:ring-0"
                                            />
                                            {/* Placeholder Helper */}
                                            <div className="flex gap-1">
                                                {['{Nama Peserta}', '{ID Registrasi}', '{Judul Event}'].map(ph => (
                                                    <button
                                                        key={ph}
                                                        onClick={() => updateElementStyle(el.id, 'label', ph)}
                                                        className="text-[9px] bg-gray-200 px-1 rounded hover:bg-gray-300"
                                                        title={`Set to ${ph}`}
                                                    >
                                                        {ph}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="flex-1 text-xs font-bold text-primary">QR Code</span>
                                    )}
                                    <button
                                        onClick={() => removeElement(el.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Remove Element"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                </div>

                                {el.type === 'text' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1">Font Family</label>
                                                <select
                                                    value={el.fontFamily}
                                                    onChange={(e) => updateElementStyle(el.id, 'fontFamily', e.target.value)}
                                                    className="w-full text-xs p-1.5 rounded border border-gray-200"
                                                >
                                                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1">Size (px)</label>
                                                <div className="flex items-center">
                                                    <input
                                                        type="number"
                                                        value={el.fontSize}
                                                        onChange={(e) => updateElementStyle(el.id, 'fontSize', parseInt(e.target.value))}
                                                        className="w-full text-xs p-1.5 rounded-l border border-r-0 border-gray-200"
                                                    />
                                                    <div className="bg-gray-100 border border-l-0 border-gray-200 p-1.5 rounded-r text-xs text-gray-500">px</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-gray-400 mb-1">Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={el.color}
                                                        onChange={(e) => updateElementStyle(el.id, 'color', e.target.value)}
                                                        className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                                                    />
                                                    <span className="text-xs text-gray-500 font-mono">{el.color}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-gray-400 mb-1">Align</label>
                                                <div className="flex bg-white rounded border border-gray-200 p-1">
                                                    {['left', 'center', 'right'].map((align) => (
                                                        <button
                                                            key={align}
                                                            onClick={() => updateElementStyle(el.id, 'align', align)}
                                                            className={`flex-1 flex items-center justify-center py-1 rounded ${el.align === align ? 'bg-gray-100 text-primary' : 'text-gray-400'}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">format_align_{align}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {el.type === 'qr' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] text-gray-400 mb-1">Size (px)</label>
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    value={el.fontSize}
                                                    onChange={(e) => updateElementStyle(el.id, 'fontSize', parseInt(e.target.value))}
                                                    className="w-full text-xs p-1.5 rounded-l border border-r-0 border-gray-200"
                                                />
                                                <div className="bg-gray-100 border border-l-0 border-gray-200 p-1.5 rounded-r text-xs text-gray-500">px</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
