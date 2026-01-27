# PayOS - B2B Stablecoin Payout Operating System

A monorepo for PayOS, featuring a Hono API server and (coming soon) a Next.js dashboard.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- pnpm 9+

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Create a `.env` file in the **root** directory:

```bash
cp .env.example .env
```

Then fill in your Supabase credentials:

```env
# Get these from: Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Required!

# API Server
API_PORT=4000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

> ⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for the API to work. Find it in your Supabase Dashboard under **Settings > API > Service Role Key**.

### 4. Build Packages

```bash
pnpm build
```

### 5. Start Development Server

```bash
# Start API server
pnpm --filter @sly/api dev

# Or start everything
pnpm dev
```

The API will be available at `http://localhost:4000`

## 📁 Project Structure

```
payos/
├── apps/
│   ├── api/                 # Hono API Server (Port 4000)
│   └── dashboard/           # Next.js Dashboard (Coming soon)
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Shared utilities
│   └── db/                  # Database migrations
├── payos-ui/                # Figma export (to be integrated)
└── turbo.json               # Turborepo config
```

## 🔌 API Endpoints

### Health Check
```bash
curl http://localhost:4000/health
```

### Authenticated Requests
All `/v1/*` endpoints require authentication:

```bash
curl http://localhost:4000/v1/accounts \
  -H "Authorization: Bearer pk_test_demo_fintech_key_12345"
```

### Available Endpoints (Tier 1 Foundation)

| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/health` | ✅ Ready |
| GET | `/v1/accounts` | 🔜 Tier 2 |
| POST | `/v1/accounts` | 🔜 Tier 2 |
| GET | `/v1/agents` | 🔜 Tier 4 |
| GET | `/v1/transfers` | 🔜 Tier 3 |
| GET | `/v1/streams` | 🔜 Tier 5 |

## 🗄️ Database

The database schema includes:

- **tenants** - Multi-tenant partner organizations
- **accounts** - Person and Business accounts
- **agents** - AI agents with KYA verification
- **transfers** - One-time payments
- **streams** - Continuous per-second payments
- **ledger_entries** - Balance tracking

### Demo Data

A demo tenant with sample data is pre-seeded:

| Entity | Count | Examples |
|--------|-------|----------|
| Tenant | 1 | Demo Fintech |
| Accounts | 9 | TechCorp Inc, Maria Garcia, Carlos Martinez |
| Agents | 5 | Payroll Autopilot, Invoice Bot, Treasury Manager |
| Transfers | 6 | Various statuses |
| Streams | 5 | Healthy, Warning, Critical states |

**Demo API Key**: `pk_test_demo_fintech_key_12345`

## 🛠️ Development

### Run Commands

```bash
# Development (all apps)
pnpm dev

# Build everything
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Working with Packages

```bash
# Build specific package
pnpm --filter @sly/types build

# Add dependency to app
pnpm --filter @sly/api add zod
```

## 📋 Implementation Status

### Tier 1: Foundation ✅
- [x] Monorepo setup
- [x] Database schema
- [x] API middleware & auth
- [x] Seed data

### Tier 2: Accounts API 🔜
- [ ] List & Create accounts
- [ ] Get, Update, Delete accounts
- [ ] Balance service
- [ ] Balance endpoints

### Tier 3-8: Coming Soon
See PRD for full roadmap.

## 📄 License

Private - All rights reserved.


