# Sly Developer Guides

This directory contains practical guides for developers working on Sly. These guides cover development workflows, testing, deployment, integration, and onboarding.

## Directory Structure

```
guides/
├── README.md                    # This file
├── onboarding/                  # Getting started with Sly
├── development/                 # Development workflows and tools
├── testing/                     # Testing guides and procedures
├── deployment/                  # Deployment and production guides
└── integration/                 # B2B/B2C integration requirements
```

## Guide Categories

### Onboarding Guides

Get started with Sly development quickly and effectively.

| Document | Description |
|----------|-------------|
| [GEMINI_START_HERE.md](onboarding/GEMINI_START_HERE.md) | Quick start guide for AI assistants (Gemini, Claude, etc.) |
| [GEMINI_TESTING_INSTRUCTIONS.md](onboarding/GEMINI_TESTING_INSTRUCTIONS.md) | Testing workflows for AI-assisted development |
| [GEMINI_REGRESSION_CHECKLIST.md](onboarding/GEMINI_REGRESSION_CHECKLIST.md) | Regression testing checklist for AI assistants |
| [USER_ONBOARDING_IMPROVEMENTS.md](onboarding/USER_ONBOARDING_IMPROVEMENTS.md) | User onboarding flow improvements and testing |

**Start here:** [onboarding/GEMINI_START_HERE.md](onboarding/GEMINI_START_HERE.md)

### Development Guides

Learn development workflows, migration strategies, and SDK usage.

| Document | Description |
|----------|-------------|
| [MOCK_TO_API_MIGRATION.md](development/MOCK_TO_API_MIGRATION.md) | Guide for migrating from mock data to real APIs |
| [SDK_TESTING_GUIDE.md](development/SDK_TESTING_GUIDE.md) | SDK testing procedures and best practices |
| [SDK_SETUP_IMPROVEMENTS.md](development/SDK_SETUP_IMPROVEMENTS.md) | SDK setup enhancements and fixes |
| [POWER_USER_SEED_SYSTEM.md](development/POWER_USER_SEED_SYSTEM.md) | Power user seed data system documentation |
| [TYPESCRIPT_WORKFLOW.md](development/TYPESCRIPT_WORKFLOW.md) | TypeScript development workflow |
| [SDK_TESTING_LOG.md](development/SDK_TESTING_LOG.md) | SDK testing session logs |
| [SDK_TESTING_SNAGS_COMPLETE.md](development/SDK_TESTING_SNAGS_COMPLETE.md) | SDK testing issue resolutions |
| [POWER_USER_BATCHED_SEEDING.md](development/POWER_USER_BATCHED_SEEDING.md) | Batched seeding for large datasets |

**Key guide:** [development/MOCK_TO_API_MIGRATION.md](development/MOCK_TO_API_MIGRATION.md)

### Testing Guides

Comprehensive testing documentation for all aspects of Sly.

| Document | Description |
|----------|-------------|
| [VALIDATION_GUIDE.md](testing/VALIDATION_GUIDE.md) | Complete validation and testing guide |
| [UI_VALIDATION_GUIDE.md](testing/UI_VALIDATION_GUIDE.md) | UI testing procedures and checklist |
| [UI_VALIDATION_ACTUAL_RESULTS.md](testing/UI_VALIDATION_ACTUAL_RESULTS.md) | UI validation test results |
| [PAGINATION_TESTING_GUIDE.md](testing/PAGINATION_TESTING_GUIDE.md) | Testing pagination with large datasets |
| [GEMINI_X402_TESTING.md](testing/GEMINI_X402_TESTING.md) | x402 protocol testing guide |
| [GEMINI_TEST_RESOLUTION.md](testing/GEMINI_TEST_RESOLUTION.md) | Test issue resolution procedures |
| [TEST_STATUS_REPORT.md](testing/TEST_STATUS_REPORT.md) | Current test status and coverage |

**Start here:** [testing/VALIDATION_GUIDE.md](testing/VALIDATION_GUIDE.md)

### Integration Guides

Understand how different customer types integrate with Sly.

| Document | Description |
|----------|-------------|
| [INTEGRATION_REQUIREMENTS.md](integration/INTEGRATION_REQUIREMENTS.md) | B2B vs B2C integration requirements, protocols, and external registration needs |

**Key topics:** B2B partners, B2C end users, AI agents, protocol selection, card networks, settlement rails

### Deployment Guides

Production deployment strategies and business scenarios.

| Document | Description |
|----------|-------------|
| [BUSINESS_SCENARIOS_PROGRESS.md](deployment/BUSINESS_SCENARIOS_PROGRESS.md) | Business scenario validation progress |
| [DATA_CLEANUP_ANALYSIS.md](deployment/DATA_CLEANUP_ANALYSIS.md) | Data cleanup and migration analysis |
| [SAMPLE_APPS_PRD.md](deployment/SAMPLE_APPS_PRD.md) | Sample applications requirements |

**See also:** [/docs/deployment/](../deployment/) for full deployment documentation

## Quick Links by Task

### I need to...

| Task | Guide |
|------|-------|
| Get started as a new developer | [onboarding/GEMINI_START_HERE.md](onboarding/GEMINI_START_HERE.md) |
| Understand B2B vs B2C integration | [integration/INTEGRATION_REQUIREMENTS.md](integration/INTEGRATION_REQUIREMENTS.md) |
| Choose the right protocol | [integration/INTEGRATION_REQUIREMENTS.md](integration/INTEGRATION_REQUIREMENTS.md#protocol-selection-guide) |
| Migrate from mock to real data | [development/MOCK_TO_API_MIGRATION.md](development/MOCK_TO_API_MIGRATION.md) |
| Test the SDK | [development/SDK_TESTING_GUIDE.md](development/SDK_TESTING_GUIDE.md) |
| Test the UI | [testing/UI_VALIDATION_GUIDE.md](testing/UI_VALIDATION_GUIDE.md) |
| Test pagination | [testing/PAGINATION_TESTING_GUIDE.md](testing/PAGINATION_TESTING_GUIDE.md) |
| Run regression tests | [onboarding/GEMINI_REGRESSION_CHECKLIST.md](onboarding/GEMINI_REGRESSION_CHECKLIST.md) |
| Set up power user data | [development/POWER_USER_SEED_SYSTEM.md](development/POWER_USER_SEED_SYSTEM.md) |
| Work with TypeScript | [development/TYPESCRIPT_WORKFLOW.md](development/TYPESCRIPT_WORKFLOW.md) |

## Related Documentation

- [Architecture Documentation](../architecture/) - System architecture and design
- [Protocol Documentation](../protocols/) - x402, AP2, ACP protocols
- [Security Documentation](../security/) - Security guides and RLS testing
- [Deployment Documentation](../deployment/) - Production deployment
- [PRD](../prd/) - Product Requirements Document

## Contributing to Guides

When adding new guides:

1. Place in the appropriate subdirectory (onboarding, development, testing, deployment)
2. Use descriptive uppercase names: `FEATURE_GUIDE.md`
3. Include clear table of contents for guides >100 lines
4. Add cross-references to related guides
5. Update this README with the new guide

## Documentation Standards

All guides should:

- Start with a clear title and purpose statement
- Include a table of contents for longer documents
- Use consistent heading hierarchy (# → ## → ### → ####)
- Include examples and code snippets where applicable
- Reference related documentation
- Include a "Last updated" date

---

**Last Updated:** January 27, 2026
**Maintained By:** Sly Team

For the main documentation index, see [/docs/README.md](../README.md)
