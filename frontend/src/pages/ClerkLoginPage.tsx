import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useSession } from '@clerk/clerk-react'
import { useAuthStore } from '../store/auth.store'

export const ClerkLoginPage: React.FC = () => {
  const { isSignedIn } = useAuth()
  const { session } = useSession()
  const { clerkExchange, token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSignedIn || !session) return
    if (token) { navigate('/dashboard', { replace: true }); return }

    session.getToken().then(async (clerkToken) => {
      if (!clerkToken) return
      try {
        await clerkExchange(clerkToken)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Clerk exchange failed:', err)
      }
    })
  }, [isSignedIn, session, token, clerkExchange, navigate])

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
      <SignIn routing="hash" />
    </main>
  )
}
