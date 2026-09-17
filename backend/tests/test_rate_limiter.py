import pytest
import asyncio
from app.crawler.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_rate_limiter_basic():
    limiter = RateLimiter(requests_per_second=10)
    start = asyncio.get_event_loop().time()

    await limiter.acquire("example.com")
    await limiter.acquire("example.com")

    elapsed = asyncio.get_event_loop().time() - start
    assert elapsed >= 0.08


@pytest.mark.asyncio
async def test_rate_limiter_different_domains():
    limiter = RateLimiter(requests_per_second=10)

    await limiter.acquire("example.com")
    await limiter.acquire("other.com")

    assert True


def test_rate_limiter_set_rate():
    limiter = RateLimiter(requests_per_second=2)
    assert limiter.min_interval == 0.5

    limiter.set_rate(10)
    assert limiter.min_interval == 0.1
