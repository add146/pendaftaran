import { Hono } from 'hono'
import type { Bindings } from '../index'

export const debug = new Hono<{ Bindings: Bindings }>()

// Helper to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 1. Version Check
debug.get('/version', (c) => {
    return c.json({
        version: 'v2.1-human-waha-logic-debug',
        timestamp: new Date().toISOString(),
        message: 'Logic pengiriman WA sudah update dengan delay human-like.'
    })
})

// 2. Test Delay (Server-side sleep verification)
debug.get('/test-delay', async (c) => {
    const start = Date.now()
    await sleep(3000)
    const end = Date.now()
    return c.json({
        message: 'Delayed 3000ms',
        actual_duration_ms: end - start,
        status: 'success'
    })
})

// 3. Manual Migration for Map URL
debug.get('/run-migration-016', async (c) => {
    try {
        await c.env.DB.prepare('ALTER TABLE events ADD COLUMN location_map_url TEXT').run()
        return c.json({ status: 'success', message: 'Migration 016 applied: Added location_map_url column' })
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message, hint: 'Column might already exist' })
    }
})
