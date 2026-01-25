import { Hono } from 'hono'
import type { Bindings } from '../index'

export const uploads = new Hono<{ Bindings: Bindings }>()

// Upload image as base64 (stored in data URL format)
uploads.post('/image', async (c) => {
    try {
        const contentType = c.req.header('Content-Type')

        if (contentType?.includes('application/json')) {
            // Handle JSON body with base64 data
            const { image, filename } = await c.req.json() as { image: string; filename?: string }

            if (!image) {
                return c.json({ error: 'No image data provided' }, 400)
            }

            // Generate unique filename
            const id = `img_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
            const ext = filename?.split('.').pop() || 'jpg'

            // For base64 data URLs, just return the data URL directly
            // In production, you would upload to R2 and return the URL
            return c.json({
                success: true,
                id,
                url: image, // Return the base64 data URL
                filename: `${id}.${ext}`
            })
        } else {
            // Handle multipart form data
            const formData = await c.req.formData()
            const file = formData.get('image') as File | null

            if (!file) {
                return c.json({ error: 'No file uploaded' }, 400)
            }

            // Convert to base64 using a robust method for large files
            const arrayBuffer = await file.arrayBuffer()
            const bytes = new Uint8Array(arrayBuffer)

            // Chunking to avoid "Maximum call stack size exceeded"
            let binary = ''
            const chunkSize = 8192 // Process in 8KB chunks
            for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.subarray(i, i + chunkSize)
                binary += String.fromCharCode.apply(null, Array.from(chunk))
            }

            const base64 = btoa(binary)
            const mimeType = file.type || 'image/jpeg'
            const dataUrl = `data:${mimeType};base64,${base64}`

            const id = `img_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
            const ext = file.name.split('.').pop() || 'jpg'

            return c.json({
                success: true,
                id,
                url: dataUrl,
                filename: `${id}.${ext}`
            })
        }
    } catch (error) {
        console.error('Upload error:', error)
        return c.json({ error: 'Upload failed' }, 500)
    }
})

// Delete image (placeholder - would delete from R2 in production)
uploads.delete('/:id', async (c) => {
    const id = c.req.param('id')
    // In production, delete from R2
    return c.json({ success: true, deleted: id })
})
