import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/layout/ErrorBoundary.tsx'
import { applyTheme, getStoredTheme, watchSystemTheme } from './lib/theme'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

applyTheme(getStoredTheme())
watchSystemTheme(() => {
  if (getStoredTheme() === 'system') applyTheme('system')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, sans-serif",
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
              success: {
                iconTheme: { primary: '#16A34A', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#DC2626', secondary: '#fff' },
              },
            }}
          />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>
)
