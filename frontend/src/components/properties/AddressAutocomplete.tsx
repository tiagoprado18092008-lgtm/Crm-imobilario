import React, { useEffect, useRef } from 'react'
import { useGoogleMaps } from '../../hooks/useGoogleMaps'

interface Props {
  value: string
  onChange: (address: string, lat?: number, lng?: number, components?: Record<string, string>) => void
  placeholder?: string
  style?: React.CSSProperties
}

export const AddressAutocomplete: React.FC<Props> = ({ value, onChange, placeholder, style }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const acRef = useRef<any>(null)
  const ready = useGoogleMaps()

  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return

    const google = (window as any).google
    acRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'pt' },
      fields: ['formatted_address', 'geometry', 'address_components'],
    })

    acRef.current.addListener('place_changed', () => {
      const place = acRef.current.getPlace()
      if (!place.geometry) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      const components: Record<string, string> = {}
      place.address_components?.forEach((c: any) => {
        if (c.types.includes('postal_code')) components.postalCode = c.long_name
        if (c.types.includes('locality')) components.city = c.long_name
        if (c.types.includes('administrative_area_level_1')) components.district = c.long_name
        if (c.types.includes('sublocality') || c.types.includes('administrative_area_level_2')) components.freguesia = c.long_name
      })

      onChange(place.formatted_address, lat, lng, components)
    })
  }, [ready, onChange])

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      placeholder={placeholder || 'Pesquisar morada em Portugal…'}
      style={{
        width: '100%', padding: '9px 13px', borderRadius: 8,
        border: '1px solid var(--border)', fontSize: 13,
        background: 'var(--surface-2)', color: 'var(--text-primary)',
        outline: 'none', boxSizing: 'border-box', ...style,
      }}
    />
  )
}
