from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database.models import PageModel, ErrorModel


async def analyze_broken_links(db: AsyncSession, crawl_id: str) -> list[dict]:
    result = await db.execute(
        select(PageModel).where(
            PageModel.crawl_id == crawl_id,
            PageModel.status_code.in_([404, 410]),
        )
    )
    pages = result.scalars().all()

    error_result = await db.execute(
        select(ErrorModel).where(ErrorModel.crawl_id == crawl_id)
    )
    errors = error_result.scalars().all()

    broken = []
    for page in pages:
        broken.append(
            {
                "url": page.url,
                "status_code": page.status_code,
                "type": "not_found" if page.status_code == 404 else "gone",
            }
        )

    for error in errors:
        broken.append(
            {
                "url": error.url,
                "status_code": None,
                "type": "request_error",
                "error": error.message,
            }
        )

    return broken


async def analyze_redirects(db: AsyncSession, crawl_id: str) -> list[dict]:
    result = await db.execute(
        select(PageModel).where(
            PageModel.crawl_id == crawl_id,
            PageModel.status_code.in_([301, 302, 307, 308]),
        )
    )
    pages = result.scalars().all()

    return [
        {
            "url": page.url,
            "status_code": page.status_code,
            "type": "permanent" if page.status_code in (301, 308) else "temporary",
        }
        for page in pages
    ]


async def analyze_slow_pages(
    db: AsyncSession, crawl_id: str, threshold_ms: float = 1000
) -> list[dict]:
    result = await db.execute(
        select(PageModel).where(
            PageModel.crawl_id == crawl_id,
            PageModel.response_time_ms > threshold_ms,
        ).order_by(PageModel.response_time_ms.desc())
    )
    pages = result.scalars().all()

    return [
        {
            "url": page.url,
            "response_time_ms": page.response_time_ms,
            "status_code": page.status_code,
        }
        for page in pages
    ]


async def analyze_deep_pages(db: AsyncSession, crawl_id: str) -> list[dict]:
    result = await db.execute(
        select(PageModel)
        .where(PageModel.crawl_id == crawl_id)
        .order_by(PageModel.depth.desc())
        .limit(50)
    )
    pages = result.scalars().all()

    return [
        {
            "url": page.url,
            "depth": page.depth,
            "status_code": page.status_code,
        }
        for page in pages
    ]


async def get_comprehensive_stats(db: AsyncSession, crawl_id: str) -> dict:
    from ..database.crud import get_stats

    base_stats = await get_stats(db, crawl_id)

    broken = await analyze_broken_links(db, crawl_id)
    redirects = await analyze_redirects(db, crawl_id)
    slow = await analyze_slow_pages(db, crawl_id)
    deep = await analyze_deep_pages(db, crawl_id)

    return {
        **base_stats,
        "broken_links": broken,
        "redirects": redirects,
        "slow_pages": slow,
        "deep_pages": deep,
    }
