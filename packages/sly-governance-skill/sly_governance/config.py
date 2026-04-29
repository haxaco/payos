"""Configuration management for sly-governance skill."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass
class SlyGovernanceConfig:
    """Configuration for the Sly governance skill.

    Attributes:
        api_key: Sly agent API key (e.g. "agent_abc123...").
        api_url: Sly API base URL.
        agent_id: UUID of the agent on Sly.
        timeout: HTTP request timeout in seconds.
        fail_open: If True, allow actions when Sly API is unreachable.
                   If False, deny actions when Sly API is unreachable.
        cache_ttl: Seconds to cache policy evaluation results.
    """

    api_key: str = ""
    api_url: str = "https://api.sly.ai"
    agent_id: str = ""
    timeout: float = 3.0
    fail_open: bool = False
    cache_ttl: int = 60
    _env_loaded: bool = field(default=False, repr=False)

    @classmethod
    def from_env(cls) -> SlyGovernanceConfig:
        """Load configuration from environment variables.

        Environment variables:
            SLY_API_KEY: Required. Agent API key.
            SLY_API_URL: Optional. API base URL (default: https://api.sly.ai).
            SLY_AGENT_ID: Required. Agent UUID.
            SLY_TIMEOUT: Optional. Request timeout in seconds (default: 3.0).
            SLY_FAIL_OPEN: Optional. "true" to allow actions when API is down (default: false).
            SLY_CACHE_TTL: Optional. Policy cache TTL in seconds (default: 60).
        """
        return cls(
            api_key=os.environ.get("SLY_API_KEY", ""),
            api_url=os.environ.get("SLY_API_URL", "https://api.sly.ai"),
            agent_id=os.environ.get("SLY_AGENT_ID", ""),
            timeout=float(os.environ.get("SLY_TIMEOUT", "3.0")),
            fail_open=os.environ.get("SLY_FAIL_OPEN", "").lower() == "true",
            cache_ttl=int(os.environ.get("SLY_CACHE_TTL", "60")),
            _env_loaded=True,
        )

    def validate(self) -> None:
        """Validate that required configuration is present.

        Raises:
            ValueError: If required fields are missing or invalid.
        """
        missing = []
        if not self.api_key:
            missing.append("SLY_API_KEY")
        if not self.agent_id:
            missing.append("SLY_AGENT_ID")
        if missing:
            raise ValueError(
                f"Missing required configuration: {', '.join(missing)}. "
                f"Set these as environment variables or pass them to SlyGovernanceConfig()."
            )
        if not self.api_key.startswith(("agent_", "pk_test_", "pk_live_")):
            raise ValueError(
                "SLY_API_KEY must start with 'agent_', 'pk_test_', or 'pk_live_'."
            )
        if self.timeout <= 0:
            raise ValueError("SLY_TIMEOUT must be positive.")
        if self.cache_ttl < 0:
            raise ValueError("SLY_CACHE_TTL must be non-negative.")
