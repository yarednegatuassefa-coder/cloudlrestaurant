import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './monitoring/AppErrorBoundary'
import { initializeClientErrorTracking } from './monitoring/sentry'

initializeClientErrorTracking()

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
)

if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {
      // Offline support is an enhancement; failure must never block ordering or tracking.
    })
  }, { once: true })
}
