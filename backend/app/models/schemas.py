from pydantic import BaseModel, HttpUrl, Field


class CrawlRequest(BaseModel):
    url: HttpUrl
    max_pages: int = Field(default=1000, ge=1, le=10000)
    max_depth: int = Field(default=5, ge=1, le=20)


class CrawlResponse(BaseModel):
    id: str
    status: str
    start_url: str
    domain: str
    max_pages: int
    max_depth: int
    created_at: str
    started_at: str | None
    completed_at: str | None
    stats: dict
    pages_crawled: int


class PageResponse(BaseModel):
    id: int
    url: str
    status_code: int | None
    title: str | None
    h1: str | None
    response_time_ms: float | None
    response_size: int | None
    depth: int
    is_internal: bool
    crawled_at: str


class ErrorResponse(BaseModel):
    id: int
    url: str
    error_type: str
    message: str | None
    retry_count: int


class StatsResponse(BaseModel):
    total_pages: int
    successful: int
    broken: int
    redirects: int
    average_response_ms: float
    max_depth: int
    errors: int


class GraphResponse(BaseModel):
    nodes: list[dict]
    edges: list[dict]
