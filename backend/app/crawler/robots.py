from urllib.parse import urlparse, urljoin
import httpx


class RobotsTxt:
    def __init__(self, user_agent: str = "WebProbeBot/1.0"):
        self.user_agent = user_agent
        self._cache: dict[str, dict[str, list[str]]] = {}
        self._fetched: set[str] = set()

    async def fetch_and_parse(self, url: str, client: httpx.AsyncClient) -> None:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

        if robots_url in self._fetched:
            return

        self._fetched.add(robots_url)
        try:
            response = await client.get(robots_url, timeout=10)
            if response.status_code == 200:
                self._cache[parsed.netloc] = self._parse(response.text)
            else:
                self._cache[parsed.netloc] = {}
        except Exception:
            self._cache[parsed.netloc] = {}

    def _parse(self, content: str) -> dict[str, list[str]]:
        rules: dict[str, list[str]] = {}
        current_agent = None

        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            if ":" in line:
                key, value = line.split(":", 1)
                key = key.strip().lower()
                value = value.strip()

                if key == "user-agent":
                    current_agent = value
                    if current_agent not in rules:
                        rules[current_agent] = []
                elif key == "disallow" and current_agent:
                    if value:
                        rules[current_agent].append(value)

        return rules

    def is_allowed(self, url: str) -> bool:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        if domain not in self._cache:
            return True

        rules = self._cache[domain]

        matching_agent = None
        for agent_pattern in rules:
            if agent_pattern == "*":
                matching_agent = agent_pattern
            elif self.user_agent.lower().startswith(agent_pattern.lower()):
                matching_agent = agent_pattern

        if not matching_agent:
            return True

        disallowed_paths = rules[matching_agent]
        path = parsed.path

        for disallowed in disallowed_paths:
            if path.startswith(disallowed):
                return False

        return True
