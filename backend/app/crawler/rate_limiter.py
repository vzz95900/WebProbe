import asyncio
import time
from collections import defaultdict


class RateLimiter:
    def __init__(self, requests_per_second: float = 2.0):
        self.requests_per_second = requests_per_second
        self.min_interval = 1.0 / requests_per_second
        self._last_request: dict[str, float] = defaultdict(float)
        self._locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def acquire(self, domain: str) -> None:
        async with self._locks[domain]:
            now = time.monotonic()
            time_since_last = now - self._last_request[domain]
            if time_since_last < self.min_interval:
                await asyncio.sleep(self.min_interval - time_since_last)
            self._last_request[domain] = time.monotonic()

    def set_rate(self, requests_per_second: float) -> None:
        self.requests_per_second = requests_per_second
        self.min_interval = 1.0 / requests_per_second
