import React from 'react'

/* CasaFlow logo icon — navy house outline + gold S-curve (matches brand image) */
export const CasaFlowLogo = ({ size = 32 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Roof / house outline */}
    <path
      d="M100 28 L172 90"
      stroke="#0f2553"
      strokeWidth="13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M100 28 L28 90"
      stroke="#0f2553"
      strokeWidth="13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Left wall */}
    <path
      d="M28 90 L28 160"
      stroke="#0f2553"
      strokeWidth="13"
      strokeLinecap="round"
    />
    {/* Right outer wall */}
    <path
      d="M172 90 L172 160"
      stroke="#0f2553"
      strokeWidth="13"
      strokeLinecap="round"
    />
    {/* Right inner arch (door/window) */}
    <path
      d="M126 160 L126 132 Q126 110 148 110 Q170 110 170 132 L170 160"
      stroke="#0f2553"
      strokeWidth="11"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Gold S-curve flowing through the house */}
    <path
      d="M52 72 C52 106, 148 106, 148 140"
      stroke="#b8963e"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
    />
    {/* Gold curve extension left */}
    <path
      d="M32 100 C52 94, 52 72, 100 72"
      stroke="#b8963e"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
    />
    {/* Gold curve extension right */}
    <path
      d="M148 140 C148 160, 168 160, 180 155"
      stroke="#b8963e"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

/* Wordmark: CASA bold + FLOW regular, navy */
export const CasaFlowWordmark = ({ height = 28 }: { height?: number }) => (
  <span
    style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: height,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'baseline',
      userSelect: 'none',
    }}
  >
    <span style={{ color: '#0f2553', fontWeight: 700 }}>CASA</span>
    <span style={{ color: '#0f2553', fontWeight: 400 }}>FLOW</span>
  </span>
)
