/**
 * JWT utilities using Web Crypto API for Cloudflare Workers
 */

// JWT Header
const header = {
    alg: 'HS256',
    typ: 'JWT'
}

// Base64URL encode
function base64UrlEncode(str: string): string {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

// Base64URL decode
function base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    while (str.length % 4) str += '='
    return atob(str)
}

// Create HMAC-SHA256 signature
async function createSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(data)
    )

    return base64UrlEncode(
        String.fromCharCode(...new Uint8Array(signature))
    )
}

// Verify HMAC-SHA256 signature
async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
    const expectedSignature = await createSignature(data, secret)
    return signature === expectedSignature
}

export interface JWTPayload {
    userId: string
    email: string
    orgId: string
    role: string
    iat: number
    exp: number
}

/**
 * Sign a JWT token
 */
export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresInHours = 24): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    const fullPayload: JWTPayload = {
        ...payload,
        iat: now,
        exp: now + (expiresInHours * 60 * 60)
    }

    const headerB64 = base64UrlEncode(JSON.stringify(header))
    const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload))
    const data = `${headerB64}.${payloadB64}`
    const signature = await createSignature(data, secret)

    return `${data}.${signature}`
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null

        const [headerB64, payloadB64, signature] = parts
        const data = `${headerB64}.${payloadB64}`

        const isValid = await verifySignature(data, signature, secret)
        if (!isValid) return null

        const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadB64))

        // Check expiration
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp < now) return null

        return payload
    } catch {
        return null
    }
}

/**
 * Hash password using SHA-256 with salt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomUUID()
    const encoder = new TextEncoder()

    const hash = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(salt + password)
    )

    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return `${salt}:${hashHex}`
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':')
    if (!salt || !hash) return false

    const encoder = new TextEncoder()
    const inputHash = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(salt + password)
    )

    const hashArray = Array.from(new Uint8Array(inputHash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hash === hashHex
}
