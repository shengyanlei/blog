import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSiteConfig } from './config/siteConfig'

const bootstrap = async () => {
    const config = await initSiteConfig()
    document.title = config.site.meta.title || 'Blog System'

    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
}

void bootstrap()
