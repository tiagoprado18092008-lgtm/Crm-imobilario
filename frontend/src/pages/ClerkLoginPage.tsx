import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useSession, useClerk } from '@clerk/clerk-react'
import { useAuthStore } from '../store/auth.store'

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '4px solid #6366f1', borderTopColor: 'transparent',
      animation: 'spin 0.7s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export const ClerkLoginPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const { session } = useSession()
  const { signOut } = useClerk()
  const { clerkExchange, token, hydrated, logout } = useAuthStore()
  const navigate = useNavigate()
  const exchanging = useRef(false)
  const [exchangeFailed, setExchangeFailed] = useState(false)

  useEffect(() => {
    if (!isLoaded || !hydrated) return
    if (isSignedIn && token) { navigate('/dashboard', { replace: true }); return }
    if (!isSignedIn || !session) return
    if (exchanging.current || exchangeFailed) return
    exchanging.current = true

    session.getToken().then(async (clerkToken) => {
      if (!clerkToken) { exchanging.current = false; return }
      try {
        await clerkExchange(clerkToken)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Clerk exchange failed:', err)
        // Sign out of Clerk so user can retry with correct account
        logout()
        await signOut()
        exchanging.current = false
        setExchangeFailed(true)
      }
    })
  }, [isLoaded, hydrated, isSignedIn, session, token, clerkExchange, navigate, exchangeFailed, logout, signOut])

  if (!isLoaded || !hydrated) return <Spinner />

  // Signed into Clerk, waiting for exchange
  if (isSignedIn && !token && !exchangeFailed) return <Spinner />

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
      <SignIn routing="hash" />
    </main>
  )
}
