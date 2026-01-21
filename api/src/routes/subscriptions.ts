import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware } from '../middleware/auth'

export const subscriptions = new Hono<{ Bindings: Bindings }>()

// Get current subscription
subscriptions.get('/current', authMiddleware, async (c) => {
    const user = c.get('user')

    const subscription = await c.env.DB.prepare(`
        SELECT * FROM subscriptions WHERE organization_id = ?
    `).bind(user.orgId).first()

    if (!subscription) {
        return c.json({ error: 'No subscription found' }, 404)
    }

    return c.json(subscription)
})

// Upgrade to profit plan
subscriptions.post('/upgrade', authMiddleware, async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const { payment_method } = body as { payment_method: 'midtrans' | 'manual' }

    // Check current subscription
    const currentSub = await c.env.DB.prepare(
        'SELECT plan, status FROM subscriptions WHERE organization_id = ?'
    ).bind(user.orgId).first() as { plan: string; status: string } | null

    if (!currentSub) {
        return c.json({ error: 'No subscription found' }, 404)
    }

    if (currentSub.plan === 'profit') {
        return c.json({ error: 'Already on profit plan' }, 400)
    }

    // Update subscription to profit with pending payment
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await c.env.DB.prepare(`
        UPDATE subscriptions 
        SET plan = 'profit', 
            payment_method = ?, 
            payment_status = 'pending',
            status = 'pending_payment',
            expires_at = ?
        WHERE organization_id = ?
    `).bind(payment_method, expiresAt.toISOString(), user.orgId).run()

    // Create payment record
    const paymentId = `pay_${crypto.randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const periodEnd = expiresAt.toISOString()

    await c.env.DB.prepare(`
        INSERT INTO subscription_payments 
        (id, subscription_id, organization_id, amount, payment_method, payment_status, period_start, period_end, created_at)
        SELECT ?, id, organization_id, 500000, ?, 'pending', ?, ?, ?
        FROM subscriptions WHERE organization_id = ?
    `).bind(paymentId, payment_method, now, periodEnd, now, user.orgId).run()

    return c.json({
        message: 'Subscription upgraded. Please complete payment.',
        payment_id: paymentId,
        amount: 500000,
        payment_method
    })
})

// Submit payment (for manual payment with proof)
subscriptions.post('/payment', authMiddleware, async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const { payment_id, payment_proof_url } = body as { payment_id: string; payment_proof_url?: string }

    const payment = await c.env.DB.prepare(
        'SELECT * FROM subscription_payments WHERE id = ? AND organization_id = ?'
    ).bind(payment_id, user.orgId).first()

    if (!payment) {
        return c.json({ error: 'Payment not found' }, 404)
    }

    // Update payment with proof URL
    const paymentMethod = (payment as any).payment_method
    if (paymentMethod === 'manual' && payment_proof_url) {
        await c.env.DB.prepare(`
            UPDATE subscription_payments 
            SET payment_proof_url = ?, payment_status = 'pending'
            WHERE id = ?
        `).bind(payment_proof_url, payment_id).run()

        return c.json({ message: 'Payment proof submitted. Awaiting admin approval.' })
    }

    return c.json({ message: 'Payment information updated' })
})

// Get payment status
subscriptions.get('/payment-status/:id', authMiddleware, async (c) => {
    const user = c.get('user')
    const { id } = c.req.param()

    const payment = await c.env.DB.prepare(
        'SELECT * FROM subscription_payments WHERE id = ? AND organization_id = ?'
    ).bind(id, user.orgId).first()

    if (!payment) {
        return c.json({ error: 'Payment not found' }, 404)
    }

    return c.json(payment)
})
