import { useEffect, useState } from 'react'

let loaded = false
let loading = false
const callbacks: Array<() => void> = []

export const useGoogleMaps = () => {
  const [ready, setReady] = useState(loaded)

  useEffect(() => {
    if (loaded) { setReady(true); return }
    callbacks.push(() => setReady(true))
    if (loading) return
    loading = true

    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!key) { console.warn('VITE_GOOGLE_MAPS_KEY não definida'); return }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=pt`
    script.async = true
    script.onload = () => {
      loaded = true
      loading = false
      callbacks.forEach(cb => cb())
      callbacks.length = 0
    }
    document.head.appendChild(script)
  }, [])

  return ready
}
