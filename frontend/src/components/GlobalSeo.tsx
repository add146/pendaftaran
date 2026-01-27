import { useEffect } from 'react'
import { publicAPI } from '../lib/api'

export default function GlobalSeo() {

    useEffect(() => {
        // Fetch landing config to get favicon
        publicAPI.getLandingConfig()
            .then(config => {
                if (config.favicon) {
                    // setFavicon(config.favicon)

                    // Direct DOM manipulation to ensure update
                    const link = document.getElementById('favicon') as HTMLLinkElement
                    if (link) {
                        link.href = config.favicon
                    } else {
                        // Create if not exists
                        const newLink = document.createElement('link')
                        newLink.id = 'favicon'
                        newLink.rel = 'icon'
                        newLink.href = config.favicon
                        document.head.appendChild(newLink)
                    }
                }
            })
            .catch(err => console.error('Failed to load global SEO config:', err))
    }, [])

    // We don't return Helmet anymore for favicon to avoid conflicts
    return null
}
