from urllib.parse import urlparse, urljoin, urldefrag, unquote
import re


def normalize_url(url: str, base_url: str = None) -> str | None:
    if base_url:
        url = urljoin(base_url, url)

    url = url.strip()

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return None

    if not parsed.netloc:
        return None

    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower().rstrip(".")

    path = unquote(parsed.path)
    path = re.sub(r"/+", "/", path)
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")

    if not path:
        path = "/"

    fragment = ""
    if parsed.fragment:
        fragment = f"#{parsed.fragment}"

    query = ""
    if parsed.query:
        query = f"?{parsed.query}"

    normalized = f"{scheme}://{netloc}{path}{query}{fragment}"
    return normalized


def get_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc.lower()


def is_same_domain(url: str, domain: str) -> bool:
    return get_domain(url) == domain


def get_url_for_display(url: str, max_length: int = 80) -> str:
    if len(url) <= max_length:
        return url
    parsed = urlparse(url)
    path = parsed.path
    if len(path) > max_length - 20:
        path = path[: max_length - 23] + "..."
    return f"{parsed.scheme}://{parsed.netloc}{path}"
