/**
 * Merchant catalog service — product CRUD on accounts.metadata.catalog.products.
 *
 * Catalog is stored as JSONB on the merchant account. There's no separate
 * products table because a merchant's catalog is (a) small, (b) always
 * fetched as a block alongside the merchant, and (c) mutated by the
 * operator rather than by merchant-signed requests. JSONB read-modify-write
 * is the right trade-off at this scale.
 *
 * All operations are tenant-scoped — callers must have already validated
 * that the account belongs to their tenant.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  unit_price_cents: number;
  currency: string;
  sku?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CatalogProductInput {
  name: string;
  category: string;
  unit_price_cents: number;
  currency?: string;
  sku?: string;
  description?: string;
}

async function readCatalog(
  supabase: SupabaseClient,
  accountId: string,
  tenantId: string,
): Promise<{ account: any | null; products: CatalogProduct[] }> {
  const { data: account } = await (supabase.from('accounts') as any)
    .select('id, subtype, metadata')
    .eq('id', accountId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!account) return { account: null, products: [] };

  const rawCatalog = account.metadata?.catalog;
  const products: CatalogProduct[] = Array.isArray(rawCatalog)
    ? rawCatalog
    : Array.isArray(rawCatalog?.products)
      ? rawCatalog.products
      : [];
  return { account, products };
}

async function writeCatalog(
  supabase: SupabaseClient,
  accountId: string,
  tenantId: string,
  account: any,
  nextProducts: CatalogProduct[],
): Promise<void> {
  // Normalize catalog shape: always write { products: [...] } going forward.
  // Keeps existing metadata keys (pos_provider, merchant_type, rating, etc.) intact.
  const newMetadata = {
    ...(account.metadata || {}),
    catalog: { products: nextProducts },
  };

  const { error } = await (supabase.from('accounts') as any)
    .update({ metadata: newMetadata, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Failed to write catalog: ${error.message}`);
}

export async function listProducts(
  supabase: SupabaseClient,
  accountId: string,
  tenantId: string,
): Promise<CatalogProduct[]> {
  const { products } = await readCatalog(supabase, accountId, tenantId);
  return products;
}

export async function addProduct(
  supabase: SupabaseClient,
  accountId: string,
  tenantId: string,
  input: CatalogProductInput,
): Promise<CatalogProduct> {
  const { account, products } = await readCatalog(supabase, accountId, tenantId);
  if (!account) throw new Error('Merchant account not found');

  const now = new Date().toISOString();
  const product: CatalogProduct = {
    id: randomUUID(),
    name: input.name,
    category: input.category,
    unit_price_cents: Math.round(input.unit_price_cents),
    currency: input.currency || 'USDC',
    sku: input.sku,
    description: input.description,
    created_at: now,
    updated_at: now,
  };

  await writeCatalog(supabase, accountId, tenantId, account, [...products, product]);
  return product;
}

export async function updateProduct(
  supabase: SupabaseClient,
  accountId: string,
  tenantId: string,
  productId: string,
  patch: Partial<CatalogProductInput>,
): Promise<CatalogProduct | null> {
  const { account, products } = await readCatalog(supabase, accountId, tenantId);
  if (!account) throw new Error('Merchant account not found');

  const idx = products.findIndex((p) => p.id === productId);
  if (idx < 0) return null;

  const prev = products[idx];
  const updated: CatalogProduct = {
    ...prev,
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.category !== undefined && { category: patch.category }),
    ...(patch.unit_price_cents !== undefined && { unit_price_cents: Math.round(patch.unit_price_cents) }),
    ...(patch.currency !== undefined && { currency: patch.currency }),
    ...(patch.sku !== undefined && { sku: patch.sku }),
    ...(patch.description !== undefined && { description: patch.description }),
    updated_at: new Date().toISOString(),
  };
  const next = [...products];
  next[idx] = updated;

  await writeCatalog(supabase, accountId, tenantId, account, next);
  return updated;
}

export async function deleteProduct(
  supabase: SupabaseClient,
  accountId: string,
  tenantId: string,
  productId: string,
): Promise<boolean> {
  const { account, products } = await readCatalog(supabase, accountId, tenantId);
  if (!account) throw new Error('Merchant account not found');

  const next = products.filter((p) => p.id !== productId);
  if (next.length === products.length) return false; // nothing removed

  await writeCatalog(supabase, accountId, tenantId, account, next);
  return true;
}
