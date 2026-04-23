import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useSession } from '@clerk/clerk-react'
import { useAuthStore } from '../store/auth.store'

export const ClerkLoginPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const { session } = useSession()
  const { clerkExchange, token, hydrated } = useAuthStore()
  const navigate = useNavigate()
  const exchanging = useRef(false)

  useEffect(() => {
    // Wait for everything to be ready
    if (!isLoaded || !hydrated) return
    // Already have CRM token — go to dashboard
    if (isSignedIn && token) { navigate('/dashboard', { replace: true }); return }
    // Not signed into Clerk — show login form (do nothing)
    if (!isSignedIn || !session) return
    // Signed into Clerk but no CRM token — exchange
    if (exchanging.current) return
    exchanging.current = true

    session.getToken().then(async (clerkToken) => {
      if (!clerkToken) { exchanging.current = false; return }
      try {
        await clerkExchange(clerkToken)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Clerk exchange failed:', err)
        exchanging.current = false
      }
    })
  }, [isLoaded, hydrated, isSignedIn, session, token, clerkExchange, navigate])

  // Show spinner while Clerk or store is loading
  if (!isLoaded || !hydrated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '4px solid #6366f1', borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Clerk signed in but waiting for exchange — show spinner
  if (isSignedIn && !token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '4px solid #6366f1', borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
      <SignIn routing="hash" />
    </main>
  )
}
