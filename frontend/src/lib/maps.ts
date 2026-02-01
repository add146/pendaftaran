/**
 * Extracts a search query from a Google Maps URL, or falls back to the provided location name.
 * 
 * Supported formats:
 * - https://www.google.com/maps/place/Query/@...
 * - https://www.google.com/maps/search/Query/@...
 * - https://maps.google.com/?q=Query
 * 
 * @param locationName The text from the "Location" input field
 * @param mapUrl The text from the "Google Maps Link" input field
 * @returns The best available query string for Google Maps Embed/Static API
 */
export function getMapQuery(locationName: string | undefined, mapUrl: string | undefined): string {
    const fallback = locationName || ''

    if (!mapUrl) return fallback

    try {
        const url = new URL(mapUrl)

        // 1. Check for /place/QUERY or /search/QUERY
        // Path matches: /maps/place/Some+Location/@...
        const pathParts = url.pathname.split('/')
        const placeIndex = pathParts.findIndex(p => p === 'place' || p === 'search')

        if (placeIndex !== -1 && pathParts[placeIndex + 1]) {
            // The query is the next part
            let query = pathParts[placeIndex + 1]
            // Sometimes it has + for spaces, decode it
            // Google Maps usually encodes it.
            // We return it as is or decode? Embed API expects encoded or plain text.
            // Best to decode it to plain text, so we can re-encode it safely for the Embed API later if needed,
            // or just return plain text.
            return decodeURIComponent(query.replace(/\+/g, ' '))
        }

        // 2. Check for ?q=QUERY
        if (url.searchParams.has('q')) {
            return url.searchParams.get('q') || fallback
        }

    } catch (e) {
        // Invalid URL, ignore
    }

    return fallback
}
