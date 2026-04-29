"""sly-governance: OpenClaw skill for routing agent contracting through Sly's governance layer."""

from sly_governance.config import SlyGovernanceConfig

__version__ = "0.1.0"

SKILL_METADATA = {
    "name": "sly-governance",
    "version": __version__,
    "author": "Sly",
    "description": "Route agent contracting actions through Sly governance — "
    "spending policies, counterparty checks, escrow governance, reputation scoring.",
    "category": "governance",
    "capabilities": [
        "contract-policy-check",
        "negotiation-guardrails",
        "governed-escrow",
        "reputation-query",
    ],
    "protocols": ["agent-escrow-protocol", "erc-8004"],
    "pricing": {
        "model": "free-tier",
        "note": "Free for agents under $1K/month contract volume",
    },
    "config_env_vars": ["SLY_API_KEY", "SLY_API_URL", "SLY_AGENT_ID"],
}


class SlyGovernanceSkill:
    """Registered skill instance returned by register_skill()."""

    def __init__(self, config: SlyGovernanceConfig) -> None:
        self.config = config
        self.metadata = SKILL_METADATA

    @property
    def name(self) -> str:
        return SKILL_METADATA["name"]

    @property
    def version(self) -> str:
        return __version__

    @property
    def capabilities(self) -> list[str]:
        return SKILL_METADATA["capabilities"]


def register_skill(config: SlyGovernanceConfig | None = None) -> SlyGovernanceSkill:
    """Register the sly-governance skill with OpenClaw.

    Args:
        config: Governance configuration. If None, loads from environment variables.

    Returns:
        Registered skill instance.

    Raises:
        ValueError: If required environment variables are missing.
    """
    if config is None:
        config = SlyGovernanceConfig.from_env()
    config.validate()
    return SlyGovernanceSkill(config)


__all__ = [
    "register_skill",
    "SlyGovernanceConfig",
    "SlyGovernanceSkill",
    "SKILL_METADATA",
]
