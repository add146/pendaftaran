import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { HelmetProvider } from 'react-helmet-async'
import GlobalSeo from './components/GlobalSeo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <GlobalSeo />
      <App />
    </HelmetProvider>
  </StrictMode>,
)
