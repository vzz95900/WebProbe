import asyncio
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

from .http_client import HttpClient
from .url_manager import normalize_url, get_domain
from .worker import URLManager
from .rate_limiter import RateLimiter
from .robots import RobotsTxt
from .worker import CrawlerWorker
from ..config import settings


class CrawlerEngine:
    def __init__(self):
        self.active_crawls: dict[str, dict] = {}

    async def start_crawl(
        self,
        url: str,
        max_pages: int = 1000,
        max_depth: int = 5,
        workers: int = None,
        persist_callback=None,
    ) -> str:
        crawl_id = str(uuid.uuid4())
        domain = get_domain(url)

        normalized_start = normalize_url(url)
        if not normalized_start:
            raise ValueError(f"Invalid URL: {url}")

        crawl_state = {
            "id": crawl_id,
            "start_url": normalized_start,
            "domain": domain,
            "status": "PENDING",
            "max_pages": max_pages,
            "max_depth": max_depth,
            "created_at": datetime.now(timezone.utc),
            "started_at": None,
            "completed_at": None,
            "results": [],
            "stats": {
                "pages_crawled": 0,
                "pages_discovered": 1,
                "errors": 0,
                "skipped_robots": 0,
            },
            "queue": asyncio.Queue(),
            "pause_event": asyncio.Event(),
            "cancel_event": asyncio.Event(),
            "task": None,
            "persist_callback": persist_callback,
        }

        crawl_state["pause_event"].set()
        crawl_state["queue"].put_nowait((normalized_start, 0, None))

        self.active_crawls[crawl_id] = crawl_state

        worker_count = workers or settings.CRAWLER_WORKERS
        crawl_state["task"] = asyncio.create_task(
            self._run_crawl(crawl_id, worker_count)
        )

        return crawl_id

    async def _run_crawl(self, crawl_id: str, worker_count: int):
        crawl = self.active_crawls[crawl_id]
        crawl["status"] = "RUNNING"
        crawl["started_at"] = datetime.now(timezone.utc)

        url_manager = URLManager()
        url_manager.add_url(crawl["start_url"])

        rate_limiter = RateLimiter(settings.CRAWLER_RATE_LIMIT)
        robots = RobotsTxt(settings.CRAWLER_USER_AGENT)

        results_lock = asyncio.Lock()
        stats_lock = asyncio.Lock()

        async with HttpClient(
            timeout=settings.CRAWLER_TIMEOUT,
            max_retries=settings.CRAWLER_MAX_RETRIES,
            user_agent=settings.CRAWLER_USER_AGENT,
            max_response_size=settings.CRAWLER_MAX_RESPONSE_SIZE,
        ) as http_client:
            await robots.fetch_and_parse(crawl["start_url"], http_client._client)

            workers = []
            for i in range(worker_count):
                worker = CrawlerWorker(
                    worker_id=i,
                    queue=crawl["queue"],
                    results=crawl["results"],
                    results_lock=results_lock,
                    domain=crawl["domain"],
                    http_client=http_client,
                    rate_limiter=rate_limiter,
                    robots=robots,
                    max_depth=crawl["max_depth"],
                    max_pages=crawl["max_pages"],
                    url_manager=url_manager,
                    crawl_id=crawl_id,
                    stats=crawl["stats"],
                    stats_lock=stats_lock,
                    pause_event=crawl["pause_event"],
                    cancel_event=crawl["cancel_event"],
                )
                workers.append(asyncio.create_task(worker.run()))

            await asyncio.gather(*workers, return_exceptions=True)

            while not crawl["queue"].empty():
                try:
                    crawl["queue"].get_nowait()
                    crawl["queue"].task_done()
                except asyncio.QueueEmpty:
                    break

        if crawl["cancel_event"].is_set():
            crawl["status"] = "CANCELLED"
        else:
            crawl["status"] = "COMPLETED"
        crawl["completed_at"] = datetime.now(timezone.utc)

        if crawl.get("persist_callback"):
            await crawl["persist_callback"](crawl_id, crawl)

    def pause_crawl(self, crawl_id: str) -> bool:
        if crawl_id not in self.active_crawls:
            return False
        self.active_crawls[crawl_id]["pause_event"].clear()
        self.active_crawls[crawl_id]["status"] = "PAUSED"
        return True

    def resume_crawl(self, crawl_id: str) -> bool:
        if crawl_id not in self.active_crawls:
            return False
        self.active_crawls[crawl_id]["pause_event"].set()
        self.active_crawls[crawl_id]["status"] = "RUNNING"
        return True

    def cancel_crawl(self, crawl_id: str) -> bool:
        if crawl_id not in self.active_crawls:
            return False
        self.active_crawls[crawl_id]["cancel_event"].set()
        self.active_crawls[crawl_id]["pause_event"].set()
        return True

    def get_crawl(self, crawl_id: str) -> dict | None:
        return self.active_crawls.get(crawl_id)

    def get_crawl_status(self, crawl_id: str) -> dict | None:
        crawl = self.active_crawls.get(crawl_id)
        if not crawl:
            return None
        return {
            "id": crawl["id"],
            "status": crawl["status"],
            "start_url": crawl["start_url"],
            "domain": crawl["domain"],
            "max_pages": crawl["max_pages"],
            "max_depth": crawl["max_depth"],
            "created_at": crawl["created_at"].isoformat(),
            "started_at": (
                crawl["started_at"].isoformat() if crawl["started_at"] else None
            ),
            "completed_at": (
                crawl["completed_at"].isoformat() if crawl["completed_at"] else None
            ),
            "stats": crawl["stats"],
            "pages_crawled": len(crawl["results"]),
        }

    def list_crawls(self) -> list[dict]:
        return [
            {
                "id": c["id"],
                "status": c["status"],
                "start_url": c["start_url"],
                "domain": c["domain"],
                "created_at": c["created_at"].isoformat(),
                "pages_crawled": len(c["results"]),
            }
            for c in self.active_crawls.values()
        ]


crawler_engine = CrawlerEngine()
