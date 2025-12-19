import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { 
  logAudit,
  isValidUUID,
  getPaginationParams,
  paginationResponse,
} from '../utils/helpers.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const relationships = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createRelationshipSchema = z.object({
  relatedAccountId: z.string().uuid(),
  relationshipType: z.enum(['contractor', 'employer', 'vendor', 'customer', 'partner']),
  notes: z.string().max(1000).optional(),
});

const updateRelationshipSchema = z.object({
  relationshipType: z.enum(['contractor', 'employer', 'vendor', 'customer', 'partner']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  notes: z.string().max(1000).optional(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /v1/accounts/:accountId/relationships
 * List all relationships for an account
 */
relationships.get('/:accountId/relationships', async (c) => {
  const accountId = c.req.param('accountId');
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(accountId)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Get query parameters
  const relationshipType = c.req.query('type');
  const status = c.req.query('status') || 'active';
  const { page, limit } = getPaginationParams(c.req);
  const offset = (page - 1) * limit;
  
  // Verify account exists and belongs to tenant
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name, type')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account not found');
  }
  
  // Build query
  let query = supabase
    .from('account_relationships')
    .select(`
      id,
      account_id,
      related_account_id,
      relationship_type,
      status,
      notes,
      created_at,
      updated_at,
      related_account:accounts!related_account_id(id, name, type, email)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', accountId)
    .eq('status', status);
  
  // Filter by relationship type if provided
  if (relationshipType) {
    query = query.eq('relationship_type', relationshipType);
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
  
  const { data: relationships, error, count } = await query;
  
  if (error) {
    console.error('Error fetching relationships:', error);
    throw error;
  }
  
  // Transform data
  const transformedRelationships = relationships?.map((rel: any) => ({
    id: rel.id,
    accountId: rel.account_id,
    relatedAccountId: rel.related_account_id,
    relatedAccountName: rel.related_account?.name,
    relatedAccountType: rel.related_account?.type,
    relatedAccountEmail: rel.related_account?.email,
    relationshipType: rel.relationship_type,
    status: rel.status,
    notes: rel.notes,
    createdAt: rel.created_at,
    updatedAt: rel.updated_at,
  })) || [];
  
  return c.json(paginationResponse(transformedRelationships, {
    page,
    limit,
    total: count || 0,
  }));
});

/**
 * GET /v1/accounts/:accountId/contractors
 * Get all contractors for an account (convenience endpoint)
 */
relationships.get('/:accountId/contractors', async (c) => {
  const accountId = c.req.param('accountId');
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(accountId)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Verify account exists and belongs to tenant
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account not found');
  }
  
  // Get contractor relationships
  const { data: relationships, error } = await supabase
    .from('account_relationships')
    .select(`
      id,
      related_account_id,
      notes,
      created_at,
      related_account:accounts!related_account_id(id, name, type, email, verification_status, verification_tier)
    `)
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', accountId)
    .eq('relationship_type', 'contractor')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching contractors:', error);
    throw error;
  }
  
  // Transform data
  const contractors = relationships?.map((rel: any) => ({
    id: rel.id,
    accountId: rel.related_account_id,
    name: rel.related_account?.name,
    type: rel.related_account?.type,
    email: rel.related_account?.email,
    verificationStatus: rel.related_account?.verification_status,
    verificationTier: rel.related_account?.verification_tier,
    notes: rel.notes,
    relationshipCreatedAt: rel.created_at,
  })) || [];
  
  return c.json({ data: contractors });
});

/**
 * GET /v1/accounts/:accountId/employers
 * Get all employers for an account (convenience endpoint)
 */
relationships.get('/:accountId/employers', async (c) => {
  const accountId = c.req.param('accountId');
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(accountId)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Verify account exists and belongs to tenant
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account not found');
  }
  
  // Get employer relationships
  const { data: relationships, error } = await supabase
    .from('account_relationships')
    .select(`
      id,
      related_account_id,
      notes,
      created_at,
      related_account:accounts!related_account_id(id, name, type, email, verification_status, verification_tier)
    `)
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', accountId)
    .eq('relationship_type', 'employer')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching employers:', error);
    throw error;
  }
  
  // Transform data
  const employers = relationships?.map((rel: any) => ({
    id: rel.id,
    accountId: rel.related_account_id,
    name: rel.related_account?.name,
    type: rel.related_account?.type,
    email: rel.related_account?.email,
    verificationStatus: rel.related_account?.verification_status,
    verificationTier: rel.related_account?.verification_tier,
    notes: rel.notes,
    relationshipCreatedAt: rel.created_at,
  })) || [];
  
  return c.json({ data: employers });
});

/**
 * POST /v1/accounts/:accountId/relationships
 * Create a new relationship
 */
relationships.post('/:accountId/relationships', async (c) => {
  const accountId = c.req.param('accountId');
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(accountId)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Parse and validate body
  const body = await c.req.json();
  const validated = createRelationshipSchema.parse(body);
  
  // Verify both accounts exist and belong to tenant
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .in('id', [accountId, validated.relatedAccountId]);
  
  if (accountsError || !accounts || accounts.length !== 2) {
    throw new NotFoundError('One or both accounts not found');
  }
  
  // Check for self-relationship
  if (accountId === validated.relatedAccountId) {
    throw new ValidationError('Cannot create relationship with self');
  }
  
  // Check if relationship already exists
  const { data: existing } = await supabase
    .from('account_relationships')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', accountId)
    .eq('related_account_id', validated.relatedAccountId)
    .eq('relationship_type', validated.relationshipType)
    .maybeSingle();
  
  if (existing) {
    throw new ValidationError('Relationship already exists');
  }
  
  // Create relationship
  const { data: relationship, error } = await supabase
    .from('account_relationships')
    .insert({
      tenant_id: ctx.tenantId,
      account_id: accountId,
      related_account_id: validated.relatedAccountId,
      relationship_type: validated.relationshipType,
      notes: validated.notes,
      status: 'active',
    })
    .select(`
      *,
      related_account:accounts!related_account_id(id, name, type, email)
    `)
    .single();
  
  if (error) {
    console.error('Error creating relationship:', error);
    throw error;
  }
  
  // Log audit event
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    action: 'relationship.created',
    resourceType: 'account_relationship',
    resourceId: relationship.id,
    metadata: {
      accountId,
      relatedAccountId: validated.relatedAccountId,
      relationshipType: validated.relationshipType,
    },
  });
  
  // Transform response
  const transformedRelationship = {
    id: relationship.id,
    accountId: relationship.account_id,
    relatedAccountId: relationship.related_account_id,
    relatedAccountName: relationship.related_account?.name,
    relatedAccountType: relationship.related_account?.type,
    relatedAccountEmail: relationship.related_account?.email,
    relationshipType: relationship.relationship_type,
    status: relationship.status,
    notes: relationship.notes,
    createdAt: relationship.created_at,
    updatedAt: relationship.updated_at,
  };
  
  return c.json({ data: transformedRelationship }, 201);
});

/**
 * PATCH /v1/accounts/:accountId/relationships/:relationshipId
 * Update an existing relationship
 */
relationships.patch('/:accountId/relationships/:relationshipId', async (c) => {
  const accountId = c.req.param('accountId');
  const relationshipId = c.req.param('relationshipId');
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Validate UUIDs
  if (!isValidUUID(accountId) || !isValidUUID(relationshipId)) {
    throw new ValidationError('Invalid ID format');
  }
  
  // Parse and validate body
  const body = await c.req.json();
  const validated = updateRelationshipSchema.parse(body);
  
  // Verify relationship exists and belongs to tenant
  const { data: existing, error: existingError } = await supabase
    .from('account_relationships')
    .select('*')
    .eq('id', relationshipId)
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', accountId)
    .single();
  
  if (existingError || !existing) {
    throw new NotFoundError('Relationship not found');
  }
  
  // Update relationship
  const { data: relationship, error } = await supabase
    .from('account_relationships')
    .update({
      relationship_type: validated.relationshipType ?? existing.relationship_type,
      status: validated.status ?? existing.status,
      notes: validated.notes ?? existing.notes,
    })
    .eq('id', relationshipId)
    .eq('tenant_id', ctx.tenantId)
    .select(`
      *,
      related_account:accounts!related_account_id(id, name, type, email)
    `)
    .single();
  
  if (error) {
    console.error('Error updating relationship:', error);
    throw error;
  }
  
  // Log audit event
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    action: 'relationship.updated',
    resourceType: 'account_relationship',
    resourceId: relationship.id,
    metadata: {
      changes: validated,
    },
  });
  
  // Transform response
  const transformedRelationship = {
    id: relationship.id,
    accountId: relationship.account_id,
    relatedAccountId: relationship.related_account_id,
    relatedAccountName: relationship.related_account?.name,
    relatedAccountType: relationship.related_account?.type,
    relatedAccountEmail: relationship.related_account?.email,
    relationshipType: relationship.relationship_type,
    status: relationship.status,
    notes: relationship.notes,
    createdAt: relationship.created_at,
    updatedAt: relationship.updated_at,
  };
  
  return c.json({ data: transformedRelationship });
});

/**
 * DELETE /v1/accounts/:accountId/relationships/:relationshipId
 * Delete a relationship (soft delete by setting status to inactive)
 */
relationships.delete('/:accountId/relationships/:relationshipId', async (c) => {
  const accountId = c.req.param('accountId');
  const relationshipId = c.req.param('relationshipId');
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Validate UUIDs
  if (!isValidUUID(accountId) || !isValidUUID(relationshipId)) {
    throw new ValidationError('Invalid ID format');
  }
  
  // Check if hard delete is requested
  const hardDelete = c.req.query('hard') === 'true';
  
  // Verify relationship exists and belongs to tenant
  const { data: existing, error: existingError } = await supabase
    .from('account_relationships')
    .select('id')
    .eq('id', relationshipId)
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', accountId)
    .single();
  
  if (existingError || !existing) {
    throw new NotFoundError('Relationship not found');
  }
  
  if (hardDelete) {
    // Hard delete
    const { error } = await supabase
      .from('account_relationships')
      .delete()
      .eq('id', relationshipId)
      .eq('tenant_id', ctx.tenantId);
    
    if (error) {
      console.error('Error deleting relationship:', error);
      throw error;
    }
    
    // Log audit event
    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      action: 'relationship.deleted',
      resourceType: 'account_relationship',
      resourceId: relationshipId,
      metadata: {
        accountId,
        hardDelete: true,
      },
    });
  } else {
    // Soft delete (set status to inactive)
    const { error } = await supabase
      .from('account_relationships')
      .update({ status: 'inactive' })
      .eq('id', relationshipId)
      .eq('tenant_id', ctx.tenantId);
    
    if (error) {
      console.error('Error deactivating relationship:', error);
      throw error;
    }
    
    // Log audit event
    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      action: 'relationship.deactivated',
      resourceType: 'account_relationship',
      resourceId: relationshipId,
      metadata: {
        accountId,
        hardDelete: false,
      },
    });
  }
  
  return c.json({ 
    message: hardDelete ? 'Relationship deleted' : 'Relationship deactivated',
    success: true,
  });
});

export default relationships;


