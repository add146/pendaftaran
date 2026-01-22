import { useState, useEffect } from 'react'
import { customFieldsAPI, type CustomField } from '../lib/api'

interface CustomFieldsEditorProps {
    eventId: string
}

export default function CustomFieldsEditor({ eventId }: CustomFieldsEditorProps) {
    const [fields, setFields] = useState<CustomField[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingField, setEditingField] = useState<CustomField | null>(null)

    useEffect(() => {
        if (!eventId) {
            setLoading(false)
            return
        }
        loadFields()
    }, [eventId])

    const loadFields = async () => {
        try {
            setError('')
            const data = await customFieldsAPI.list(eventId)
            setFields(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load custom fields:', err)
            setError(err instanceof Error ? err.message : 'Failed to load fields')
            setFields([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (fieldId: string) => {
        if (!confirm('Are you sure you want to delete this field?')) return

        try {
            await customFieldsAPI.delete(eventId, fieldId)
            setFields(fields.filter(f => f.id !== fieldId))
        } catch (error) {
            alert('Failed to delete field')
        }
    }

    const reorderField = async (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === fields.length - 1)
        ) return

        const newFields = [...fields]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const [field] = newFields.splice(index, 1)
        newFields.splice(targetIndex, 0, field)

        // Update display_order for all fields
        for (let i = 0; i < newFields.length; i++) {
            try {
                await customFieldsAPI.update(eventId, newFields[i].id, { display_order: i })
            } catch (error) {
                console.error('Failed to update field order:', error)
            }
        }

        setFields(newFields)
    }

    if (!eventId) {
        return null
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-16 bg-gray-100 rounded"></div>
                        <div className="h-16 bg-gray-100 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-2">Custom Form Fields</h3>
                <p className="text-sm text-red-600">{error}</p>
                <button
                    type="button"
                    onClick={() => loadFields()}
                    className="mt-2 text-sm text-primary hover:underline"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Custom Form Fields</h3>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 text-primary text-sm font-medium hover:text-primary-hover"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add Field
                </button>
            </div>

            {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">text_fields</span>
                    <p>No custom fields added yet</p>
                    <p className="text-xs mt-1">Add fields to collect additional information from participants</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium">{field.label}</span>
                                        {field.required && (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="px-2 py-1 bg-gray-100 rounded">
                                            {field.field_type === 'text' && 'Text Input'}
                                            {field.field_type === 'textarea' && 'Text Box'}
                                            {field.field_type === 'radio' && 'Radio Buttons'}
                                            {field.field_type === 'checkbox' && 'Checkboxes'}
                                        </span>
                                        {field.options && field.options.length > 0 && (
                                            <span className="text-gray-400">• {field.options.length} options</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => reorderField(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => reorderField(index, 'down')}
                                        disabled={index === fields.length - 1}
                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingField(field)}
                                        className="p-1 text-blue-500 hover:text-blue-700"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(field.id)}
                                        className="p-1 text-red-500 hover:text-red-700"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(showAddModal || editingField) && (
                <FieldFormModal
                    eventId={eventId}
                    field={editingField}
                    existingFields={fields}
                    onClose={() => {
                        setShowAddModal(false)
                        setEditingField(null)
                    }}
                    onSave={() => {
                        loadFields()
                        setShowAddModal(false)
                        setEditingField(null)
                    }}
                />
            )}
        </div>
    )
}

interface FieldFormModalProps {
    eventId: string
    field: CustomField | null
    existingFields: CustomField[]
    onClose: () => void
    onSave: () => void
}

function FieldFormModal({ eventId, field, existingFields, onClose, onSave }: FieldFormModalProps) {
    const [fieldType, setFieldType] = useState<'text' | 'textarea' | 'radio' | 'checkbox'>(field?.field_type || 'text')
    const [label, setLabel] = useState(field?.label || '')
    const [required, setRequired] = useState(field?.required || false)
    const [options, setOptions] = useState<string[]>(field?.options || [''])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const addOption = () => {
        setOptions([...options, ''])
    }

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
    }

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!label.trim()) {
            setError('Label is required')
            return
        }

        if ((fieldType === 'radio' || fieldType === 'checkbox') && options.filter(o => o.trim()).length < 2) {
            setError('At least 2 options are required for radio/checkbox fields')
            return
        }

        setSaving(true)

        try {
            const fieldData = {
                field_type: fieldType,
                label: label.trim(),
                required,
                options: (fieldType === 'radio' || fieldType === 'checkbox') ? options.filter(o => o.trim()) : undefined,
                display_order: field ? field.display_order : existingFields.length
            }

            if (field) {
                await customFieldsAPI.update(eventId, field.id, fieldData)
            } else {
                await customFieldsAPI.create(eventId, fieldData)
            }

            onSave()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save field')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{field ? 'Edit Field' : 'Add Custom Field'}</h3>
                    <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Field Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'text', label: 'Text Input', icon: 'text_fields' },
                                { value: 'textarea', label: 'Text Box', icon: 'notes' },
                                { value: 'radio', label: 'Radio Buttons', icon: 'radio_button_checked' },
                                { value: 'checkbox', label: 'Checkboxes', icon: 'check_box' }
                            ].map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFieldType(type.value as typeof fieldType)}
                                    className={`p-3 border-2 rounded-lg flex items-center gap-2 text-sm ${fieldType === type.value
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 text-gray-600'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{type.icon}</span>
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Field Label *</label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g., Alamat Lengkap"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={required}
                                onChange={(e) => setRequired(e.target.checked)}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <span className="text-sm font-medium">Required field</span>
                        </label>
                    </div>

                    {(fieldType === 'radio' || fieldType === 'checkbox') && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Options *</label>
                            <div className="space-y-2">
                                {options.map((option, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateOption(index, e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                        {options.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeOption(index)}
                                                className="p-2 text-red-500 hover:text-red-700"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="text-primary text-sm font-medium hover:text-primary-hover flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Add Option
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (field ? 'Update' : 'Add Field')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
