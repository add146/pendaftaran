import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'
import { nanoid } from 'nanoid'

export const customFields = new Hono<{ Bindings: Bindings }>()

// Create custom field for event
customFields.post('/:eventId/custom-fields', authMiddleware, async (c) => {
    const user = c.get('user')
    const { eventId } = c.req.param()
    const body = await c.req.json()
    const { field_type, label, required, options, display_order } = body as {
        field_type: 'text' | 'textarea' | 'radio' | 'checkbox'
        label: string
        required?: boolean
        options?: string[]
        display_order?: number
    }

    // Verify user owns this event
    const event = await c.env.DB.prepare(
        'SELECT id, organization_id FROM events WHERE id = ?'
    ).bind(eventId).first() as { id: string; organization_id: string } | null

    if (!event || event.organization_id !== user.orgId) {
        return c.json({ error: 'Event not found or unauthorized' }, 403)
    }

    // Validate field type
    if (!['text', 'textarea', 'radio', 'checkbox'].includes(field_type)) {
        return c.json({ error: 'Invalid field type' }, 400)
    }

    // Validate options for radio/checkbox
    if ((field_type === 'radio' || field_type === 'checkbox') && (!options || !Array.isArray(options) || options.length === 0)) {
        return c.json({ error: 'Options required for radio and checkbox fields' }, 400)
    }

    const fieldId = nanoid()
    const optionsJson = options ? JSON.stringify(options) : null

    await c.env.DB.prepare(`
        INSERT INTO event_custom_fields (id, event_id, field_type, label, required, options, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        fieldId,
        eventId,
        field_type,
        label,
        required ? 1 : 0,
        optionsJson,
        display_order || 0
    ).run()

    return c.json({
        id: fieldId,
        event_id: eventId,
        field_type,
        label,
        required: required || false,
        options,
        display_order: display_order || 0
    }, 201)
})

// Get all custom fields for an event (public endpoint)
customFields.get('/:eventId/custom-fields', async (c) => {
    const { eventId } = c.req.param()

    const fields = await c.env.DB.prepare(`
        SELECT id, event_id, field_type, label, required, options, display_order, created_at
        FROM event_custom_fields
        WHERE event_id = ?
        ORDER BY display_order ASC, created_at ASC
    `).bind(eventId).all()

    // Parse options JSON for each field
    const parsedFields = fields.results.map((field: any) => ({
        ...field,
        required: field.required === 1,
        options: field.options ? JSON.parse(field.options) : null
    }))

    return c.json({ fields: parsedFields })
})

// Update custom field
customFields.put('/:eventId/custom-fields/:fieldId', authMiddleware, async (c) => {
    const user = c.get('user')
    const { eventId, fieldId } = c.req.param()
    const body = await c.req.json()
    const { label, required, options, display_order } = body as {
        label?: string
        required?: boolean
        options?: string[]
        display_order?: number
    }

    // Verify user owns this event
    const event = await c.env.DB.prepare(
        'SELECT id, organization_id FROM events WHERE id = ?'
    ).bind(eventId).first() as { id: string; organization_id: string } | null

    if (!event || event.organization_id !== user.orgId) {
        return c.json({ error: 'Event not found or unauthorized' }, 403)
    }

    // Get field to check if it exists
    const field = await c.env.DB.prepare(
        'SELECT id, field_type FROM event_custom_fields WHERE id = ? AND event_id = ?'
    ).bind(fieldId, eventId).first() as { id: string; field_type: string } | null

    if (!field) {
        return c.json({ error: 'Field not found' }, 404)
    }

    // Validate options if provided for radio/checkbox
    if (options && (field.field_type === 'radio' || field.field_type === 'checkbox') && (!Array.isArray(options) || options.length === 0)) {
        return c.json({ error: 'Options required for radio and checkbox fields' }, 400)
    }

    const optionsJson = options ? JSON.stringify(options) : undefined

    await c.env.DB.prepare(`
        UPDATE event_custom_fields
        SET label = COALESCE(?, label),
            required = COALESCE(?, required),
            options = COALESCE(?, options),
            display_order = COALESCE(?, display_order)
        WHERE id = ? AND event_id = ?
    `).bind(
        label ?? null,
        required !== undefined ? (required ? 1 : 0) : null,
        optionsJson ?? null,
        display_order ?? null,
        fieldId,
        eventId
    ).run()

    return c.json({ message: 'Field updated successfully' })
})

// Delete custom field
customFields.delete('/:eventId/custom-fields/:fieldId', authMiddleware, async (c) => {
    const user = c.get('user')
    const { eventId, fieldId } = c.req.param()

    // Verify user owns this event
    const event = await c.env.DB.prepare(
        'SELECT id, organization_id FROM events WHERE id = ?'
    ).bind(eventId).first() as { id: string; organization_id: string } | null

    if (!event || event.organization_id !== user.orgId) {
        return c.json({ error: 'Event not found or unauthorized' }, 403)
    }

    await c.env.DB.prepare(
        'DELETE FROM event_custom_fields WHERE id = ? AND event_id = ?'
    ).bind(fieldId, eventId).run()

    return c.json({ message: 'Field deleted successfully' })
})
