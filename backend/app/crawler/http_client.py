import asyncio
import time
import httpx
from dataclasses import dataclass, field


TRANSIENT_STATUSES = {502, 503, 504}


@dataclass
class FetchResult:
    url: str
    status_code: int | None = None
    response_time_ms: float = 0
    content_type: str | None = None
    response_size: int = 0
    html: str | None = None
    error: str | None = None
    redirected: bool = False
    final_url: str | None = None


class HttpClient:
    def __init__(
        self,
        timeout: int = 30,
        max_retries: int = 3,
        user_agent: str = "WebProbeBot/1.0",
        max_response_size: int = 10 * 1024 * 1024,
    ):
        self.timeout = timeout
        self.max_retries = max_retries
        self.user_agent = user_agent
        self.max_response_size = max_response_size
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            follow_redirects=True,
            headers={"User-Agent": self.user_agent},
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()

    async def fetch(self, url: str) -> FetchResult:
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                result = await self._do_fetch(url)
                if result.status_code and result.status_code not in TRANSIENT_STATUSES:
                    return result
                if result.status_code and result.status_code in TRANSIENT_STATUSES:
                    last_error = result.error or f"HTTP {result.status_code}"
                    if attempt < self.max_retries:
                        await asyncio.sleep(2**attempt)
                        continue
                    return result
                return result
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.ConnectTimeout) as e:
                last_error = str(e)
                if attempt < self.max_retries:
                    await asyncio.sleep(2**attempt)
                    continue
                return FetchResult(url=url, error=last_error)
            except Exception as e:
                return FetchResult(url=url, error=str(e))

        return FetchResult(url=url, error=last_error or "Max retries exceeded")

    async def _do_fetch(self, url: str) -> FetchResult:
        start = time.monotonic()
        try:
            response = await self._client.get(url)
            elapsed_ms = (time.monotonic() - start) * 1000

            content_type = response.headers.get("content-type", "")
            response_size = len(response.content)

            if response_size > self.max_response_size:
                return FetchResult(
                    url=url,
                    status_code=response.status_code,
                    response_time_ms=elapsed_ms,
                    content_type=content_type,
                    response_size=response_size,
                    error="Response too large",
                )

            html = None
            if "text/html" in content_type.lower():
                html = response.text

            return FetchResult(
                url=url,
                status_code=response.status_code,
                response_time_ms=elapsed_ms,
                content_type=content_type,
                response_size=response_size,
                html=html,
                redirected=response.history is not None and len(response.history) > 0,
                final_url=str(response.url) if str(response.url) != url else None,
            )
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            return FetchResult(url=url, response_time_ms=elapsed_ms, error=str(e))
