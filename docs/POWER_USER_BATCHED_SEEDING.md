# Power User Data - Batched Seeding Guide

## Quick Start: 3-Month Batches

Run the seed script in manageable 3-month increments to build up 12 months of data.

---

## 🚀 Batch Commands

### Batch 1: Most Recent 3 Months (Months 0-2)
```bash
cd apps/api
pnpm seed:power-user --email haxaco@gmail.com --profile crypto-native --months 3
```
**Creates:** ~4,200 transfers  
**Time:** ~8-10 minutes  
**Data:** Current month + 2 months ago

---

### Batch 2: Next 3 Months (Months 3-5)
```bash
pnpm seed:power-user --email haxaco@gmail.com --profile crypto-native --months 3
```
**Creates:** ~3,000 transfers  
**Time:** ~7-9 minutes  
**Data:** 3-5 months ago

---

### Batch 3: Next 3 Months (Months 6-8)
```bash
pnpm seed:power-user --email haxaco@gmail.com --profile crypto-native --months 3
```
**Creates:** ~2,200 transfers  
**Time:** ~5-7 minutes  
**Data:** 6-8 months ago

---

### Batch 4: Oldest 3 Months (Months 9-11)
```bash
pnpm seed:power-user --email haxaco@gmail.com --profile crypto-native --months 3
```
**Creates:** ~1,400 transfers  
**Time:** ~4-6 minutes  
**Data:** 9-11 months ago

---

## 📊 After Each Batch

You can:
1. ✅ **Login and test** the UI with partial data
2. ✅ **Check pagination** with current transfer count
3. ✅ **Verify performance** before adding more
4. ⏸️ **Pause** if you need to stop
5. 🔄 **Continue** when ready for the next batch

---

## 🎯 What Each Batch Creates

### First Run (Batch 1) - Fresh Start
- ✅ **150 accounts** (75 person + 45 business + 30 agents)
- ✅ **250 payment methods** (102 wallets + 61 banks + 41 cards)
- ✅ **180 relationships** (contractors + vendors)
- ✅ **4,200 transfers** (last 3 months)
- ✅ **50 streams**
- ✅ **40 disputes**

### Subsequent Runs (Batches 2-4) - Adds Historical Data
- ✅ **3,000-1,400 more transfers** per batch
- ✅ Historical transaction patterns
- ✅ Growth trends over time

---

## 💡 Pro Tips

### Test Between Batches
After each batch, check:
- Dashboard charts show correct trends
- Pagination works smoothly
- Search/filters perform well
- Date range selectors work

### Stop Anytime
- Script is idempotent (won't duplicate accounts)
- Can stop and resume later
- Press `Ctrl+C` to cancel mid-batch

### Custom Batch Sizes
```bash
# 1 month at a time (fastest)
pnpm seed:power-user --months 1

# 6 months (longer run)
pnpm seed:power-user --months 6

# Full 12 months (original)
pnpm seed:power-user
```

---

## 📈 Expected Totals After All Batches

| Metric | Count |
|--------|-------|
| **Accounts** | 150 |
| **Payment Methods** | 250 |
| **Stablecoin Wallets** | 102 (USDC, USDT, DAI, PYUSD, EURC) |
| **Transfers** | 13,500 |
| **Account Relationships** | 180 |
| **Streams** | 50 |
| **Disputes** | 40 |
| **Time Span** | 12 months |

---

## ⚡ Quick Reference

```bash
# Run Batch 1 (start here)
cd apps/api && pnpm seed:power-user --email haxaco@gmail.com --months 3

# After each batch completes, run the same command again
# The script will add the next 3 months of data automatically

# Check progress by logging into the UI:
# http://localhost:5173
# Login: haxaco@gmail.com / Password123!
```

---

## 🐛 Troubleshooting

### "Accounts already exist"
- ✅ **This is normal!** The script reuses existing accounts
- Each batch adds transfers to the same accounts
- Only the first batch creates accounts

### Batch Takes Too Long
- Try smaller batches: `--months 1`
- Check database performance
- Ensure good network connection to Supabase

### Want to Start Over
```bash
# Delete existing data (careful!)
# Then run Batch 1 again
```

---

## 📝 Example Session

```bash
$ cd apps/api

# Batch 1
$ pnpm seed:power-user --email haxaco@gmail.com --months 3
✅ Created 150 accounts, 250 payment methods, 4,200 transfers
⏱️  Duration: 9m 32s

# Test in UI... looks good!

# Batch 2
$ pnpm seed:power-user --email haxaco@gmail.com --months 3
✅ Created 0 accounts (reused), 0 payment methods (reused), 3,000 transfers
⏱️  Duration: 7m 18s

# Test in UI... pagination working great!

# Batch 3
$ pnpm seed:power-user --email haxaco@gmail.com --months 3
✅ Created 0 accounts (reused), 0 payment methods (reused), 2,200 transfers
⏱️  Duration: 5m 47s

# Batch 4
$ pnpm seed:power-user --email haxaco@gmail.com --months 3
✅ Created 0 accounts (reused), 0 payment methods (reused), 1,400 transfers
⏱️  Duration: 4m 23s

# Total: 10,800 transfers across 12 months in ~27 minutes
```

---

**Created:** December 18, 2024  
**For:** Incremental power user data seeding  
**Profile:** Crypto-Native Fintech


