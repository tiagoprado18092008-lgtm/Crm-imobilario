import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ClerkProvider } from '@clerk/clerk-react'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/layout/ErrorBoundary.tsx'
import { applyTheme, getStoredTheme, watchSystemTheme } from './lib/theme'
import { reloadForNewBuild } from './lib/staleBuild'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

/**
 * Server state lives here, not in Zustand. Lists stay fresh for a minute
 * because CRM rows do not change under you second to second, and refetching a
 * kanban on every window focus would throw away in-flight drag state.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Vite fires this when a chunk of a build that has since been replaced fails
// to preload; reloading fetches the current build instead of erroring.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewBuild()) event.preventDefault()
})

applyTheme(getStoredTheme())
watchSystemTheme(() => {
  if (getStoredTheme() === 'system') applyTheme('system')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
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
      </ClerkProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
)
