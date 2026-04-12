import React from 'react'

/* CasaFlow logo — navy house outline + gold S-curve */
export const CasaFlowLogo = ({ size = 48 }: { size?: number }) => {
  const ratio = 220 / 200
  return (
    <svg
      width={size}
      height={size * ratio}
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* House outline — left wall + roof */}
      <path
        d="M30 110 L100 45 L170 110"
        stroke="#0f2553"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Left wall down */}
      <path
        d="M30 110 L30 175"
        stroke="#0f2553"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right wall + bottom-right corner (open bottom) */}
      <path
        d="M170 110 L170 175"
        stroke="#0f2553"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right inner arch / door shape */}
      <path
        d="M120 175 L120 140 Q120 118 140 118 Q162 118 162 140 L162 175"
        stroke="#0f2553"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Gold S-curve — flows through the house */}
      <path
        d="M60 85 C60 118, 145 118, 145 152"
        stroke="#b8963e"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/* Wordmark: CASA in navy bold + FLOW in navy regular */
export const CasaFlowWordmark = ({ height = 28 }: { height?: number }) => (
  <span
    style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: height,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 0,
      userSelect: 'none',
    }}
  >
    <span style={{ color: '#0f2553', fontWeight: 700 }}>CASA</span>
    <span style={{ color: '#0f2553', fontWeight: 400 }}>FLOW</span>
  </span>
)
