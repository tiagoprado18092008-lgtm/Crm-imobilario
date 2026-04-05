import React from 'react'

export const LeadScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const bg = score >= 70 ? '#ecfdf5' : score >= 40 ? '#fffbeb' : '#fef2f2'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 40, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 300ms' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '1px 6px', borderRadius: 10 }}>{score}</span>
    </div>
  )
}
