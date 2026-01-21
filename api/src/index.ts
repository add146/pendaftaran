import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { events } from './routes/events'
import { participants } from './routes/participants'
import { auth } from './routes/auth'
import { publicRoutes } from './routes/public'
import { payments } from './routes/payments'
import { uploads } from './routes/uploads'
import { settings } from './routes/settings'

export type Bindings = {
	DB: D1Database
	JWT_SECRET: string
	MIDTRANS_SERVER_KEY: string
	MIDTRANS_CLIENT_KEY: string
	MIDTRANS_IS_PRODUCTION: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
	origin: [
		'http://localhost:5173',
		'http://localhost:3000',
		'https://pendaftaran-ccb.pages.dev',
		'https://pendaftaran.pages.dev',
		'https://etiket.my.id',
		'https://www.etiket.my.id'
	],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
}))

// Health check
app.get('/', (c) => {
	return c.json({
		status: 'ok',
		message: 'Pendaftaran QR API',
		version: '1.0.0'
	})
})

// Routes
app.route('/api/auth', auth)
app.route('/api/events', events)
app.route('/api/participants', participants)
app.route('/api/public', publicRoutes)
app.route('/api/payments', payments)
app.route('/api/uploads', uploads)
app.route('/api/settings', settings)

// 404 handler
app.notFound((c) => {
	return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
	console.error('Error:', err)
	return c.json({ error: err.message || 'Internal server error' }, 500)
})

export default app
