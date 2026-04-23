import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useSession } from '@clerk/clerk-react'
import { useAuthStore } from '../store/auth.store'

export const ClerkLoginPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const { session } = useSession()
  const { clerkExchange, token } = useAuthStore()
  const navigate = useNavigate()
  const exchanging = useRef(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !session) return
    if (token) { navigate('/dashboard', { replace: true }); return }
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
  }, [isLoaded, isSignedIn, session, token, clerkExchange, navigate])

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
      <SignIn routing="hash" />
    </main>
  )
}
