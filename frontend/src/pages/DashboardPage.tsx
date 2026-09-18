import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, CrawlResponse, Page, CrawlError, CrawlStats, GraphData } from '../api'
import GraphView from '../components/GraphView'
import { DonutChart, ResponseTimeHistogram, DepthDistribution } from '../components/Charts'

type Tab = 'overview' | 'pages' | 'errors' | 'graph'

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const [crawl, setCrawl] = useState<CrawlResponse | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [errors, setErrors] = useState<CrawlError[]>([])
  const [stats, setStats] = useState<CrawlStats | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [statusFilter, setStatusFilter] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const [crawlData, pagesData, errorsData, statsData] = await Promise.all([
        api.getCrawl(id),
        api.getPages(id, statusFilter),
        api.getErrors(id),
        api.getStats(id),
      ])
      setCrawl(crawlData)
      setPages(pagesData)
      setErrors(errorsData)
      setStats(statsData)
      if (activeTab === 'graph' && !graph) {
        try { setGraph(await api.getGraph(id)) } catch {}
      }
    } catch {} finally { setLoading(false) }
  }, [id, statusFilter, activeTab, graph])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (activeTab === 'graph' && id && !graph) api.getGraph(id).then(setGraph).catch(() => {})
  }, [activeTab, id, graph])

  const handlePause = async () => { if (id) { await api.pauseCrawl(id); fetchData() } }
  const handleResume = async () => { if (id) { await api.resumeCrawl(id); fetchData() } }
  const handleCancel = async () => {
    if (id && confirm('Cancel this crawl?')) { await api.cancelCrawl(id); fetchData() }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /><p>Loading...</p></div>
  if (!crawl) return <div className="error-message">Crawl not found</div>

  const codeClass = (code: number | null) => {
    if (!code) return ''
    if (code < 300) return 'status-2xx'
    if (code < 400) return 'status-3xx'
    if (code < 500) return 'status-4xx'
    return 'status-5xx'
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'pages', label: 'Pages', count: pages.length },
    { key: 'errors', label: 'Errors', count: errors.length },
    { key: 'graph', label: 'Link Graph' },
  ]

  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">&#9889;</div>
            <div>
              <h1>WebProbe</h1>
              <p className="brand-subtitle">{crawl.start_url}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Link to="/history" className="btn btn-ghost btn-sm">History</Link>
            <Link to="/" className="btn btn-ghost btn-sm">New Crawl</Link>
          </div>
        </div>
      </header>

      <div className="controls-bar">
        <span className={`crawl-status ${crawl.status.toLowerCase()}`}>{crawl.status}</span>
        <div className="controls">
          {crawl.status === 'RUNNING' && <button className="btn btn-ghost btn-sm" onClick={handlePause}>Pause</button>}
          {crawl.status === 'PAUSED' && <button className="btn btn-ghost btn-sm" onClick={handleResume}>Resume</button>}
          {(crawl.status === 'RUNNING' || crawl.status === 'PAUSED') && <button className="btn btn-danger btn-sm" onClick={handleCancel}>Cancel</button>}
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>&#128196;</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.total_pages}</div>
              <div className="stat-label">Pages Crawled</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>&#10003;</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.successful}</div>
              <div className="stat-label">Successful</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>&#10007;</div>
              <div className="stat-value" style={{ color: 'var(--error)' }}>{stats.broken}</div>
              <div className="stat-label">Broken Links</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>&#8644;</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.redirects}</div>
              <div className="stat-label">Redirects</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--info)' }}>&#9889;</div>
              <div className="stat-value" style={{ color: 'var(--info)' }}>{Math.round(stats.average_response_ms)}ms</div>
              <div className="stat-label">Avg Response</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>&#128207;</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.max_depth}</div>
              <div className="stat-label">Max Depth</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="card">
              <div className="card-header">
                <div className="icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>&#128202;</div>
                <h2>Status Distribution</h2>
              </div>
              <DonutChart segments={[
                { label: '2xx Success', value: stats.successful, color: '#4ade80' },
                { label: '3xx Redirect', value: stats.redirects, color: '#fbbf24' },
                { label: '4xx Client Error', value: stats.broken, color: '#f87171' },
              ]} />
            </div>

            <div className="card">
              <div className="card-header">
                <div className="icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>&#9889;</div>
                <h2>Response Time</h2>
              </div>
              <ResponseTimeHistogram pages={pages} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <div className="icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>&#128207;</div>
              <h2>Depth Distribution</h2>
            </div>
            <DepthDistribution pages={pages} />
          </div>

          {stats.slow_pages && stats.slow_pages.length > 0 && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <div className="icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>&#9203;</div>
                <h2>Slow Pages (&gt;1000ms)</h2>
              </div>
              <div className="table-wrapper">
                <div className="table-container">
                  <table>
                    <thead><tr><th>URL</th><th>Response Time</th><th>Status</th></tr></thead>
                    <tbody>
                      {stats.slow_pages.map((p, i) => (
                        <tr key={i}>
                          <td><a href={p.url} target="_blank" rel="noopener noreferrer" className="url-link">{p.url}</a></td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>{Math.round(p.response_time_ms)}ms</td>
                          <td><span className={`status-badge ${codeClass(p.status_code)}`}>{p.status_code}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {stats.deep_pages && stats.deep_pages.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>&#128207;</div>
                <h2>Deepest Pages</h2>
              </div>
              <div className="table-wrapper">
                <div className="table-container">
                  <table>
                    <thead><tr><th>URL</th><th>Depth</th><th>Status</th></tr></thead>
                    <tbody>
                      {stats.deep_pages.map((p, i) => (
                        <tr key={i}>
                          <td><a href={p.url} target="_blank" rel="noopener noreferrer" className="url-link">{p.url}</a></td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>{p.depth}</td>
                          <td><span className={`status-badge ${codeClass(p.status_code)}`}>{p.status_code}</span></td>
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

      {activeTab === 'pages' && (
        <div className="card">
          <div className="filter-chips">
            {[undefined, 200, 301, 404].map(s => (
              <button key={s ?? 'all'} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s === undefined ? 'All' : `${s}`}
              </button>
            ))}
          </div>
          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead><tr><th>URL</th><th>Status</th><th>Title</th><th>Response</th><th>Depth</th></tr></thead>
                <tbody>
                  {pages.map(p => (
                    <tr key={p.id}>
                      <td><a href={p.url} target="_blank" rel="noopener noreferrer" className="url-link">{p.url}</a></td>
                      <td><span className={`status-badge ${codeClass(p.status_code)}`}>{p.status_code || 'N/A'}</span></td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || '-'}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>{p.response_time_ms ? `${Math.round(p.response_time_ms)}ms` : '-'}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>{p.depth}</td>
                    </tr>
                  ))}
                  {pages.length === 0 && <tr><td colSpan={5}><div className="empty-state"><p>No pages crawled yet</p></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="card">
          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead><tr><th>URL</th><th>Status</th><th>Error Type</th><th>Message</th></tr></thead>
                <tbody>
                  {errors.map(e => (
                    <tr key={e.id}>
                      <td><a href={e.url} target="_blank" rel="noopener noreferrer" className="url-link">{e.url}</a></td>
                      <td><span className={`status-badge ${codeClass(e.status_code)}`}>{e.status_code || 'N/A'}</span></td>
                      <td><span className="status-badge status-4xx">{e.error_type}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>{e.message || '-'}</td>
                    </tr>
                  ))}
                  {errors.length === 0 && <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-icon">&#10003;</div><h3>No errors</h3></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'graph' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {graph ? (
            <div className="graph-container"><GraphView data={graph} /></div>
          ) : (
            <div className="empty-state">
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto 0.75rem' }} />
              <h3>Loading graph...</h3>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
