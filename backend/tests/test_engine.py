import pytest
import asyncio
from app.crawler.engine import CrawlerEngine


@pytest.mark.asyncio
async def test_crawler_engine_start():
    engine = CrawlerEngine()

    crawl_id = await engine.start_crawl(
        url="https://example.com",
        max_pages=10,
        max_depth=2,
        workers=1,
    )

    assert crawl_id is not None
    assert crawl_id in engine.active_crawls

    crawl = engine.get_crawl_status(crawl_id)
    assert crawl is not None
    assert crawl["status"] in ("PENDING", "RUNNING", "COMPLETED")

    engine.cancel_crawl(crawl_id)


def test_crawler_engine_get_nonexistent():
    engine = CrawlerEngine()
    assert engine.get_crawl_status("nonexistent") is None


def test_crawler_engine_pause_nonexistent():
    engine = CrawlerEngine()
    assert engine.pause_crawl("nonexistent") is False


def test_crawler_engine_cancel_nonexistent():
    engine = CrawlerEngine()
    assert engine.cancel_crawl("nonexistent") is False
