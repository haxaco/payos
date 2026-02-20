/**
 * A2A Task Service
 *
 * Core task lifecycle operations for the A2A protocol.
 * Manages tasks, messages, and artifacts in the database.
 *
 * @see Epic 57: Google A2A Protocol Integration
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  A2ATask,
  A2ATaskState,
  A2AMessage,
  A2AArtifact,
  A2APart,
  A2ATaskRow,
  A2AMessageRow,
  A2AArtifactRow,
} from './types.js';

export interface ListTasksFilters {
  agentId?: string | null;
  state?: A2ATaskState;
  direction?: 'inbound' | 'outbound';
  page?: number;
  limit?: number;
}

export class A2ATaskService {
  constructor(
    private supabase: SupabaseClient,
    private tenantId: string,
  ) {}

  /**
   * Create a new A2A task with an initial message.
   */
  async createTask(
    agentId: string,
    message: { role?: 'user' | 'agent'; parts: A2APart[]; metadata?: Record<string, unknown> },
    contextId?: string,
    direction: 'inbound' | 'outbound' = 'inbound',
    remoteAgentUrl?: string,
    remoteTaskId?: string,
  ): Promise<A2ATask> {
    // Insert task
    const { data: taskRow, error: taskError } = await this.supabase
      .from('a2a_tasks')
      .insert({
        tenant_id: this.tenantId,
        agent_id: agentId,
        context_id: contextId || null,
        state: 'submitted',
        direction,
        remote_agent_url: remoteAgentUrl || null,
        remote_task_id: remoteTaskId || null,
      })
      .select()
      .single();

    if (taskError || !taskRow) {
      throw new Error(`Failed to create task: ${taskError?.message || 'unknown error'}`);
    }

    // Insert initial message
    const { data: msgRow, error: msgError } = await this.supabase
      .from('a2a_messages')
      .insert({
        tenant_id: this.tenantId,
        task_id: taskRow.id,
        role: message.role || 'user',
        parts: message.parts,
        metadata: message.metadata || {},
      })
      .select()
      .single();

    if (msgError) {
      throw new Error(`Failed to create message: ${msgError.message}`);
    }

    return this.rowToTask(taskRow as A2ATaskRow, [msgRow as A2AMessageRow], []);
  }

  /**
   * Get a task by ID with its messages and artifacts.
   */
  async getTask(taskId: string, historyLength?: number): Promise<A2ATask | null> {
    const { data: taskRow, error: taskError } = await this.supabase
      .from('a2a_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (taskError || !taskRow) return null;

    // Fetch messages
    let messagesQuery = this.supabase
      .from('a2a_messages')
      .select('*')
      .eq('task_id', taskId)
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: true });

    if (historyLength) {
      messagesQuery = messagesQuery.limit(historyLength);
    }

    const { data: messages } = await messagesQuery;

    // Fetch artifacts
    const { data: artifacts } = await this.supabase
      .from('a2a_artifacts')
      .select('*')
      .eq('task_id', taskId)
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: true });

    return this.rowToTask(
      taskRow as A2ATaskRow,
      (messages || []) as A2AMessageRow[],
      (artifacts || []) as A2AArtifactRow[],
    );
  }

  /**
   * Update a task's state.
   */
  async updateTaskState(
    taskId: string,
    state: A2ATaskState,
    statusMessage?: string,
    metadata?: Record<string, unknown>,
  ): Promise<A2ATask | null> {
    const updateData: Record<string, unknown> = { state };
    if (statusMessage !== undefined) updateData.status_message = statusMessage;
    if (metadata) updateData.metadata = metadata;

    const { data: taskRow, error } = await this.supabase
      .from('a2a_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error || !taskRow) return null;

    return this.getTask(taskId);
  }

  /**
   * Add a message to an existing task.
   */
  async addMessage(
    taskId: string,
    role: 'user' | 'agent',
    parts: A2APart[],
    metadata?: Record<string, unknown>,
  ): Promise<A2AMessage> {
    const { data: msgRow, error } = await this.supabase
      .from('a2a_messages')
      .insert({
        tenant_id: this.tenantId,
        task_id: taskId,
        role,
        parts,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error || !msgRow) {
      throw new Error(`Failed to add message: ${error?.message || 'unknown error'}`);
    }

    return this.rowToMessage(msgRow as A2AMessageRow);
  }

  /**
   * Add an artifact to a task.
   */
  async addArtifact(
    taskId: string,
    artifact: { label?: string; mimeType?: string; parts: A2APart[]; metadata?: Record<string, unknown> },
  ): Promise<A2AArtifact> {
    const { data: row, error } = await this.supabase
      .from('a2a_artifacts')
      .insert({
        tenant_id: this.tenantId,
        task_id: taskId,
        label: artifact.label || null,
        mime_type: artifact.mimeType || 'text/plain',
        parts: artifact.parts,
        metadata: artifact.metadata || {},
      })
      .select()
      .single();

    if (error || !row) {
      throw new Error(`Failed to add artifact: ${error?.message || 'unknown error'}`);
    }

    return this.rowToArtifact(row as A2AArtifactRow);
  }

  /**
   * Cancel a task.
   */
  async cancelTask(taskId: string): Promise<A2ATask | null> {
    return this.updateTaskState(taskId, 'canceled', 'Task canceled by user');
  }

  /**
   * List tasks with filtering and pagination.
   */
  async listTasks(filters: ListTasksFilters = {}) {
    const { agentId, state, direction, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('a2a_tasks')
      .select('*, agents!inner(name)', { count: 'exact' })
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentId) query = query.eq('agent_id', agentId);
    if (state) query = query.eq('state', state);
    if (direction) query = query.eq('direction', direction);

    const { data: rows, count, error } = await query;

    if (error) {
      throw new Error(`Failed to list tasks: ${error.message}`);
    }

    const tasks = (rows || []).map((row: any) => ({
      id: row.id,
      agentId: row.agent_id,
      agentName: row.agents?.name || null,
      contextId: row.context_id,
      state: row.state,
      statusMessage: row.status_message,
      direction: row.direction,
      remoteAgentUrl: row.remote_agent_url,
      clientAgentId: row.client_agent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Find an existing task by contextId for multi-turn conversations.
   */
  async findTaskByContext(agentId: string, contextId: string): Promise<A2ATask | null> {
    const { data: taskRow } = await this.supabase
      .from('a2a_tasks')
      .select('*')
      .eq('agent_id', agentId)
      .eq('context_id', contextId)
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!taskRow) return null;
    return this.getTask(taskRow.id);
  }

  /**
   * Link a payment to a task.
   */
  async linkPayment(
    taskId: string,
    transferId?: string,
    mandateId?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    if (transferId) update.transfer_id = transferId;
    if (mandateId) update.mandate_id = mandateId;

    await this.supabase
      .from('a2a_tasks')
      .update(update)
      .eq('id', taskId)
      .eq('tenant_id', this.tenantId);
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private rowToTask(
    row: A2ATaskRow,
    messages: A2AMessageRow[],
    artifacts: A2AArtifactRow[],
  ): A2ATask {
    return {
      id: row.id,
      contextId: row.context_id || undefined,
      status: {
        state: row.state,
        message: row.status_message || undefined,
        timestamp: row.updated_at,
      },
      messages: messages.map((m) => this.rowToMessage(m)),
      artifacts: artifacts.map((a) => this.rowToArtifact(a)),
      metadata: row.metadata || undefined,
    };
  }

  private rowToMessage(row: A2AMessageRow): A2AMessage {
    return {
      id: row.id,
      role: row.role,
      parts: row.parts,
      metadata: row.metadata || undefined,
    };
  }

  private rowToArtifact(row: A2AArtifactRow): A2AArtifact {
    return {
      id: row.id,
      label: row.label || undefined,
      mimeType: row.mime_type,
      parts: row.parts,
      metadata: row.metadata || undefined,
    };
  }
}
