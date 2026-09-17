from bs4 import BeautifulSoup
from urllib.parse import urlparse
from dataclasses import dataclass


@dataclass
class ParseResult:
    title: str | None
    h1: str | None
    internal_links: list[str]
    external_links: list[str]


def parse_html(html: str, base_url: str) -> ParseResult:
    soup = BeautifulSoup(html, "html.parser")

    title = None
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        title = title_tag.string.strip()

    h1 = None
    h1_tag = soup.find("h1")
    if h1_tag and h1_tag.string:
        h1 = h1_tag.string.strip()

    base_domain = urlparse(base_url).netloc.lower()
    internal_links = []
    external_links = []

    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
            continue

        parsed = urlparse(href)
        if parsed.scheme in ("http", "https"):
            link_domain = parsed.netloc.lower()
            if link_domain == base_domain:
                internal_links.append(href)
            else:
                external_links.append(href)
        elif href.startswith("/"):
            internal_links.append(href)
        else:
            internal_links.append(href)

    return ParseResult(
        title=title,
        h1=h1,
        internal_links=internal_links,
        external_links=external_links,
    )


def is_html_content(content_type: str | None) -> bool:
    if not content_type:
        return False
    return "text/html" in content_type.lower()
