import { useMemo } from 'react'

interface DonutSegment {
  label: string
  value: number
  color: string
}

export function DonutChart({ segments, size = 160 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = (size - 20) / 2
  const innerRadius = radius * 0.65
  const center = size / 2

  const arcs = useMemo(() => {
    let startAngle = -90
    return segments.filter(s => s.value > 0).map(segment => {
      const angle = (segment.value / total) * 360
      const endAngle = startAngle + angle
      const largeArc = angle > 180 ? 1 : 0

      const startRad = (startAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const x1 = center + radius * Math.cos(startRad)
      const y1 = center + radius * Math.sin(startRad)
      const x2 = center + radius * Math.cos(endRad)
      const y2 = center + radius * Math.sin(endRad)

      const ix1 = center + innerRadius * Math.cos(startRad)
      const iy1 = center + innerRadius * Math.sin(startRad)
      const ix2 = center + innerRadius * Math.cos(endRad)
      const iy2 = center + innerRadius * Math.sin(endRad)

      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z'
      ].join(' ')

      startAngle = endAngle
      return { path, color: segment.color, label: segment.label, value: segment.value }
    })
  }, [segments, total, radius, innerRadius, center])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc, i) => (
          <path key={i} d={arc.path} fill={arc.color} opacity={0.9}>
            <title>{arc.label}: {arc.value} ({Math.round((arc.value / total) * 100)}%)</title>
          </path>
        ))}
        <text x={center} y={center - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700" fontFamily="'Inter', sans-serif">
          {total}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="'Inter', sans-serif">
          Total
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', minWidth: 50 }}>{s.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{s.value}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface BarData {
  label: string
  value: number
  color: string
}

export function HorizontalBarChart({ data }: { data: BarData[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', minWidth: 80, textAlign: 'right' }}>{d.label}</span>
          <div style={{ flex: 1, height: 22, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%', width: `${(d.value / maxVal) * 100}%`, background: d.color,
              borderRadius: 4, transition: 'width 0.4s ease', minWidth: d.value > 0 ? 4 : 0,
            }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 600, minWidth: 36 }}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ResponseTimeHistogram({ pages }: { pages: { response_time_ms: number | null }[] }) {
  const buckets = [
    { label: '<200ms', min: 0, max: 200, color: '#4ade80' },
    { label: '200-500ms', min: 200, max: 500, color: '#60a5fa' },
    { label: '500-1s', min: 500, max: 1000, color: '#fbbf24' },
    { label: '1-3s', min: 1000, max: 3000, color: '#fb923c' },
    { label: '>3s', min: 3000, max: Infinity, color: '#f87171' },
  ]

  const data = buckets.map(b => ({
    label: b.label,
    value: pages.filter(p => p.response_time_ms !== null && p.response_time_ms >= b.min && p.response_time_ms < b.max).length,
    color: b.color,
  }))

  return <HorizontalBarChart data={data} />
}

export function DepthDistribution({ pages }: { pages: { depth: number }[] }) {
  const maxDepth = Math.max(...pages.map(p => p.depth), 0)
  const buckets: { label: string; value: number; color: string }[] = []

  for (let d = 0; d <= Math.min(maxDepth, 10); d++) {
    buckets.push({
      label: `Depth ${d}`,
      value: pages.filter(p => p.depth === d).length,
      color: d === 0 ? '#6c63ff' : d <= 2 ? '#4ade80' : d <= 4 ? '#fbbf24' : '#f87171',
    })
  }

  return <HorizontalBarChart data={buckets} />
}
