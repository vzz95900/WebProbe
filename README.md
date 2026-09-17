# WebProbe

A concurrent web crawler that scans websites and gives you a health report — broken links, slow pages, redirect chains, and a visual map of your site structure.

Built with Python (FastAPI + asyncio) and React.

---

## What it does

You paste a URL, WebProbe crawls the entire site simultaneously using multiple async workers, then shows you:

- **Broken links** — any 404, 410, or failed request
- **Redirect chains** — 301, 302, 307, 308 loops
- **Slow pages** — pages taking over 1 second to respond
- **Response time analysis** — histogram of how fast your pages load
- **Depth map** — how many clicks deep each page is from the homepage
- **Link graph** — interactive visualization of how all your pages connect
- **Health score** — overall percentage of working vs broken pages

You can run it multiple times on the same domain and track trends over time.

---

## How it works

```
You enter a URL
      │
      ▼
┌─────────────┐
│   WebProbe   │──► Checks robots.txt
│   Engine     │──► Respects rate limits
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Workers    │──► Fetch pages concurrently
│   (async)    │──► Parse HTML for links
└──────┬──────┘──► Store results in SQLite
       │
       ▼
┌─────────────┐
│   Dashboard  │──► Stats, charts, tables
│   (React)    │──► Interactive link graph
└─────────────┘──► History & trends
```

The crawler doesn't just visit pages — it builds a complete picture of your site's health.

---

## Tech Stack

**Backend:** Python, FastAPI, asyncio, httpx, BeautifulSoup4, SQLAlchemy, SQLite

**Frontend:** React 18, TypeScript, React Flow, Vite

**Testing:** 27 unit tests (pytest)

---

## Run it

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173
