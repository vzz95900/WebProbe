import pytest
from app.crawler.url_manager import normalize_url, get_domain, is_same_domain


def test_normalize_url_basic():
    url = normalize_url("https://example.com/path")
    assert url == "https://example.com/path"


def test_normalize_url_trailing_slash():
    url = normalize_url("https://example.com/path/")
    assert url == "https://example.com/path"


def test_normalize_url_double_slash():
    url = normalize_url("https://example.com//path")
    assert url == "https://example.com/path"


def test_normalize_url_relative():
    url = normalize_url("/about", "https://example.com/page")
    assert url == "https://example.com/about"


def test_normalize_url_invalid():
    url = normalize_url("not-a-url")
    assert url is None


def test_normalize_url_ftp():
    url = normalize_url("ftp://example.com/file")
    assert url is None


def test_get_domain():
    domain = get_domain("https://example.com/path")
    assert domain == "example.com"


def test_get_domain_with_port():
    domain = get_domain("https://example.com:8080/path")
    assert domain == "example.com:8080"


def test_is_same_domain():
    assert is_same_domain("https://example.com/page", "example.com")
    assert not is_same_domain("https://other.com/page", "example.com")
