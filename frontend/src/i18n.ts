import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en/translation.json';
import idTranslation from './locales/id/translation.json';

const resources = {
    en: {
        translation: enTranslation,
    },
    id: {
        translation: idTranslation,
    },
};

// Get saved language from localStorage or default to 'id'
const savedLanguage = localStorage.getItem('i18nextLng') || 'id';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: savedLanguage, // current language
        fallbackLng: 'id', // fallback language
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;
