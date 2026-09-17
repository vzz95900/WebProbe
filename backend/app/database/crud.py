from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from .models import CrawlModel, PageModel, LinkModel, ErrorModel


async def save_crawl_result(db: AsyncSession, crawl_id: str, crawl_data: dict):
    crawl = CrawlModel(
        id=crawl_id,
        start_url=crawl_data["start_url"],
        domain=crawl_data["domain"],
        status=crawl_data["status"],
        max_pages=crawl_data["max_pages"],
        max_depth=crawl_data["max_depth"],
        created_at=crawl_data["created_at"],
        started_at=crawl_data.get("started_at"),
        completed_at=crawl_data.get("completed_at"),
    )
    db.add(crawl)

    for result in crawl_data["results"]:
        page = PageModel(
            crawl_id=crawl_id,
            url=result["url"],
            status_code=result.get("status_code"),
            title=result.get("title"),
            response_time_ms=result.get("response_time_ms"),
            response_size=result.get("response_size"),
            depth=result.get("depth", 0),
            is_internal=True,
            crawled_at=datetime.now(timezone.utc),
        )
        db.add(page)
        await db.flush()

        if result.get("parent_url"):
            parent_result = next(
                (
                    r
                    for r in crawl_data["results"]
                    if r["url"] == result["parent_url"]
                ),
                None,
            )
            if parent_result:
                link = LinkModel(
                    crawl_id=crawl_id,
                    source_page_id=page.id,
                    target_url=result["url"],
                    is_internal=True,
                )
                db.add(link)

        if result.get("error"):
            error = ErrorModel(
                crawl_id=crawl_id,
                url=result["url"],
                error_type="request_error",
                message=result["error"],
                retry_count=0,
            )
            db.add(error)

    await db.commit()


async def get_crawl(db: AsyncSession, crawl_id: str) -> CrawlModel | None:
    result = await db.execute(select(CrawlModel).where(CrawlModel.id == crawl_id))
    return result.scalar_one_or_none()


async def list_crawls(db: AsyncSession) -> list[CrawlModel]:
    result = await db.execute(
        select(CrawlModel).order_by(CrawlModel.created_at.desc())
    )
    return list(result.scalars().all())


async def get_pages(
    db: AsyncSession, crawl_id: str, status_filter: int | None = None
) -> list[PageModel]:
    query = select(PageModel).where(PageModel.crawl_id == crawl_id)
    if status_filter:
        query = query.where(PageModel.status_code == status_filter)
    query = query.order_by(PageModel.depth, PageModel.url)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_errors(db: AsyncSession, crawl_id: str) -> list[ErrorModel]:
    result = await db.execute(
        select(ErrorModel).where(ErrorModel.crawl_id == crawl_id)
    )
    return list(result.scalars().all())


async def get_links(db: AsyncSession, crawl_id: str) -> list[LinkModel]:
    result = await db.execute(
        select(LinkModel).where(LinkModel.crawl_id == crawl_id)
    )
    return list(result.scalars().all())


async def get_stats(db: AsyncSession, crawl_id: str) -> dict:
    crawl = await get_crawl(db, crawl_id)
    if not crawl:
        return {}

    total_pages = await db.execute(
        select(func.count(PageModel.id)).where(PageModel.crawl_id == crawl_id)
    )
    total_pages = total_pages.scalar() or 0

    successful = await db.execute(
        select(func.count(PageModel.id)).where(
            PageModel.crawl_id == crawl_id,
            PageModel.status_code >= 200,
            PageModel.status_code < 400,
        )
    )
    successful = successful.scalar() or 0

    broken = await db.execute(
        select(func.count(PageModel.id)).where(
            PageModel.crawl_id == crawl_id,
            PageModel.status_code.in_([404, 410]),
        )
    )
    broken = broken.scalar() or 0

    redirects = await db.execute(
        select(func.count(PageModel.id)).where(
            PageModel.crawl_id == crawl_id,
            PageModel.status_code.in_([301, 302, 307, 308]),
        )
    )
    redirects = redirects.scalar() or 0

    avg_response = await db.execute(
        select(func.avg(PageModel.response_time_ms)).where(
            PageModel.crawl_id == crawl_id
        )
    )
    avg_response = avg_response.scalar() or 0

    max_depth = await db.execute(
        select(func.max(PageModel.depth)).where(PageModel.crawl_id == crawl_id)
    )
    max_depth = max_depth.scalar() or 0

    error_count = await db.execute(
        select(func.count(ErrorModel.id)).where(ErrorModel.crawl_id == crawl_id)
    )
    error_count = error_count.scalar() or 0

    return {
        "total_pages": total_pages,
        "successful": successful,
        "broken": broken,
        "redirects": redirects,
        "average_response_ms": round(avg_response, 2),
        "max_depth": max_depth,
        "errors": error_count,
    }


async def get_graph(db: AsyncSession, crawl_id: str) -> dict:
    pages = await get_pages(db, crawl_id)
    links = await get_links(db, crawl_id)

    page_map = {p.id: p.url for p in pages}
    url_to_id = {p.url: p.id for p in pages}

    nodes = []
    for page in pages[:500]:
        nodes.append(
            {
                "id": str(page.id),
                "url": page.url,
                "label": page.url.split("/")[-1] or page.url,
                "status_code": page.status_code,
                "depth": page.depth,
            }
        )

    edges = []
    for link in links:
        source_url = page_map.get(link.source_page_id)
        if source_url and link.target_url in url_to_id:
            edges.append(
                {
                    "id": f"{link.source_page_id}-{url_to_id[link.target_url]}",
                    "source": str(link.source_page_id),
                    "target": str(url_to_id[link.target_url]),
                }
            )

    return {"nodes": nodes, "edges": edges}


async def get_crawl_history(db: AsyncSession) -> list[dict]:
    crawls = await list_crawls(db)
    history = []
    for crawl in crawls:
        stats = await get_stats(db, crawl.id)
        duration = None
        if crawl.started_at and crawl.completed_at:
            duration = (crawl.completed_at - crawl.started_at).total_seconds()
        history.append({
            "id": crawl.id,
            "start_url": crawl.start_url,
            "domain": crawl.domain,
            "status": crawl.status,
            "max_pages": crawl.max_pages,
            "max_depth": crawl.max_depth,
            "created_at": crawl.created_at.isoformat(),
            "started_at": crawl.started_at.isoformat() if crawl.started_at else None,
            "completed_at": crawl.completed_at.isoformat() if crawl.completed_at else None,
            "duration_seconds": round(duration, 2) if duration else None,
            "stats": stats,
        })
    return history


async def get_domain_history(db: AsyncSession, domain: str) -> list[dict]:
    crawls = await list_crawls(db)
    domain_crawls = [c for c in crawls if c.domain == domain]
    history = []
    for crawl in domain_crawls:
        stats = await get_stats(db, crawl.id)
        duration = None
        if crawl.started_at and crawl.completed_at:
            duration = (crawl.completed_at - crawl.started_at).total_seconds()
        history.append({
            "id": crawl.id,
            "domain": crawl.domain,
            "status": crawl.status,
            "created_at": crawl.created_at.isoformat(),
            "duration_seconds": round(duration, 2) if duration else None,
            "stats": stats,
        })
    return history


async def compare_crawls(db: AsyncSession, crawl_ids: list[str]) -> list[dict]:
    results = []
    for cid in crawl_ids:
        crawl = await get_crawl(db, cid)
        if not crawl:
            continue
        stats = await get_stats(db, cid)
        duration = None
        if crawl.started_at and crawl.completed_at:
            duration = (crawl.completed_at - crawl.started_at).total_seconds()
        results.append({
            "id": crawl.id,
            "start_url": crawl.start_url,
            "domain": crawl.domain,
            "status": crawl.status,
            "created_at": crawl.created_at.isoformat(),
            "duration_seconds": round(duration, 2) if duration else None,
            "stats": stats,
        })
    return results


async def get_trend_data(db: AsyncSession, domain: str = None) -> list[dict]:
    crawls = await list_crawls(db)
    if domain:
        crawls = [c for c in crawls if c.domain == domain]

    trend_points = []
    for crawl in crawls:
        stats = await get_stats(db, crawl.id)
        duration = None
        if crawl.started_at and crawl.completed_at:
            duration = (crawl.completed_at - crawl.started_at).total_seconds()
        trend_points.append({
            "date": crawl.created_at.isoformat(),
            "crawl_id": crawl.id,
            "domain": crawl.domain,
            "total_pages": stats.get("total_pages", 0),
            "successful": stats.get("successful", 0),
            "broken": stats.get("broken", 0),
            "redirects": stats.get("redirects", 0),
            "average_response_ms": stats.get("average_response_ms", 0),
            "max_depth": stats.get("max_depth", 0),
            "errors": stats.get("errors", 0),
            "duration_seconds": round(duration, 2) if duration else None,
        })

    return trend_points
