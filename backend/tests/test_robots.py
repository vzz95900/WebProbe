import pytest
import asyncio
from app.crawler.robots import RobotsTxt


@pytest.mark.asyncio
async def test_robots_is_allowed_default():
    robots = RobotsTxt()
    assert robots.is_allowed("https://example.com/page") is True


def test_robots_parse():
    robots = RobotsTxt()
    content = """
    User-agent: *
    Disallow: /admin
    Disallow: /private

    User-agent: Googlebot
    Disallow: /secret
    """
    rules = robots._parse(content)
    assert "*" in rules
    assert "Googlebot" in rules
    assert "/admin" in rules["*"]
    assert "/secret" in rules["Googlebot"]


def test_robots_is_allowed_disallowed():
    robots = RobotsTxt()
    robots._cache["example.com"] = {
        "*": ["/admin", "/private"]
    }

    assert robots.is_allowed("https://example.com/page") is True
    assert robots.is_allowed("https://example.com/admin") is False
    assert robots.is_allowed("https://example.com/private") is False
