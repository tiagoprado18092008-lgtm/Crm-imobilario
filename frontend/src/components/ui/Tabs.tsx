import React, { useState } from 'react'

/* ── Design tokens ────────────────────────────────────────────── */
const T = {
  navy:    '#0f2553',
  gold:    '#b8963e',
  white:   '#ffffff',
  offWhite:'#f8f9fc',
  border:  '#dce3ef',
  muted:   '#6b7a99',
}

export type TabsVariant = 'default' | 'button' | 'line'

export interface TabItem {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  badge?: number | string
  disabled?: boolean
}

interface TabsProps {
  tabs: TabItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  variant?: TabsVariant
  children?: React.ReactNode | ((active: string) => React.ReactNode)
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  value: controlledValue,
  defaultValue,
  onChange,
  variant = 'default',
  children,
}) => {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value ?? '')
  const active = controlledValue ?? internal

  const handleChange = (val: string) => {
    if (!controlledValue) setInternal(val)
    onChange?.(val)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <TabsList tabs={tabs} active={active} variant={variant} onChange={handleChange} />
      <div style={{ marginTop: variant === 'line' ? 16 : 12 }}>
        {typeof children === 'function' ? children(active) : children}
      </div>
    </div>
  )
}

interface TabsListProps {
  tabs: TabItem[]
  active: string
  variant: TabsVariant
  onChange: (v: string) => void
}

const TabsList: React.FC<TabsListProps> = ({ tabs, active, variant, onChange }) => {
  if (variant === 'button') {
    return (
      <div style={{
        display: 'inline-flex', gap: 4, padding: 4,
        background: T.offWhite, borderRadius: 12, border: `1px solid ${T.border}`,
      }}>
        {tabs.map(tab => {
          const isActive = tab.value === active
          return (
            <button
              key={tab.value}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 9, border: 'none',
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                fontFamily: "'DM Sans', sans-serif",
                background: isActive ? T.white : 'transparent',
                color: isActive ? T.navy : T.muted,
                boxShadow: isActive ? '0 1px 4px rgba(15,37,83,0.12)' : 'none',
                transition: 'all 150ms',
                opacity: tab.disabled ? 0.45 : 1,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span style={{
                  background: isActive ? T.navy : T.offWhite,
                  color: isActive ? T.white : T.muted,
                  borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                  border: `1px solid ${T.border}`,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'line') {
    return (
      <div style={{ display: 'flex', borderBottom: `2px solid ${T.border}`, gap: 4 }}>
        {tabs.map(tab => {
          const isActive = tab.value === active
          return (
            <button
              key={tab.value}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px',
                border: 'none', background: 'none',
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                fontFamily: "'DM Sans', sans-serif",
                color: isActive ? T.navy : T.muted,
                position: 'relative', marginBottom: -2,
                borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent',
                transition: 'color 150ms, border-color 150ms',
                opacity: tab.disabled ? 0.45 : 1,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span style={{
                  background: isActive ? 'rgba(184,150,62,0.12)' : T.offWhite,
                  color: isActive ? T.gold : T.muted,
                  borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                  border: `1px solid ${T.border}`,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // default variant
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {tabs.map(tab => {
        const isActive = tab.value === active
        return (
          <button
            key={tab.value}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 9,
              border: `1.5px solid ${isActive ? T.navy : T.border}`,
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              fontFamily: "'DM Sans', sans-serif",
              background: isActive ? 'rgba(15,37,83,0.07)' : T.white,
              color: isActive ? T.navy : T.muted,
              transition: 'all 150ms',
              opacity: tab.disabled ? 0.45 : 1,
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span style={{
                background: isActive ? T.navy : T.offWhite,
                color: isActive ? T.white : T.muted,
                borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Simple tab panel — render children only for the active tab */
export const TabPanel: React.FC<{ value: string; active: string; children: React.ReactNode }> = ({
  value, active, children,
}) => {
  if (value !== active) return null
  return <>{children}</>
}
