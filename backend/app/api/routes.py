from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.session import async_session, get_session
from ..database import crud
from ..crawler.engine import crawler_engine
from ..analysis.analyzer import get_comprehensive_stats
from ..models.schemas import CrawlRequest, CrawlResponse, PageResponse, ErrorResponse, StatsResponse, GraphResponse

router = APIRouter(prefix="/api/crawls", tags=["crawls"])
history_router = APIRouter(prefix="/api/history", tags=["history"])


@router.post("", response_model=CrawlResponse)
async def start_crawl(request: CrawlRequest):
    async def persist_callback(crawl_id: str, crawl_data: dict):
        async with async_session() as session:
            await crud.save_crawl_result(session, crawl_id, crawl_data)

    crawl_id = await crawler_engine.start_crawl(
        url=str(request.url),
        max_pages=request.max_pages,
        max_depth=request.max_depth,
        persist_callback=persist_callback,
    )

    crawl = crawler_engine.get_crawl_status(crawl_id)
    return CrawlResponse(**crawl)


@router.get("", response_model=list[CrawlResponse])
async def list_crawls(db: AsyncSession = Depends(get_session)):
    db_crawls = await crud.list_crawls(db)
    results = []
    for c in db_crawls:
        stats = await crud.get_stats(db, c.id)
        results.append(
            CrawlResponse(
                id=c.id,
                status=c.status,
                start_url=c.start_url,
                domain=c.domain,
                max_pages=c.max_pages,
                max_depth=c.max_depth,
                created_at=c.created_at.isoformat(),
                started_at=c.started_at.isoformat() if c.started_at else None,
                completed_at=c.completed_at.isoformat() if c.completed_at else None,
                stats=stats,
                pages_crawled=stats.get("total_pages", 0),
            )
        )
    return results


@router.get("/{crawl_id}", response_model=CrawlResponse)
async def get_crawl(crawl_id: str, db: AsyncSession = Depends(get_session)):
    crawl_data = crawler_engine.get_crawl_status(crawl_id)
    if crawl_data:
        return CrawlResponse(**crawl_data)

    db_crawl = await crud.get_crawl(db, crawl_id)
    if not db_crawl:
        raise HTTPException(status_code=404, detail="Crawl not found")

    stats = await crud.get_stats(db, crawl_id)
    return CrawlResponse(
        id=db_crawl.id,
        status=db_crawl.status,
        start_url=db_crawl.start_url,
        domain=db_crawl.domain,
        max_pages=db_crawl.max_pages,
        max_depth=db_crawl.max_depth,
        created_at=db_crawl.created_at.isoformat(),
        started_at=db_crawl.started_at.isoformat() if db_crawl.started_at else None,
        completed_at=db_crawl.completed_at.isoformat() if db_crawl.completed_at else None,
        stats=stats,
        pages_crawled=stats.get("total_pages", 0),
    )


@router.post("/{crawl_id}/pause")
async def pause_crawl(crawl_id: str):
    if not crawler_engine.pause_crawl(crawl_id):
        raise HTTPException(status_code=404, detail="Crawl not found or not running")
    return {"status": "paused"}


@router.post("/{crawl_id}/resume")
async def resume_crawl(crawl_id: str):
    if not crawler_engine.resume_crawl(crawl_id):
        raise HTTPException(status_code=404, detail="Crawl not found or not paused")
    return {"status": "resumed"}


@router.post("/{crawl_id}/cancel")
async def cancel_crawl(crawl_id: str):
    if not crawler_engine.cancel_crawl(crawl_id):
        raise HTTPException(status_code=404, detail="Crawl not found")
    return {"status": "cancelled"}


@router.get("/{crawl_id}/pages", response_model=list[PageResponse])
async def get_pages(
    crawl_id: str,
    status: int | None = Query(None, description="Filter by HTTP status code"),
    db: AsyncSession = Depends(get_session),
):
    crawl_data = crawler_engine.get_crawl_status(crawl_id)
    if crawl_data and crawl_data["status"] == "RUNNING":
        results = crawler_engine.get_crawl(crawl_id)["results"]
        if status:
            results = [r for r in results if r.get("status_code") == status]
        return [
            PageResponse(
                id=i,
                url=r["url"],
                status_code=r.get("status_code"),
                title=r.get("title"),
                h1=None,
                response_time_ms=r.get("response_time_ms"),
                response_size=r.get("response_size"),
                depth=r.get("depth", 0),
                is_internal=True,
                crawled_at="",
            )
            for i, r in enumerate(results)
        ]

    pages = await crud.get_pages(db, crawl_id, status)
    return [
        PageResponse(
            id=p.id,
            url=p.url,
            status_code=p.status_code,
            title=p.title,
            h1=p.h1,
            response_time_ms=p.response_time_ms,
            response_size=p.response_size,
            depth=p.depth,
            is_internal=p.is_internal,
            crawled_at=p.crawled_at.isoformat() if p.crawled_at else "",
        )
        for p in pages
    ]


@router.get("/{crawl_id}/errors", response_model=list[ErrorResponse])
async def get_errors(crawl_id: str, db: AsyncSession = Depends(get_session)):
    errors = await crud.get_errors(db, crawl_id)
    return [
        ErrorResponse(
            id=e.id,
            url=e.url,
            error_type=e.error_type,
            message=e.message,
            retry_count=e.retry_count,
        )
        for e in errors
    ]


@router.get("/{crawl_id}/stats")
async def get_stats(crawl_id: str, db: AsyncSession = Depends(get_session)):
    crawl_data = crawler_engine.get_crawl_status(crawl_id)
    if crawl_data and crawl_data["status"] == "RUNNING":
        return crawl_data["stats"]

    stats = await get_comprehensive_stats(db, crawl_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Crawl not found")
    return stats


@router.get("/{crawl_id}/graph", response_model=GraphResponse)
async def get_graph(crawl_id: str, db: AsyncSession = Depends(get_session)):
    graph = await crud.get_graph(db, crawl_id)
    if not graph["nodes"]:
        raise HTTPException(status_code=404, detail="No graph data available")
    return GraphResponse(**graph)


@history_router.get("")
async def get_history(db: AsyncSession = Depends(get_session)):
    return await crud.get_crawl_history(db)


@history_router.get("/trends")
async def get_trends(
    domain: str | None = Query(None, description="Filter by domain"),
    db: AsyncSession = Depends(get_session),
):
    return await crud.get_trend_data(db, domain)


@history_router.get("/domains")
async def get_domains(db: AsyncSession = Depends(get_session)):
    history = await crud.get_crawl_history(db)
    domains = {}
    for entry in history:
        d = entry["domain"]
        if d not in domains:
            domains[d] = {"domain": d, "crawl_count": 0, "latest_crawl": None}
        domains[d]["crawl_count"] += 1
        if not domains[d]["latest_crawl"] or entry["created_at"] > domains[d]["latest_crawl"]:
            domains[d]["latest_crawl"] = entry["created_at"]
    return sorted(domains.values(), key=lambda x: x["crawl_count"], reverse=True)


@history_router.get("/compare")
async def compare_crawls(
    ids: str = Query(..., description="Comma-separated crawl IDs"),
    db: AsyncSession = Depends(get_session),
):
    crawl_ids = [cid.strip() for cid in ids.split(",") if cid.strip()]
    if len(crawl_ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 crawl IDs to compare")
    if len(crawl_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 crawls to compare")
    return await crud.compare_crawls(db, crawl_ids)
