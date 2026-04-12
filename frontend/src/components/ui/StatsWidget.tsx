import React, { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

/* ── Design tokens ────────────────────────────────────────────── */
const T = {
  navy:   '#0f2553',
  gold:   '#b8963e',
  white:  '#ffffff',
  border: '#dce3ef',
  muted:  '#6b7a99',
}

const getRandom = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const generateSmoothPath = (points: number[], width: number, height: number) => {
  if (!points || points.length < 2) return `M 0 ${height}`
  const xStep = width / (points.length - 1)
  const pathData = points.map((point, i) => {
    const x = i * xStep
    const y = height - (point / 100) * (height * 0.8) - height * 0.1
    return [x, y]
  })
  let path = `M ${pathData[0][0]} ${pathData[0][1]}`
  for (let i = 0; i < pathData.length - 1; i++) {
    const [x1, y1] = pathData[i]
    const [x2, y2] = pathData[i + 1]
    const midX = (x1 + x2) / 2
    path += ` C ${midX},${y1} ${midX},${y2} ${x2},${y2}`
  }
  return path
}

interface StatsWidgetProps {
  label?: string
  prefix?: string
  initialAmount?: number
  autoUpdate?: boolean
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({
  label = 'Esta semana',
  prefix = '€',
  initialAmount = 283,
  autoUpdate = true,
}) => {
  const [stats, setStats] = useState({
    amount: initialAmount,
    change: 36,
    chartData: [30, 55, 45, 75, 60, 85, 70],
  })

  const linePathRef = useRef<SVGPathElement>(null)
  const areaPathRef = useRef<SVGPathElement>(null)

  const update = () => {
    setStats({
      amount: getRandom(100, 999),
      change: getRandom(-50, 100),
      chartData: Array.from({ length: 7 }, () => getRandom(10, 90)),
    })
  }

  useEffect(() => {
    if (!autoUpdate) return
    const id = setInterval(update, 3000)
    return () => clearInterval(id)
  }, [autoUpdate])

  const svgW = 150, svgH = 60
  const linePath = useMemo(() => generateSmoothPath(stats.chartData, svgW, svgH), [stats.chartData])
  const areaPath = useMemo(() => {
    if (!linePath.startsWith('M')) return ''
    return `${linePath} L ${svgW} ${svgH} L 0 ${svgH} Z`
  }, [linePath])

  useEffect(() => {
    const path = linePathRef.current
    const area = areaPathRef.current
    if (path && area) {
      const length = path.getTotalLength()
      path.style.transition = 'none'
      path.style.strokeDasharray = `${length} ${length}`
      path.style.strokeDashoffset = `${length}`
      area.style.transition = 'none'
      area.style.opacity = '0'
      path.getBoundingClientRect()
      path.style.transition = 'stroke-dashoffset 0.8s ease-in-out'
      path.style.strokeDashoffset = '0'
      area.style.transition = 'opacity 0.8s ease-in-out 0.2s'
      area.style.opacity = '1'
    }
  }, [linePath])

  const isPositive = stats.change >= 0
  const lineColor   = isPositive ? '#22c55e' : '#ef4444'
  const gradientId  = isPositive ? 'sgGreen' : 'sgRed'

  return (
    <div style={{
      background: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: '20px 24px',
      boxShadow: '0 2px 8px rgba(15,37,83,0.04), 0 12px 32px rgba(15,37,83,0.06)',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.muted }}>
            <span>{label}</span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 2,
              fontWeight: 600, color: isPositive ? '#22c55e' : '#ef4444', fontSize: 12,
            }}>
              {Math.abs(stats.change)}%
              {isPositive ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            </span>
          </div>
          <p style={{ fontSize: 30, fontWeight: 700, color: T.navy, margin: 0, letterSpacing: '-0.03em' }}>
            {prefix}{stats.amount.toLocaleString()}
          </p>
        </div>

        {/* Right — chart */}
        <div style={{ width: 120, height: 48 }}>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="sgGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sgRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path ref={areaPathRef} d={areaPath} fill={`url(#${gradientId})`} />
            <path
              ref={linePathRef}
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
