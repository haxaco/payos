import { Hono } from 'hono';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { getPaginationParams, paginationResponse } from '../utils/helpers.js';

const cardTransactions = new Hono();

// Note: Auth middleware is applied globally in app.ts for all /v1 routes

// ============================================
// Interfaces
// ============================================

interface CardTransaction {
  id: string;
  paymentMethodId: string;
  accountId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  merchantName?: string;
  merchantCategory?: string;
  merchantCountry?: string;
  cardLastFour?: string;
  declineReason?: string;
  isDisputed: boolean;
  transactionTime: string;
  createdAt: string;
}

// ============================================
// Helpers
// ============================================

function mapCardTransactionFromDb(row: any): CardTransaction {
  return {
    id: row.id,
    paymentMethodId: row.payment_method_id,
    accountId: row.account_id,
    type: row.type,
    status: row.status,
    amount: parseFloat(row.amount),
    currency: row.currency,
    merchantName: row.merchant_name,
    merchantCategory: row.merchant_category,
    merchantCountry: row.merchant_country,
    cardLastFour: row.card_last_four,
    declineReason: row.decline_reason,
    isDisputed: row.is_disputed,
    transactionTime: row.transaction_time,
    createdAt: row.created_at,
  };
}

// ============================================
// GET /v1/card-transactions - List all card transactions
// ============================================
cardTransactions.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const query = c.req.query();

  // Parse pagination params
  const { page, limit } = getPaginationParams(query);
  
  // Parse filter params
  const accountId = query.account_id;
  const type = query.type;
  const status = query.status;

  // Build query
  let dbQuery = supabase
    .from('card_transactions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('transaction_time', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  // Apply filters
  if (accountId) {
    dbQuery = dbQuery.eq('account_id', accountId);
  }
  if (type) {
    dbQuery = dbQuery.eq('type', type);
  }
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error('Error fetching card transactions:', error);
    return c.json({ error: 'Failed to fetch card transactions' }, 500);
  }

  const transactions = (data || []).map(mapCardTransactionFromDb);

  return c.json(paginationResponse(transactions, count || 0, { page, limit }));
});

// ============================================
// GET /v1/card-transactions/stats - Get card transaction stats
// ============================================
cardTransactions.get('/stats', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Get total spend, transaction count, and breakdown by type
  const { data, error } = await supabase
    .from('card_transactions')
    .select('type, status, amount')
    .eq('tenant_id', ctx.tenantId);

  if (error) {
    console.error('Error fetching card transaction stats:', error);
    return c.json({ error: 'Failed to fetch card transaction stats' }, 500);
  }

  const stats = {
    totalSpent: 0,
    totalTransactions: data?.length || 0,
    totalPurchases: 0,
    totalRefunds: 0,
    totalDeclines: 0,
    purchaseAmount: 0,
    refundAmount: 0,
  };

  data?.forEach((tx: any) => {
    const amount = parseFloat(tx.amount);
    
    if (tx.type === 'purchase' && tx.status === 'completed') {
      stats.totalPurchases++;
      stats.purchaseAmount += amount;
      stats.totalSpent += amount;
    } else if (tx.type === 'refund' && tx.status === 'completed') {
      stats.totalRefunds++;
      stats.refundAmount += amount;
      stats.totalSpent -= amount; // Subtract refunds
    } else if (tx.type === 'decline') {
      stats.totalDeclines++;
    }
  });

  return c.json({ stats });
});

export default cardTransactions;

