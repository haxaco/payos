# Agentforce Org Probe — `agentforce-org`

**Date**: 2026-04-29
**Org**: `00Dfj00000H9zdZEAR` (Agentforce Trial / Developer Edition)
**Instance URL**: `https://orgfarm-2796413d99-dev-ed.develop.my.salesforce.com`
**API version**: `66.0`
**Auth**: `sf` CLI session — `sf org display --target-org agentforce-org --json`

## Summary

| Question | Answer |
|---|---|
| Does the org expose A2A natively (`/.well-known/agent.json`)? | **No** (HTTP 404) |
| Does it expose `/services/data/v66.0/connect/agents`? | **No** (HTTP 404) |
| Does it expose Einstein/Agentforce Agent API on the instance URL? | **No** (HTTP 404 at `/services/data/v66.0/einstein/ai-agent/v1/agents`) |
| Does `api.salesforce.com/einstein/ai-agent/v1/health` respond unauthenticated? | **No** (HTTP 404 — endpoint requires auth + correct path) |
| **How many Agentforce agents are defined in the org?** | **0** |
| How many Einstein Bots? | **0** |

## Available metadata sObjects (relevant ones)

The org's sObjects describe (filtered for agent/bot/genai/copilot/planner) lists:

```
AIAgentStatusEvent
AgentWork (and *ChangeEvent / *Share — service-cloud routing, not Agentforce)
BotDefinition
BotVersion
GenAiFunctionDefinition
GenAiPlannerAttrDefinition
GenAiPlannerDefinition       ← the Agentforce "Agent" object
GenAiPlannerFunctionDef
GenAiPluginDefinition         ← the Agentforce "Topic" object
GenAiPluginFunctionDef
GenAiPluginInstructionDef
OmniSpvsrConfigAIAgent
```

All return `totalSize: 0` on `SELECT COUNT()`. Schema is wired; no
records yet. (Note: GenAiPlannerDefinition has no `Status` column — use
`Id, DeveloperName, MasterLabel` only.)

## What didn't work + why

| Probe | HTTP | Reason |
|---|---|---|
| `GET {instance}/.well-known/agent.json` | 404 | Salesforce doesn't expose A2A on the instance host. |
| `GET {instance}/services/data/v66.0/connect/agents` | 404 | Endpoint doesn't exist on this org / API version. |
| Tooling API `SELECT FROM BotDefinition` | 400 INVALID_TYPE | BotDefinition isn't queryable via Tooling API — use the regular `/query` endpoint. |
| Tooling API `SELECT FROM GenAiPlanner` (without `Definition`) | 400 INVALID_TYPE | Older blog posts use the bare names; correct is `GenAiPlannerDefinition`. |
| `sf agent list` | error — not a command | `sf agent` topic exists (`generate / preview / publish / test / validate / activate / create / deactivate`) but no `list` subcommand. Closest enumeration is `sf data query` against `GenAiPlannerDefinition`. |
| `sf agent preview --target-org X --api-name Y` outside a project | RequiresProjectError | `sf agent` commands need a Salesforce project directory (sfdx-project.json). |
| `GET https://api.salesforce.com/einstein/ai-agent/v1/health` (unauth) | 404 | Endpoint requires Connected App OAuth — and the public path is different (Salesforce gates Agent API runtime behind a separate auth flow). |

## Architectural finding (important)

The `sf` CLI session token works for **org metadata APIs** (configuration,
queries, sObjects). It does **not** work for the Agentforce runtime
**Agent API**. Salesforce's Agent API (the surface that lets you invoke
an agent and get a response) requires:

1. A **Connected App** in the org with these OAuth scopes:
   - `api` (general API access)
   - `einstein_gpt_api` (Agentforce / Einstein gateway)
   - `sfap_api` (Salesforce API Gateway)
2. **Client-credentials OAuth flow** against the org's My Domain or
   `login.salesforce.com` with the Connected App's consumer key + secret.
3. Calls then go to `https://api.salesforce.com/einstein/ai-agent/v1/agents/{agentId}/sessions` (NOT the org's instance URL).

Implication for our plan: even if we proceed with **Phase 2b**
(Salesforce client), we **cannot use only the sf CLI token** for runtime
invocation. We'll need a Connected App regardless. The CLI token is fine
for the Phase 1 probe (metadata) — but Phase 2/3 cannot rely on it for
talking to the agent at runtime.

## What's needed before we can continue

The org has no agents, so there's nothing to probe a transport against.
Two choices:

### Option A — create a starter agent in this trial org (recommended for the demo)

In the Salesforce Setup UI of `agentforce-org`:

1. **Setup → Agentforce Studio** (or **Setup → Einstein → Agents**)
2. **New Agent** → pick a template:
   - **Agentforce Service Agent** (built-in, fastest to spin up — good for testing)
   - Or any of the standard templates the trial ships with.
3. **Activate** the agent.

Then re-run the probe — `GenAiPlannerDefinition` will have at least one
row, and we'll know the agent's `Id` + `DeveloperName` for runtime
invocation.

### Option B — point at a different org that already has agents

If you have another Salesforce org with active Agentforce agents,
re-auth a new alias with `sf org login web --alias <other-org>` and
re-point the probe at it.

### Option C — create the Connected App now, defer agent creation

If you want me to proceed with the platform-side scaffolding (Connected
App OAuth client in `apps/api/src/services/agentforce/client.ts`), we
can build it without an agent in the org — just won't be able to
end-to-end test until step A or B is done.

## Next step

Recommend **Option A** — fastest path to an end-to-end demo. Should
take ~5 min in the Salesforce Setup UI (the trial ships with agent
templates that activate without code).

Once an agent exists, re-run the probe (the same script that produced
this doc) and we'll have the agent ID + can plan the Connected App
+ runtime adapter from a known starting point.
