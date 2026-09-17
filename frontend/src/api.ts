const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface CrawlRequest {
  url: string;
  max_pages: number;
  max_depth: number;
}

export interface CrawlResponse {
  id: string;
  status: string;
  start_url: string;
  domain: string;
  max_pages: number;
  max_depth: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  stats: Record<string, number>;
  pages_crawled: number;
}

export interface Page {
  id: number;
  url: string;
  status_code: number | null;
  title: string | null;
  h1: string | null;
  response_time_ms: number | null;
  response_size: number | null;
  depth: number;
  is_internal: boolean;
  crawled_at: string;
}

export interface CrawlError {
  id: number;
  url: string;
  error_type: string;
  message: string | null;
  retry_count: number;
}

export interface CrawlStats {
  total_pages: number;
  successful: number;
  broken: number;
  redirects: number;
  average_response_ms: number;
  max_depth: number;
  errors: number;
  broken_links?: Array<{ url: string; status_code: number | null; type: string }>;
  redirects_list?: Array<{ url: string; status_code: number; type: string }>;
  slow_pages?: Array<{ url: string; response_time_ms: number; status_code: number }>;
  deep_pages?: Array<{ url: string; depth: number; status_code: number }>;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    url: string;
    label: string;
    status_code: number | null;
    depth: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

export interface HistoryEntry {
  id: string;
  start_url: string;
  domain: string;
  status: string;
  max_pages: number;
  max_depth: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  stats: {
    total_pages: number;
    successful: number;
    broken: number;
    redirects: number;
    average_response_ms: number;
    max_depth: number;
    errors: number;
  };
}

export interface TrendPoint {
  date: string;
  crawl_id: string;
  domain: string;
  total_pages: number;
  successful: number;
  broken: number;
  redirects: number;
  average_response_ms: number;
  max_depth: number;
  errors: number;
  duration_seconds: number | null;
}

export interface DomainInfo {
  domain: string;
  crawl_count: number;
  latest_crawl: string;
}

export interface ComparisonEntry {
  id: string;
  start_url: string;
  domain: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
  stats: {
    total_pages: number;
    successful: number;
    broken: number;
    redirects: number;
    average_response_ms: number;
    max_depth: number;
    errors: number;
  };
}

export const api = {
  async startCrawl(request: CrawlRequest): Promise<CrawlResponse> {
    const res = await fetch(`${API_BASE}/crawls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to start crawl');
    return res.json();
  },

  async getCrawl(id: string): Promise<CrawlResponse> {
    const res = await fetch(`${API_BASE}/crawls/${id}`);
    if (!res.ok) throw new Error('Crawl not found');
    return res.json();
  },

  async listCrawls(): Promise<CrawlResponse[]> {
    const res = await fetch(`${API_BASE}/crawls`);
    if (!res.ok) throw new Error('Failed to list crawls');
    return res.json();
  },

  async getPages(id: string, status?: number): Promise<Page[]> {
    const url = status
      ? `${API_BASE}/crawls/${id}/pages?status=${status}`
      : `${API_BASE}/crawls/${id}/pages`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to get pages');
    return res.json();
  },

  async getErrors(id: string): Promise<CrawlError[]> {
    const res = await fetch(`${API_BASE}/crawls/${id}/errors`);
    if (!res.ok) throw new Error('Failed to get errors');
    return res.json();
  },

  async getStats(id: string): Promise<CrawlStats> {
    const res = await fetch(`${API_BASE}/crawls/${id}/stats`);
    if (!res.ok) throw new Error('Failed to get stats');
    return res.json();
  },

  async getGraph(id: string): Promise<GraphData> {
    const res = await fetch(`${API_BASE}/crawls/${id}/graph`);
    if (!res.ok) throw new Error('Failed to get graph');
    return res.json();
  },

  async pauseCrawl(id: string): Promise<void> {
    await fetch(`${API_BASE}/crawls/${id}/pause`, { method: 'POST' });
  },

  async resumeCrawl(id: string): Promise<void> {
    await fetch(`${API_BASE}/crawls/${id}/resume`, { method: 'POST' });
  },

  async cancelCrawl(id: string): Promise<void> {
    await fetch(`${API_BASE}/crawls/${id}/cancel`, { method: 'POST' });
  },

  async getHistory(): Promise<HistoryEntry[]> {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to get history');
    return res.json();
  },

  async getTrends(domain?: string): Promise<TrendPoint[]> {
    const url = domain ? `${API_BASE}/history/trends?domain=${domain}` : `${API_BASE}/history/trends`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to get trends');
    return res.json();
  },

  async getDomains(): Promise<DomainInfo[]> {
    const res = await fetch(`${API_BASE}/history/domains`);
    if (!res.ok) throw new Error('Failed to get domains');
    return res.json();
  },

  async compareCrawls(ids: string[]): Promise<ComparisonEntry[]> {
    const res = await fetch(`${API_BASE}/history/compare?ids=${ids.join(',')}`);
    if (!res.ok) throw new Error('Failed to compare crawls');
    return res.json();
  },
};
