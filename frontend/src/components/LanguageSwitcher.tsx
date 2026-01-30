import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

interface LanguageSwitcherProps {
    className?: string; // Optional className prop
    orgId?: string;
}

export default function LanguageSwitcher({ className = '', orgId }: LanguageSwitcherProps) {
    const { i18n } = useTranslation()

    // Load language from org-specific storage on mount or when orgId changes
    useEffect(() => {
        if (orgId) {
            const orgLang = localStorage.getItem(`i18nextLng_${orgId}`)
            if (orgLang && orgLang !== i18n.language) {
                i18n.changeLanguage(orgLang)
            }
        }
    }, [orgId, i18n])

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng)
        // Always save to global preference as fallback
        localStorage.setItem('i18nextLng', lng)

        // If orgId is present, save to org-specific preference
        if (orgId) {
            localStorage.setItem(`i18nextLng_${orgId}`, lng)
        }
    }

    return (
        <div className={`flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20 ${className}`}>
            <button
                onClick={() => changeLanguage('id')}
                className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${i18n.language === 'id'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
            >
                ID
            </button>
            <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${i18n.language === 'en'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
            >
                EN
            </button>
        </div>
    )
}
