# @payos/db

Database migrations and seed data for PayOS.

## Migrations

Migrations are stored in the `migrations/` directory and are applied via the Supabase MCP tool.

### Migration Files

1. `001_initial_schema.sql` - Core tables: tenants, accounts, ledger_entries
2. `002_agents.sql` - Agents table with KYA and permissions
3. `003_transfers.sql` - Transfers table
4. `004_streams.sql` - Streams and stream_events tables
5. `005_reports.sql` - Documents and audit_log tables

## Seed Data

Seed data is in `seed.sql` and creates:

- Demo tenant with API key
- Sample business accounts
- Sample person accounts
- Sample agents
- Sample transfers and streams

## Usage

Migrations are applied using the Supabase MCP connection in the development environment.

