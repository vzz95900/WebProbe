import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(1000)
  const [maxDepth, setMaxDepth] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const result = await api.startCrawl({
        url: url.startsWith('http') ? url : `https://${url}`,
        max_pages: maxPages,
        max_depth: maxDepth,
      })
      navigate(`/crawl/${result.id}`)
    } catch {
      setError('Failed to start crawl. Please check the URL and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hero-center">
      <div style={{ position: 'absolute', top: '1.5rem', right: '2rem' }}>
        <Link to="/history" className="btn btn-ghost btn-sm">History</Link>
      </div>

      <div className="hero-badge">
        <span>&#9889;</span> Concurrent Web Crawler
      </div>

      <h1 className="hero-title">WebProbe</h1>

      <p className="hero-subtitle">
        Analyze website health with concurrent crawling. Detect broken links, slow pages, and map your entire site structure.
      </p>

      <div className="card hero-card">
        <div className="card-header">
          <div className="icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            &#128269;
          </div>
          <h2>Start a New Crawl</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url">Website URL</label>
            <input
              id="url"
              className="form-input"
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxPages">Max Pages</label>
              <input
                id="maxPages"
                className="form-input"
                type="number"
                min="1"
                max="10000"
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="maxDepth">Max Depth</label>
              <input
                id="maxDepth"
                className="form-input"
                type="number"
                min="1"
                max="20"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <div className="error-message">&#9888; {error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Starting...
              </>
            ) : (
              'Start Crawl'
            )}
          </button>
        </form>
      </div>

      <div className="hero-features">
        <div className="hero-feature">
          <div className="hero-feature-dot" style={{ background: 'var(--success)' }} />
          Broken Link Detection
        </div>
        <div className="hero-feature">
          <div className="hero-feature-dot" style={{ background: 'var(--accent)' }} />
          Link Graph Visualization
        </div>
        <div className="hero-feature">
          <div className="hero-feature-dot" style={{ background: 'var(--warning)' }} />
          Response Time Analysis
        </div>
      </div>
    </div>
  )
}
