# TypeScript Workflow & Quality Checks

This document explains how to prevent TypeScript errors from reaching production.

## 🚨 The Problem

Previously, TypeScript errors were only caught during Vercel builds, leading to:
- Failed deployments
- Wasted CI/CD time
- Slower development feedback loop

## ✅ The Solution

We now have **3 layers of defense**:

### 1️⃣ **Local Pre-Commit Check** (Manual)

Before committing, run the pre-commit check script:

```bash
./scripts/pre-commit-check.sh
```

This script automatically detects which packages you've changed and runs TypeScript checks only on those packages.

**What it checks:**
- ✅ Web app (`apps/web`)
- ✅ API client (`packages/api-client`)
- ✅ UI components (`packages/ui`)
- ⏭️ API (skipped for now due to pre-existing errors)

**Example output:**
```
🔍 Running TypeScript checks...

📦 Checking web package...
✅ Web package: No TypeScript errors

✨ All TypeScript checks passed!
```

### 2️⃣ **GitHub Actions** (Automatic)

Every push and PR triggers a TypeScript check:

**Workflow:** `.github/workflows/typescript-check.yml`

This ensures no TypeScript errors are merged into `main`.

### 3️⃣ **Vercel Build** (Final Check)

Vercel also runs TypeScript checks during deployment, but by this point, errors should already be caught by steps 1 and 2.

---

## 📋 Best Practices

### Before Every Commit

1. **Run the pre-commit check:**
   ```bash
   ./scripts/pre-commit-check.sh
   ```

2. **If you're only changing the web app:**
   ```bash
   cd apps/web && pnpm tsc --noEmit
   ```

3. **For specific packages:**
   ```bash
   cd packages/api-client && pnpm tsc --noEmit
   cd packages/ui && pnpm tsc --noEmit
   ```

### Common TypeScript Errors to Watch For

1. **Type Mismatches:**
   - Always check the API client types (`packages/api-client/src/types.ts`)
   - Ensure UI calls match the expected API input types

2. **Missing Properties:**
   - If adding new fields to API routes, update the types file
   - Rebuild packages: `pnpm build --filter=@payos/api-client`

3. **Optional vs Required:**
   - Check if properties are marked `?` (optional)
   - Don't pass optional fields that aren't in the type definition

---

## 🔧 Quick Reference

| Command | Purpose |
|---------|---------|
| `./scripts/pre-commit-check.sh` | Check changed packages before commit |
| `cd apps/web && pnpm tsc --noEmit` | Check web app only |
| `pnpm typecheck` | Check ALL packages (slower, may have errors) |
| `pnpm build --filter=@payos/api-client` | Rebuild api-client after type changes |

---

## 🎯 Current Status

- ✅ **Web:** TypeScript checks passing
- ✅ **API Client:** TypeScript checks passing
- ✅ **UI:** TypeScript checks passing
- ⚠️ **API:** Has pre-existing TypeScript errors (to be fixed in a future epic)

---

## 🚀 Future Improvements

1. **Install Husky:** Automatically run pre-commit checks
   ```bash
   pnpm add -D husky
   npx husky install
   ```

2. **Fix API TypeScript Errors:** Enable API checks in GitHub Actions

3. **Add lint-staged:** Only check files that changed
   ```bash
   pnpm add -D lint-staged
   ```

---

## 💡 Remember

> **Always run TypeScript checks locally before pushing!**
> 
> This saves time, prevents broken builds, and keeps the team moving fast.

**Quick check before commit:**
```bash
./scripts/pre-commit-check.sh && git commit -m "your message"
```

