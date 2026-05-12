# Story 91.10: Per-Marketplace Health Monitoring + Auto-Pause

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 91.1, Epic 87 (dispute-rate computation), Epic 65 (metrics infra)

---

Per-marketplace uptime probes, error-rate metrics, dispute-rate tracking, and an auto-pause hook when thresholds breach.

Three pieces:
1. **Uptime probe** — every 1 minute, hit each managed marketplace's `/healthz` from an external pinger. Record latency + status in a metrics table.
2. **Dispute-rate watcher** — extension of Epic 87. When `disputes_30d / settlements_30d > kym_tier.max_dispute_rate`, auto-set `marketplaces.status = 'paused'` and notify the operator.
3. **Weekly stats roll-up** — Sunday cron aggregates per-marketplace stats into `marketplaces.metadata.weekly_stats` for cheap reads.

Auto-pause is reversible — operator can dispute the pause via support; admin un-pauses via runbook (Story 91.14).

## Acceptance

- [ ] Uptime probe runs every 60s against every live managed marketplace
- [ ] Dispute-rate breach pauses within 10 minutes of the threshold being crossed
- [ ] Paused marketplaces return 503 from the runtime (Story 91.1's middleware already handles this)
- [ ] Operator gets a notification (email + dashboard banner) on auto-pause
- [ ] Weekly stats cron writes within 5 minutes; failed runs alert ops

## Technical notes

Probe from outside Sly's primary region (Cloudflare Worker, Vercel Cron at a different region, or a dedicated service) so probes survive a regional outage. Reuse Epic 65's metrics infra rather than building a new one. Cross-reference Epic 87 for dispute-rate computation — don't duplicate the SQL.

## Dependencies

Story 91.1, Epic 87 (dispute-rate computation), Epic 65 (metrics infra).
