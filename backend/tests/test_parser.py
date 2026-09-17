import pytest
from app.crawler.parser import parse_html, is_html_content


def test_parse_html_links():
    html = """
    <html>
    <head><title>Test Page</title></head>
    <body>
        <h1>Main Heading</h1>
        <a href="/about">About</a>
        <a href="https://example.com/contact">Contact</a>
        <a href="https://other.com/page">External</a>
        <a href="#section">Anchor</a>
        <a href="javascript:void(0)">JS Link</a>
    </body>
    </html>
    """
    result = parse_html(html, "https://example.com")

    assert result.title == "Test Page"
    assert result.h1 == "Main Heading"
    assert len(result.internal_links) == 2
    assert len(result.external_links) == 1


def test_parse_html_no_title():
    html = "<html><body><p>No title</p></body></html>"
    result = parse_html(html, "https://example.com")
    assert result.title is None


def test_parse_html_no_h1():
    html = "<html><body><h2>Subheading</h2></body></html>"
    result = parse_html(html, "https://example.com")
    assert result.h1 is None


def test_is_html_content():
    assert is_html_content("text/html; charset=utf-8")
    assert is_html_content("text/html")
    assert not is_html_content("application/json")
    assert not is_html_content("image/png")
    assert not is_html_content(None)


def test_parse_html_multiple_h1():
    html = """
    <html>
    <body>
        <h1>First H1</h1>
        <h1>Second H1</h1>
    </body>
    </html>
    """
    result = parse_html(html, "https://example.com")
    assert result.h1 == "First H1"
