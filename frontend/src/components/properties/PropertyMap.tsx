import React from 'react'

interface Props {
  lat: number
  lng: number
  title?: string
}

export const PropertyMap: React.FC<Props> = ({ lat, lng, title }) => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
  if (!key) return null

  const src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${lat},${lng}&zoom=15&language=pt`

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginTop: 20 }}>
      <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Localização
      </div>
      <iframe
        title={`Mapa — ${title || 'Imóvel'}`}
        width="100%"
        height="300"
        style={{ border: 0, display: 'block' }}
        loading="lazy"
        allowFullScreen
        src={src}
      />
      <div style={{ padding: '8px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          Ver no Google Maps ↗
        </a>
      </div>
    </div>
  )
}
