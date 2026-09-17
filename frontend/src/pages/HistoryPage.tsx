import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api, HistoryEntry, TrendPoint, DomainInfo, ComparisonEntry } from '../api'

type View = 'list' | 'trends' | 'compare'

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [domains, setDomains] = useState<DomainInfo[]>([])
  const [comparisons, setComparisons] = useState<ComparisonEntry[]>([])
  const [view, setView] = useState<View>('list')
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getHistory(),
      api.getTrends(),
      api.getDomains(),
    ]).then(([h, t, d]) => {
      setHistory(h)
      setTrends(t)
      setDomains(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (view === 'trends') {
      api.getTrends(selectedDomain || undefined).then(setTrends).catch(() => {})
    }
  }, [view, selectedDomain])

  useEffect(() => {
    if (view === 'compare' && selectedIds.size >= 2) {
      api.compareCrawls(Array.from(selectedIds)).then(setComparisons).catch(() => {})
    }
  }, [view, selectedIds])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 5) next.add(id)
      return next
    })
  }

  if (loading) {
    return <div className="loading-page"><div className="spinner" /><p>Loading history...</p></div>
  }

  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">&#9889;</div>
            <div>
              <h1>WebProbe</h1>
              <p className="brand-subtitle">Crawl History & Trends</p>
            </div>
          </div>
          <Link to="/" className="btn btn-ghost btn-sm">&#8592; New Crawl</Link>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
          All Crawls ({history.length})
        </button>
        <button className={`tab ${view === 'trends' ? 'active' : ''}`} onClick={() => setView('trends')}>
          Trends
        </button>
        <button className={`tab ${view === 'compare' ? 'active' : ''}`} onClick={() => setView('compare')}>
          Compare {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </button>
      </div>

      {view === 'list' && (
        <div>
          {domains.length > 0 && (
            <div className="filter-chips" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`filter-chip ${!selectedDomain ? 'active' : ''}`}
                onClick={() => setSelectedDomain('')}
              >
                All Domains
              </button>
              {domains.map(d => (
                <button
                  key={d.domain}
                  className={`filter-chip ${selectedDomain === d.domain ? 'active' : ''}`}
                  onClick={() => setSelectedDomain(d.domain)}
                >
                  {d.domain} ({d.crawl_count})
                </button>
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Domain</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Pages</th>
                    <th>Broken</th>
                    <th>Avg Response</th>
                    <th>Duration</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .filter(h => !selectedDomain || h.domain === selectedDomain)
                    .map(entry => (
                    <tr key={entry.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                          style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                          background: 'var(--accent-glow)', color: 'var(--accent)',
                          fontFamily: "'JetBrains Mono', monospace"
                        }}>
                          {entry.domain}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="url-link">{entry.start_url}</span>
                      </td>
                      <td><span className={`crawl-status ${entry.status.toLowerCase()}`}>{entry.status}</span></td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                        {entry.stats.total_pages}
                      </td>
                      <td>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem',
                          color: entry.stats.broken > 0 ? 'var(--error)' : 'var(--success)'
                        }}>
                          {entry.stats.broken}
                        </span>
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                        {Math.round(entry.stats.average_response_ms)}ms
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                        {entry.duration_seconds != null ? `${entry.duration_seconds.toFixed(1)}s` : '-'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <Link to={`/crawl/${entry.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">&#128196;</div><h3>No crawls yet</h3><p>Start your first crawl to see history here</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'trends' && (
        <div>
          <div className="filter-chips" style={{ marginBottom: '1.5rem' }}>
            <button className={`filter-chip ${!selectedDomain ? 'active' : ''}`} onClick={() => setSelectedDomain('')}>
              All Domains
            </button>
            {domains.map(d => (
              <button
                key={d.domain}
                className={`filter-chip ${selectedDomain === d.domain ? 'active' : ''}`}
                onClick={() => setSelectedDomain(d.domain)}
              >
                {d.domain}
              </button>
            ))}
          </div>

          {trends.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">&#128200;</div>
                <h3>No trend data</h3>
                <p>Crawl the same domain multiple times to see trends</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="card">
                <div className="card-header">
                  <div className="icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>&#128200;</div>
                  <h2>Pages Crawled Over Time</h2>
                </div>
                <TrendChart
                  data={trends}
                  getValue={t => t.total_pages}
                  color="var(--accent-light)"
                  fillColor="rgba(108, 99, 255, 0.08)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card">
                  <div className="card-header">
                    <div className="icon" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>&#10007;</div>
                    <h2>Broken Links Over Time</h2>
                  </div>
                  <TrendChart
                    data={trends}
                    getValue={t => t.broken}
                    color="var(--error)"
                    fillColor="rgba(248, 113, 113, 0.06)"
                  />
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>&#9889;</div>
                    <h2>Avg Response Time</h2>
                  </div>
                  <TrendChart
                    data={trends}
                    getValue={t => t.average_response_ms}
                    color="var(--success)"
                    fillColor="rgba(74, 222, 128, 0.06)"
                    suffix="ms"
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>&#128203;</div>
                  <h2>Crawl Timeline</h2>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Domain</th><th>Pages</th><th>Successful</th><th>Broken</th><th>Avg Response</th><th>Duration</th></tr>
                    </thead>
                    <tbody>
                      {trends.map((t, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleString()}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{t.domain}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>{t.total_pages}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: 'var(--success)' }}>{t.successful}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: t.broken > 0 ? 'var(--error)' : 'var(--text-muted)' }}>{t.broken}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>{Math.round(t.average_response_ms)}ms</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>{t.duration_seconds != null ? `${t.duration_seconds.toFixed(1)}s` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'compare' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Select 2-5 crawls from the list to compare. {selectedIds.size}/5 selected.
            </p>
          </div>

          {comparisons.length >= 2 ? (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="card">
                <div className="card-header">
                  <div className="icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>&#128203;</div>
                  <h2>Side-by-Side Comparison</h2>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        {comparisons.map((c, i) => (
                          <th key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(c.created_at).toLocaleDateString()}
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                              {c.domain}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <CompareRow label="Pages Crawled" values={comparisons.map(c => c.stats.total_pages)} />
                      <CompareRow label="Successful" values={comparisons.map(c => c.stats.successful)} highlight="best" />
                      <CompareRow label="Broken Links" values={comparisons.map(c => c.stats.broken)} highlight="worst" />
                      <CompareRow label="Redirects" values={comparisons.map(c => c.stats.redirects)} />
                      <CompareRow label="Avg Response" values={comparisons.map(c => Math.round(c.stats.average_response_ms))} suffix="ms" highlight="best" />
                      <CompareRow label="Max Depth" values={comparisons.map(c => c.stats.max_depth)} />
                      <CompareRow label="Duration" values={comparisons.map(c => c.duration_seconds != null ? parseFloat(c.duration_seconds.toFixed(1)) : 0)} suffix="s" highlight="best" />
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>&#128200;</div>
                  <h2>Health Score Comparison</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${comparisons.length}, 1fr)`, gap: '1rem', padding: '1rem 0' }}>
                  {comparisons.map((c, i) => {
                    const total = c.stats.total_pages || 1
                    const healthScore = Math.round((c.stats.successful / total) * 100)
                    const brokenPercent = Math.round((c.stats.broken / total) * 100)
                    return (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 100, height: 100, borderRadius: '50%', margin: '0 auto 0.75rem',
                          background: `conic-gradient(${healthScore > 80 ? 'var(--success)' : healthScore > 50 ? 'var(--warning)' : 'var(--error)'} ${healthScore * 3.6}deg, var(--bg-card) 0deg)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                        }}>
                          <div style={{
                            width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                          }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: healthScore > 80 ? 'var(--success)' : healthScore > 50 ? 'var(--warning)' : 'var(--error)' }}>
                              {healthScore}%
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>{c.domain}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.25rem' }}>{c.stats.broken} broken ({brokenPercent}%)</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">&#128269;</div>
                <h3>Select crawls to compare</h3>
                <p>Check the boxes next to crawls in the "All Crawls" tab, then come back here</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrendChart({ data, getValue, color, fillColor, suffix = '' }: {
  data: TrendPoint[]
  getValue: (t: TrendPoint) => number
  color: string
  fillColor: string
  suffix?: string
}) {
  const width = 800
  const height = 180
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }

  const { points, maxVal, labels } = useMemo(() => {
    const vals = data.map(getValue)
    const maxVal = Math.max(...vals, 1)
    const points = data.map((t, i) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right),
      y: padding.top + (1 - getValue(t) / maxVal) * (height - padding.top - padding.bottom),
      value: getValue(t),
      label: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }))
    const labels = data.map((t, i) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right),
      text: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }))
    return { points, maxVal, labels }
  }, [data, getValue])

  if (points.length === 0) return <div style={{ height: height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height }}>
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="1" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = padding.top + frac * (height - padding.top - padding.bottom)
        const val = Math.round(maxVal * (1 - frac))
        return (
          <g key={frac}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="'JetBrains Mono', monospace">
              {val}{suffix}
            </text>
          </g>
        )
      })}

      <path d={areaD} fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke={color} strokeWidth="2" />
          <title>{p.value}{suffix} - {p.label}</title>
        </g>
      ))}

      {labels.map((l, i) => (
        <text key={i} x={l.x} y={height - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="'JetBrains Mono', monospace">
          {data.length <= 10 ? l.text : (i % Math.ceil(data.length / 8) === 0 ? l.text : '')}
        </text>
      ))}
    </svg>
  )
}

function CompareRow({ label, values, suffix = '', highlight }: {
  label: string
  values: number[]
  suffix?: string
  highlight?: 'best' | 'worst'
}) {
  const bestVal = highlight === 'best' ? Math.max(...values) : highlight === 'worst' ? Math.min(...values) : null
  return (
    <tr>
      <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</td>
      {values.map((v, i) => (
        <td key={i} style={{
          textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.9rem',
          fontWeight: bestVal !== null && v === bestVal ? 700 : 400,
          color: bestVal !== null && v === bestVal ? 'var(--success)' : 'var(--text-primary)',
        }}>
          {v}{suffix}
          {bestVal !== null && v === bestVal && <span style={{ color: 'var(--success)', marginLeft: '0.35rem', fontSize: '0.7rem' }}>&#10003;</span>}
        </td>
      ))}
    </tr>
  )
}
