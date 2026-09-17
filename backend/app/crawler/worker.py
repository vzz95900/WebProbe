import asyncio
from urllib.parse import urlparse

from .http_client import HttpClient, FetchResult
from .parser import parse_html, is_html_content
from .url_manager import normalize_url, is_same_domain, get_domain
from .rate_limiter import RateLimiter
from .robots import RobotsTxt


class CrawlerWorker:
    def __init__(
        self,
        worker_id: int,
        queue: asyncio.Queue,
        results: list,
        results_lock: asyncio.Lock,
        domain: str,
        http_client: HttpClient,
        rate_limiter: RateLimiter,
        robots: RobotsTxt,
        max_depth: int,
        max_pages: int,
        url_manager: "URLManager",
        crawl_id: str,
        stats: dict,
        stats_lock: asyncio.Lock,
        pause_event: asyncio.Event,
        cancel_event: asyncio.Event,
    ):
        self.worker_id = worker_id
        self.queue = queue
        self.results = results
        self.results_lock = results_lock
        self.domain = domain
        self.http_client = http_client
        self.rate_limiter = rate_limiter
        self.robots = robots
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.url_manager = url_manager
        self.crawl_id = crawl_id
        self.stats = stats
        self.stats_lock = stats_lock
        self.pause_event = pause_event
        self.cancel_event = cancel_event

    async def run(self):
        while not self.cancel_event.is_set():
            try:
                url, depth, parent_url = await asyncio.wait_for(
                    self.queue.get(), timeout=2.0
                )
            except asyncio.TimeoutError:
                if self.queue.unfinished_tasks == 0:
                    break
                continue

            await self.pause_event.wait()

            if self.cancel_event.is_set():
                self.queue.task_done()
                break

            async with self.stats_lock:
                current = self.stats.get("pages_crawled", 0)
                if current >= self.max_pages:
                    self.queue.task_done()
                    break
                self.stats["pages_crawled"] = current + 1

            if not self.robots.is_allowed(url):
                async with self.stats_lock:
                    self.stats["skipped_robots"] = (
                        self.stats.get("skipped_robots", 0) + 1
                    )
                self.queue.task_done()
                continue

            await self.rate_limiter.acquire(get_domain(url))

            result = await self.http_client.fetch(url)

            new_urls = []
            if result.html and is_html_content(result.content_type):
                parsed = parse_html(result.html, url)
                result.title = parsed.title

                for link in parsed.internal_links:
                    normalized = normalize_url(link, url)
                    if normalized and is_same_domain(normalized, self.domain):
                        if normalized not in self.url_manager.visited:
                            if depth + 1 <= self.max_depth:
                                new_urls.append((normalized, depth + 1, url))
                            self.url_manager.add_url(normalized)

                for link in parsed.external_links:
                    normalized = normalize_url(link, url)
                    if normalized:
                        self.url_manager.add_external_link(url, normalized)

            async with self.results_lock:
                self.results.append(
                    {
                        "url": url,
                        "depth": depth,
                        "parent_url": parent_url,
                        "status_code": result.status_code,
                        "response_time_ms": result.response_time_ms,
                        "content_type": result.content_type,
                        "response_size": result.response_size,
                        "title": result.title,
                        "error": result.error,
                        "redirected": result.redirected,
                        "final_url": result.final_url,
                    }
                )

            if result.error:
                async with self.stats_lock:
                    self.stats["errors"] = self.stats.get("errors", 0) + 1

            async with self.stats_lock:
                if self.stats.get("pages_crawled", 0) < self.max_pages:
                    for new_url, new_depth, parent in new_urls:
                        await self.queue.put((new_url, new_depth, parent))

            self.queue.task_done()


class URLManager:
    def __init__(self):
        self.visited: set[str] = set()
        self.external_links: dict[str, list[str]] = {}
        self._lock = asyncio.Lock()

    async def add_visited(self, url: str) -> bool:
        async with self._lock:
            if url in self.visited:
                return False
            self.visited.add(url)
            return True

    def add_url(self, url: str):
        self.visited.add(url)

    def add_external_link(self, source: str, target: str):
        if source not in self.external_links:
            self.external_links[source] = []
        self.external_links[source].append(target)
