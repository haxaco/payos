"""Tests for sly_governance.config."""

import os
import pytest
from sly_governance.config import SlyGovernanceConfig


class TestSlyGovernanceConfig:
    def test_from_env(self, monkeypatch):
        monkeypatch.setenv("SLY_API_KEY", "agent_test123")
        monkeypatch.setenv("SLY_API_URL", "https://api.test.sly.ai")
        monkeypatch.setenv("SLY_AGENT_ID", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        monkeypatch.setenv("SLY_TIMEOUT", "5.0")
        monkeypatch.setenv("SLY_FAIL_OPEN", "true")
        monkeypatch.setenv("SLY_CACHE_TTL", "120")

        config = SlyGovernanceConfig.from_env()

        assert config.api_key == "agent_test123"
        assert config.api_url == "https://api.test.sly.ai"
        assert config.agent_id == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        assert config.timeout == 5.0
        assert config.fail_open is True
        assert config.cache_ttl == 120

    def test_from_env_defaults(self, monkeypatch):
        monkeypatch.setenv("SLY_API_KEY", "agent_test123")
        monkeypatch.setenv("SLY_AGENT_ID", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        monkeypatch.delenv("SLY_API_URL", raising=False)
        monkeypatch.delenv("SLY_TIMEOUT", raising=False)
        monkeypatch.delenv("SLY_FAIL_OPEN", raising=False)
        monkeypatch.delenv("SLY_CACHE_TTL", raising=False)

        config = SlyGovernanceConfig.from_env()

        assert config.api_url == "https://api.sly.ai"
        assert config.timeout == 3.0
        assert config.fail_open is False
        assert config.cache_ttl == 60

    def test_validate_success(self):
        config = SlyGovernanceConfig(
            api_key="agent_test123",
            agent_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        )
        config.validate()  # should not raise

    def test_validate_missing_api_key(self):
        config = SlyGovernanceConfig(
            api_key="",
            agent_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        )
        with pytest.raises(ValueError, match="SLY_API_KEY"):
            config.validate()

    def test_validate_missing_agent_id(self):
        config = SlyGovernanceConfig(
            api_key="agent_test123",
            agent_id="",
        )
        with pytest.raises(ValueError, match="SLY_AGENT_ID"):
            config.validate()

    def test_validate_missing_both(self):
        config = SlyGovernanceConfig(api_key="", agent_id="")
        with pytest.raises(ValueError, match="SLY_API_KEY.*SLY_AGENT_ID"):
            config.validate()

    def test_validate_bad_key_prefix(self):
        config = SlyGovernanceConfig(
            api_key="bad_prefix_123",
            agent_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        )
        with pytest.raises(ValueError, match="must start with"):
            config.validate()

    def test_validate_pk_test_key(self):
        config = SlyGovernanceConfig(
            api_key="pk_test_abc123",
            agent_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        )
        config.validate()  # should not raise

    def test_validate_negative_timeout(self):
        config = SlyGovernanceConfig(
            api_key="agent_test123",
            agent_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            timeout=-1.0,
        )
        with pytest.raises(ValueError, match="positive"):
            config.validate()

    def test_validate_negative_cache_ttl(self):
        config = SlyGovernanceConfig(
            api_key="agent_test123",
            agent_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            cache_ttl=-1,
        )
        with pytest.raises(ValueError, match="non-negative"):
            config.validate()


class TestRegisterSkill:
    def test_register_skill(self, monkeypatch):
        monkeypatch.setenv("SLY_API_KEY", "agent_test123")
        monkeypatch.setenv("SLY_AGENT_ID", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")

        from sly_governance import register_skill

        skill = register_skill()
        assert skill.name == "sly-governance"
        assert skill.version == "0.1.0"
        assert "contract-policy-check" in skill.capabilities

    def test_register_skill_with_config(self):
        from sly_governance import register_skill

        config = SlyGovernanceConfig(
            api_key="agent_test123",
            agent_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        )
        skill = register_skill(config)
        assert skill.config.api_key == "agent_test123"

    def test_register_skill_missing_config(self, monkeypatch):
        monkeypatch.delenv("SLY_API_KEY", raising=False)
        monkeypatch.delenv("SLY_AGENT_ID", raising=False)

        from sly_governance import register_skill

        with pytest.raises(ValueError):
            register_skill()
