import pytest
import asyncio
from app.crawler.worker import URLManager


@pytest.mark.asyncio
async def test_url_manager_add_visited():
    manager = URLManager()

    result = await manager.add_visited("https://example.com")
    assert result is True

    result = await manager.add_visited("https://example.com")
    assert result is False


def test_url_manager_add_url():
    manager = URLManager()

    manager.add_url("https://example.com")
    assert "https://example.com" in manager.visited


def test_url_manager_external_links():
    manager = URLManager()

    manager.add_external_link("https://example.com/page", "https://other.com/page")
    assert "https://example.com/page" in manager.external_links
    assert len(manager.external_links["https://example.com/page"]) == 1
