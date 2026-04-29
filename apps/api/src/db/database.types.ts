// AUTO-GENERATED — supabase types for the public schema.
// Source: `mcp__supabase__generate_typescript_types` against the live
// project. Re-generate via the same tool when the schema changes.
// Manual edits will be overwritten.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      a2a_artifacts: {
        Row: {
          created_at: string | null
          environment: string
          id: string
          label: string | null
          metadata: Json | null
          mime_type: string
          parts: Json
          task_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          environment?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          mime_type?: string
          parts?: Json
          task_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          environment?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          mime_type?: string
          parts?: Json
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "a2a_artifacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "a2a_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "a2a_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      a2a_audit_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          agent_id: string
          created_at: string
          data: Json
          duration_ms: number | null
          environment: string
          event_type: string
          from_state: string | null
          id: string
          task_id: string
          tenant_id: string
          to_state: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          agent_id: string
          created_at?: string
          data?: Json
          duration_ms?: number | null
          environment?: string
          event_type: string
          from_state?: string | null
          id?: string
          task_id: string
          tenant_id: string
          to_state?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          agent_id?: string
          created_at?: string
          data?: Json
          duration_ms?: number | null
          environment?: string
          event_type?: string
          from_state?: string | null
          id?: string
          task_id?: string
          tenant_id?: string
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "a2a_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      a2a_messages: {
        Row: {
          created_at: string | null
          environment: string
          id: string
          metadata: Json | null
          parts: Json
          role: string
          task_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          environment?: string
          id?: string
          metadata?: Json | null
          parts?: Json
          role: string
          task_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          environment?: string
          id?: string
          metadata?: Json | null
          parts?: Json
          role?: string
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "a2a_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "a2a_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "a2a_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      a2a_task_feedback: {
        Row: {
          action: string
          caller_agent_id: string | null
          comment: string | null
          counterparty_feedback_id: string | null
          created_at: string
          currency: string | null
          direction: string | null
          environment: string
          id: string
          mandate_id: string | null
          original_amount: number | null
          provider_agent_id: string
          revealed: boolean | null
          satisfaction: string | null
          score: number | null
          settlement_amount: number | null
          skill_id: string | null
          task_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          caller_agent_id?: string | null
          comment?: string | null
          counterparty_feedback_id?: string | null
          created_at?: string
          currency?: string | null
          direction?: string | null
          environment?: string
          id?: string
          mandate_id?: string | null
          original_amount?: number | null
          provider_agent_id: string
          revealed?: boolean | null
          satisfaction?: string | null
          score?: number | null
          settlement_amount?: number | null
          skill_id?: string | null
          task_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          caller_agent_id?: string | null
          comment?: string | null
          counterparty_feedback_id?: string | null
          created_at?: string
          currency?: string | null
          direction?: string | null
          environment?: string
          id?: string
          mandate_id?: string | null
          original_amount?: number | null
          provider_agent_id?: string
          revealed?: boolean | null
          satisfaction?: string | null
          score?: number | null
          settlement_amount?: number | null
          skill_id?: string | null
          task_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "a2a_task_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      a2a_tasks: {
        Row: {
          a2a_session_id: string | null
          agent_id: string
          callback_attempts: number | null
          callback_last_attempt_at: string | null
          callback_last_response_code: number | null
          callback_next_retry_at: string | null
          callback_secret: string | null
          callback_status: string | null
          callback_url: string | null
          client_agent_id: string | null
          client_agent_url: string | null
          context_id: string | null
          created_at: string | null
          direction: string | null
          environment: string
          error_details: Json | null
          id: string
          idempotency_key: string | null
          mandate_id: string | null
          max_retries: number | null
          metadata: Json | null
          processing_completed_at: string | null
          processing_duration_ms: number | null
          processing_started_at: string | null
          processor_id: string | null
          remote_agent_url: string | null
          remote_task_id: string | null
          retry_after: string | null
          retry_count: number | null
          state: string
          status_message: string | null
          tenant_id: string
          transfer_id: string | null
          updated_at: string | null
          webhook_attempts: number | null
          webhook_delivery_id: string | null
          webhook_dlq_at: string | null
          webhook_dlq_reason: string | null
          webhook_last_attempt_at: string | null
          webhook_last_response_body: string | null
          webhook_last_response_code: number | null
          webhook_last_response_time_ms: number | null
          webhook_next_retry_at: string | null
          webhook_status: string | null
        }
        Insert: {
          a2a_session_id?: string | null
          agent_id: string
          callback_attempts?: number | null
          callback_last_attempt_at?: string | null
          callback_last_response_code?: number | null
          callback_next_retry_at?: string | null
          callback_secret?: string | null
          callback_status?: string | null
          callback_url?: string | null
          client_agent_id?: string | null
          client_agent_url?: string | null
          context_id?: string | null
          created_at?: string | null
          direction?: string | null
          environment?: string
          error_details?: Json | null
          id?: string
          idempotency_key?: string | null
          mandate_id?: string | null
          max_retries?: number | null
          metadata?: Json | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          processor_id?: string | null
          remote_agent_url?: string | null
          remote_task_id?: string | null
          retry_after?: string | null
          retry_count?: number | null
          state?: string
          status_message?: string | null
          tenant_id: string
          transfer_id?: string | null
          updated_at?: string | null
          webhook_attempts?: number | null
          webhook_delivery_id?: string | null
          webhook_dlq_at?: string | null
          webhook_dlq_reason?: string | null
          webhook_last_attempt_at?: string | null
          webhook_last_response_body?: string | null
          webhook_last_response_code?: number | null
          webhook_last_response_time_ms?: number | null
          webhook_next_retry_at?: string | null
          webhook_status?: string | null
        }
        Update: {
          a2a_session_id?: string | null
          agent_id?: string
          callback_attempts?: number | null
          callback_last_attempt_at?: string | null
          callback_last_response_code?: number | null
          callback_next_retry_at?: string | null
          callback_secret?: string | null
          callback_status?: string | null
          callback_url?: string | null
          client_agent_id?: string | null
          client_agent_url?: string | null
          context_id?: string | null
          created_at?: string | null
          direction?: string | null
          environment?: string
          error_details?: Json | null
          id?: string
          idempotency_key?: string | null
          mandate_id?: string | null
          max_retries?: number | null
          metadata?: Json | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          processor_id?: string | null
          remote_agent_url?: string | null
          remote_task_id?: string | null
          retry_after?: string | null
          retry_count?: number | null
          state?: string
          status_message?: string | null
          tenant_id?: string
          transfer_id?: string | null
          updated_at?: string | null
          webhook_attempts?: number | null
          webhook_delivery_id?: string | null
          webhook_dlq_at?: string | null
          webhook_dlq_reason?: string | null
          webhook_last_attempt_at?: string | null
          webhook_last_response_body?: string | null
          webhook_last_response_code?: number | null
          webhook_last_response_time_ms?: number | null
          webhook_next_retry_at?: string | null
          webhook_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "a2a_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "a2a_tasks_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "ap2_mandates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "a2a_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "a2a_tasks_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      account_relationships: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          notes: string | null
          related_account_id: string
          relationship_type: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          related_account_id: string
          relationship_type: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          related_account_id?: string
          relationship_type?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_relationships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_relationships_related_account_id_fkey"
            columns: ["related_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          agent_config: Json | null
          balance_available: number | null
          balance_buffer: number | null
          balance_in_streams: number | null
          balance_total: number | null
          compliance_contact_email: string | null
          compliance_contact_name: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          environment: string
          id: string
          metadata: Json | null
          name: string
          reliance_agreement_date: string | null
          reliance_partner_id: string | null
          subtype: string | null
          tenant_id: string
          type: string
          updated_at: string | null
          verification_path: string | null
          verification_status: string | null
          verification_tier: number | null
          verification_type: string | null
        }
        Insert: {
          agent_config?: Json | null
          balance_available?: number | null
          balance_buffer?: number | null
          balance_in_streams?: number | null
          balance_total?: number | null
          compliance_contact_email?: string | null
          compliance_contact_name?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          environment?: string
          id?: string
          metadata?: Json | null
          name: string
          reliance_agreement_date?: string | null
          reliance_partner_id?: string | null
          subtype?: string | null
          tenant_id: string
          type: string
          updated_at?: string | null
          verification_path?: string | null
          verification_status?: string | null
          verification_tier?: number | null
          verification_type?: string | null
        }
        Update: {
          agent_config?: Json | null
          balance_available?: number | null
          balance_buffer?: number | null
          balance_in_streams?: number | null
          balance_total?: number | null
          compliance_contact_email?: string | null
          compliance_contact_name?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          environment?: string
          id?: string
          metadata?: Json | null
          name?: string
          reliance_agreement_date?: string | null
          reliance_partner_id?: string | null
          subtype?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
          verification_path?: string | null
          verification_status?: string | null
          verification_tier?: number | null
          verification_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      acp_checkout_items: {
        Row: {
          checkout_id: string
          created_at: string | null
          currency: string
          description: string | null
          id: string
          image_url: string | null
          item_data: Json | null
          item_id: string | null
          name: string
          quantity: number
          tenant_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          checkout_id: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_data?: Json | null
          item_id?: string | null
          name: string
          quantity?: number
          tenant_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          checkout_id?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_data?: Json | null
          item_id?: string | null
          name?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "acp_checkout_items_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "acp_checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acp_checkout_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      acp_checkouts: {
        Row: {
          account_id: string
          agent_id: string
          agent_name: string | null
          cancelled_at: string | null
          checkout_data: Json | null
          checkout_id: string
          completed_at: string | null
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          discount_amount: number | null
          environment: string
          expires_at: string | null
          id: string
          merchant_account_id: string | null
          merchant_id: string
          merchant_name: string | null
          merchant_url: string | null
          metadata: Json | null
          payment_method: string | null
          session_id: string | null
          shared_payment_token: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          status: string
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          agent_id: string
          agent_name?: string | null
          cancelled_at?: string | null
          checkout_data?: Json | null
          checkout_id: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          environment?: string
          expires_at?: string | null
          id?: string
          merchant_account_id?: string | null
          merchant_id: string
          merchant_name?: string | null
          merchant_url?: string | null
          metadata?: Json | null
          payment_method?: string | null
          session_id?: string | null
          shared_payment_token?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: string
          subtotal: number
          tax_amount?: number | null
          tenant_id: string
          total_amount: number
          transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string
          agent_name?: string | null
          cancelled_at?: string | null
          checkout_data?: Json | null
          checkout_id?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          environment?: string
          expires_at?: string | null
          id?: string
          merchant_account_id?: string | null
          merchant_id?: string
          merchant_name?: string | null
          merchant_url?: string | null
          metadata?: Json | null
          payment_method?: string | null
          session_id?: string | null
          shared_payment_token?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acp_checkouts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acp_checkouts_merchant_account_id_fkey"
            columns: ["merchant_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acp_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acp_checkouts_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_auth_keys: {
        Row: {
          agent_id: string
          algorithm: string
          created_at: string
          id: string
          key_id: string
          label: string | null
          public_key: string
          public_key_hash: string
          revoked_at: string | null
          rotated_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          agent_id: string
          algorithm?: string
          created_at?: string
          id?: string
          key_id: string
          label?: string | null
          public_key: string
          public_key_hash: string
          revoked_at?: string | null
          rotated_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          agent_id?: string
          algorithm?: string
          created_at?: string
          id?: string
          key_id?: string
          label?: string | null
          public_key?: string
          public_key_hash?: string
          revoked_at?: string | null
          rotated_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_auth_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_auth_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_challenges: {
        Row: {
          agent_id: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          nonce: string
          tenant_id: string
        }
        Insert: {
          agent_id: string
          consumed?: boolean
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          nonce: string
          tenant_id: string
        }
        Update: {
          agent_id?: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          nonce?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_challenges_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_challenges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_connections: {
        Row: {
          agent_id: string
          connected_at: string
          disconnected_at: string | null
          events_buffered: number
          events_sent: number
          id: string
          ip_address: string | null
          last_heartbeat_at: string
          session_id: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          agent_id: string
          connected_at?: string
          disconnected_at?: string | null
          events_buffered?: number
          events_sent?: number
          id?: string
          ip_address?: string | null
          last_heartbeat_at?: string
          session_id?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          agent_id?: string
          connected_at?: string
          disconnected_at?: string | null
          events_buffered?: number
          events_sent?: number
          id?: string
          ip_address?: string | null
          last_heartbeat_at?: string
          session_id?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_connections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_connections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_custom_tools: {
        Row: {
          agent_id: string
          created_at: string
          description: string
          handler_method: string | null
          handler_secret: string | null
          handler_timeout_ms: number | null
          handler_type: string
          handler_url: string | null
          id: string
          input_schema: Json
          metadata: Json
          status: string
          tenant_id: string
          tool_name: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          description?: string
          handler_method?: string | null
          handler_secret?: string | null
          handler_timeout_ms?: number | null
          handler_type?: string
          handler_url?: string | null
          id?: string
          input_schema?: Json
          metadata?: Json
          status?: string
          tenant_id: string
          tool_name: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          description?: string
          handler_method?: string | null
          handler_secret?: string | null
          handler_timeout_ms?: number | null
          handler_type?: string
          handler_url?: string | null
          id?: string
          input_schema?: Json
          metadata?: Json
          status?: string
          tenant_id?: string
          tool_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_custom_tools_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_custom_tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_observations: {
        Row: {
          confidence: string
          created_at: string
          domain: string
          evidence: string
          evidence_url: string | null
          id: string
          merchant_scan_id: string | null
          metadata: Json | null
          observation_type: string
          observed_at: string
          query: string | null
          source: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          domain: string
          evidence: string
          evidence_url?: string | null
          id?: string
          merchant_scan_id?: string | null
          metadata?: Json | null
          observation_type: string
          observed_at?: string
          query?: string | null
          source: string
        }
        Update: {
          confidence?: string
          created_at?: string
          domain?: string
          evidence?: string
          evidence_url?: string | null
          id?: string
          merchant_scan_id?: string | null
          metadata?: Json | null
          observation_type?: string
          observed_at?: string
          query?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_observations_merchant_scan_id_fkey"
            columns: ["merchant_scan_id"]
            isOneToOne: false
            referencedRelation: "merchant_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_payment_approvals: {
        Row: {
          agent_id: string | null
          amount: number
          created_at: string
          currency: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          environment: string
          executed_at: string | null
          executed_transfer_id: string | null
          execution_error: string | null
          expires_at: string
          id: string
          payment_context: Json
          protocol: string
          recipient: Json | null
          requested_by_id: string | null
          requested_by_name: string | null
          requested_by_type: string | null
          status: string
          tenant_id: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          environment?: string
          executed_at?: string | null
          executed_transfer_id?: string | null
          execution_error?: string | null
          expires_at?: string
          id?: string
          payment_context: Json
          protocol: string
          recipient?: Json | null
          requested_by_id?: string | null
          requested_by_name?: string | null
          requested_by_type?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          environment?: string
          executed_at?: string | null
          executed_transfer_id?: string | null
          execution_error?: string | null
          expires_at?: string
          id?: string
          payment_context?: Json
          protocol?: string
          recipient?: Json | null
          requested_by_id?: string | null
          requested_by_name?: string | null
          requested_by_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_payment_approvals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_approvals_executed_transfer_id_fkey"
            columns: ["executed_transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_approvals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          agent_id: string
          auth_key_id: string
          consecutive_failures: number
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_used_at: string | null
          revoked_at: string | null
          session_token_hash: string
          session_token_prefix: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          agent_id: string
          auth_key_id: string
          consecutive_failures?: number
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          session_token_hash: string
          session_token_prefix: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          agent_id?: string
          auth_key_id?: string
          consecutive_failures?: number
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          session_token_hash?: string
          session_token_prefix?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_auth_key_id_fkey"
            columns: ["auth_key_id"]
            isOneToOne: false
            referencedRelation: "agent_auth_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_shopping_tests: {
        Row: {
          agent_model: string | null
          blockers: Json
          completed_steps: number
          created_at: string
          domain: string
          duration_ms: number | null
          estimated_lost_conversions: number | null
          estimated_lost_revenue_usd: number | null
          estimated_monthly_agent_visits: number | null
          failure_point: Json | null
          id: string
          merchant_scan_id: string
          recommendations: Json | null
          status: string
          steps: Json
          success_rate: number
          test_type: string
          tested_at: string
          total_steps: number
        }
        Insert: {
          agent_model?: string | null
          blockers?: Json
          completed_steps?: number
          created_at?: string
          domain: string
          duration_ms?: number | null
          estimated_lost_conversions?: number | null
          estimated_lost_revenue_usd?: number | null
          estimated_monthly_agent_visits?: number | null
          failure_point?: Json | null
          id?: string
          merchant_scan_id: string
          recommendations?: Json | null
          status: string
          steps?: Json
          success_rate?: number
          test_type?: string
          tested_at?: string
          total_steps?: number
        }
        Update: {
          agent_model?: string | null
          blockers?: Json
          completed_steps?: number
          created_at?: string
          domain?: string
          duration_ms?: number | null
          estimated_lost_conversions?: number | null
          estimated_lost_revenue_usd?: number | null
          estimated_monthly_agent_visits?: number | null
          failure_point?: Json | null
          id?: string
          merchant_scan_id?: string
          recommendations?: Json | null
          status?: string
          steps?: Json
          success_rate?: number
          test_type?: string
          tested_at?: string
          total_steps?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_shopping_tests_merchant_scan_id_fkey"
            columns: ["merchant_scan_id"]
            isOneToOne: false
            referencedRelation: "merchant_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_signing_keys: {
        Row: {
          agent_id: string
          algorithm: string
          created_at: string
          ethereum_address: string | null
          id: string
          key_id: string
          last_used_at: string | null
          private_key_encrypted: string
          public_key: string
          registered_networks: string[] | null
          smart_account_address: string | null
          smart_account_chain_id: number | null
          smart_account_deployed: boolean | null
          status: string
          tenant_id: string
          updated_at: string
          use_count: number
        }
        Insert: {
          agent_id: string
          algorithm?: string
          created_at?: string
          ethereum_address?: string | null
          id?: string
          key_id: string
          last_used_at?: string | null
          private_key_encrypted: string
          public_key: string
          registered_networks?: string[] | null
          smart_account_address?: string | null
          smart_account_chain_id?: number | null
          smart_account_deployed?: boolean | null
          status?: string
          tenant_id: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          agent_id?: string
          algorithm?: string
          created_at?: string
          ethereum_address?: string | null
          id?: string
          key_id?: string
          last_used_at?: string | null
          private_key_encrypted?: string
          public_key?: string
          registered_networks?: string[] | null
          smart_account_address?: string | null
          smart_account_chain_id?: number | null
          smart_account_deployed?: boolean | null
          status?: string
          tenant_id?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_signing_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_signing_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_signing_requests: {
        Row: {
          agent_id: string
          amount: number | null
          content_digest: string | null
          created_at: string
          currency: string | null
          expires_at: string
          id: string
          merchant_name: string | null
          rejection_reason: string | null
          request_host: string | null
          request_method: string
          request_path: string
          signature: string
          signature_input: string
          signing_key_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          agent_id: string
          amount?: number | null
          content_digest?: string | null
          created_at?: string
          currency?: string | null
          expires_at: string
          id?: string
          merchant_name?: string | null
          rejection_reason?: string | null
          request_host?: string | null
          request_method: string
          request_path: string
          signature: string
          signature_input: string
          signing_key_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          agent_id?: string
          amount?: number | null
          content_digest?: string | null
          created_at?: string
          currency?: string | null
          expires_at?: string
          id?: string
          merchant_name?: string | null
          rejection_reason?: string | null
          request_host?: string | null
          request_method?: string
          request_path?: string
          signature?: string
          signature_input?: string
          signing_key_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_signing_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_signing_requests_signing_key_id_fkey"
            columns: ["signing_key_id"]
            isOneToOne: false
            referencedRelation: "agent_signing_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_signing_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          agent_id: string
          base_price: number
          created_at: string | null
          currency: string | null
          description: string | null
          handler_type: string | null
          id: string
          input_modes: string[] | null
          input_schema: Json | null
          metadata: Json | null
          name: string
          output_modes: string[] | null
          skill_id: string
          status: string | null
          tags: string[] | null
          tenant_id: string
          total_fees_collected: number | null
          total_invocations: number | null
          updated_at: string | null
          x402_endpoint_id: string | null
        }
        Insert: {
          agent_id: string
          base_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          handler_type?: string | null
          id?: string
          input_modes?: string[] | null
          input_schema?: Json | null
          metadata?: Json | null
          name: string
          output_modes?: string[] | null
          skill_id: string
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          total_fees_collected?: number | null
          total_invocations?: number | null
          updated_at?: string | null
          x402_endpoint_id?: string | null
        }
        Update: {
          agent_id?: string
          base_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          handler_type?: string | null
          id?: string
          input_modes?: string[] | null
          input_schema?: Json | null
          metadata?: Json | null
          name?: string
          output_modes?: string[] | null
          skill_id?: string
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          total_fees_collected?: number | null
          total_invocations?: number | null
          updated_at?: string | null
          x402_endpoint_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_skills_x402_endpoint_id_fkey"
            columns: ["x402_endpoint_id"]
            isOneToOne: false
            referencedRelation: "x402_endpoint_performance"
            referencedColumns: ["endpoint_id"]
          },
          {
            foreignKeyName: "agent_skills_x402_endpoint_id_fkey"
            columns: ["x402_endpoint_id"]
            isOneToOne: false
            referencedRelation: "x402_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_traffic_events: {
        Row: {
          agent_type: string
          created_at: string
          detection_method: string
          domain: string
          id: string
          metadata: Json | null
          page_path: string
          referrer: string | null
          site_id: string
          user_agent_raw: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string
          detection_method: string
          domain: string
          id?: string
          metadata?: Json | null
          page_path?: string
          referrer?: string | null
          site_id: string
          user_agent_raw?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string
          detection_method?: string
          domain?: string
          id?: string
          metadata?: Json | null
          page_path?: string
          referrer?: string | null
          site_id?: string
          user_agent_raw?: string | null
        }
        Relationships: []
      }
      agent_usage: {
        Row: {
          agent_id: string
          created_at: string | null
          daily_amount: number | null
          date: string
          id: string
          monthly_amount: number | null
          tenant_id: string
          transaction_count: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          daily_amount?: number | null
          date?: string
          id?: string
          monthly_amount?: number | null
          tenant_id: string
          transaction_count?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          daily_amount?: number | null
          date?: string
          id?: string
          monthly_amount?: number | null
          tenant_id?: string
          transaction_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflow_permissions: {
        Row: {
          agent_id: string
          approval_conditions: Json | null
          can_approve: boolean
          can_initiate: boolean
          created_at: string
          id: string
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          approval_conditions?: Json | null
          can_approve?: boolean
          can_initiate?: boolean
          created_at?: string
          id?: string
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approval_conditions?: Json | null
          can_approve?: boolean
          can_initiate?: boolean
          created_at?: string
          id?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflow_permissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_workflow_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_workflow_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          active_streams_count: number | null
          allow_cross_tenant: boolean | null
          auth_client_id: string | null
          auth_client_secret_hash: string | null
          auth_token_hash: string | null
          auth_token_prefix: string | null
          auth_type: string | null
          auto_refill_daily_cap: number | null
          auto_refill_daily_reset_at: string | null
          auto_refill_daily_spent: number
          auto_refill_enabled: boolean
          auto_refill_last_at: string | null
          auto_refill_last_error: string | null
          auto_refill_last_status: string | null
          auto_refill_target: number | null
          auto_refill_threshold: number | null
          avatar_url: string | null
          behavioral_consistency_score: number | null
          created_at: string | null
          description: string | null
          discoverable: boolean | null
          effective_limit_daily: number | null
          effective_limit_monthly: number | null
          effective_limit_per_tx: number | null
          effective_limits_capped: boolean | null
          endpoint_enabled: boolean | null
          endpoint_secret: string | null
          endpoint_type: string | null
          endpoint_url: string | null
          environment: string
          erc8004_agent_id: string | null
          escalation_policy: string | null
          id: string
          kill_switch_operator_email: string | null
          kill_switch_operator_id: string | null
          kill_switch_operator_name: string | null
          kya_enterprise_override: boolean | null
          kya_override_assessed_at: string | null
          kya_status: string | null
          kya_tier: number | null
          kya_verified_at: string | null
          limit_daily: number | null
          limit_monthly: number | null
          limit_per_transaction: number | null
          max_active_streams: number | null
          max_context_messages: number | null
          max_flow_rate_per_stream: number | null
          max_total_outflow: number | null
          metadata: Json | null
          model_family: string | null
          model_version: string | null
          name: string
          operational_history_start: string | null
          parent_account_id: string | null
          permissions: Json | null
          policy_violation_count: number | null
          processing_config: Json | null
          processing_mode: string | null
          skill_manifest: Json | null
          status: string | null
          tenant_id: string
          total_stream_outflow: number | null
          total_transactions: number | null
          total_volume: number | null
          type: string | null
          updated_at: string | null
          use_case_description: string | null
          wallet_address: string | null
          wallet_verification_status: string | null
          wallet_verified_at: string | null
          x402_enabled: boolean | null
        }
        Insert: {
          active_streams_count?: number | null
          allow_cross_tenant?: boolean | null
          auth_client_id?: string | null
          auth_client_secret_hash?: string | null
          auth_token_hash?: string | null
          auth_token_prefix?: string | null
          auth_type?: string | null
          auto_refill_daily_cap?: number | null
          auto_refill_daily_reset_at?: string | null
          auto_refill_daily_spent?: number
          auto_refill_enabled?: boolean
          auto_refill_last_at?: string | null
          auto_refill_last_error?: string | null
          auto_refill_last_status?: string | null
          auto_refill_target?: number | null
          auto_refill_threshold?: number | null
          avatar_url?: string | null
          behavioral_consistency_score?: number | null
          created_at?: string | null
          description?: string | null
          discoverable?: boolean | null
          effective_limit_daily?: number | null
          effective_limit_monthly?: number | null
          effective_limit_per_tx?: number | null
          effective_limits_capped?: boolean | null
          endpoint_enabled?: boolean | null
          endpoint_secret?: string | null
          endpoint_type?: string | null
          endpoint_url?: string | null
          environment?: string
          erc8004_agent_id?: string | null
          escalation_policy?: string | null
          id?: string
          kill_switch_operator_email?: string | null
          kill_switch_operator_id?: string | null
          kill_switch_operator_name?: string | null
          kya_enterprise_override?: boolean | null
          kya_override_assessed_at?: string | null
          kya_status?: string | null
          kya_tier?: number | null
          kya_verified_at?: string | null
          limit_daily?: number | null
          limit_monthly?: number | null
          limit_per_transaction?: number | null
          max_active_streams?: number | null
          max_context_messages?: number | null
          max_flow_rate_per_stream?: number | null
          max_total_outflow?: number | null
          metadata?: Json | null
          model_family?: string | null
          model_version?: string | null
          name: string
          operational_history_start?: string | null
          parent_account_id?: string | null
          permissions?: Json | null
          policy_violation_count?: number | null
          processing_config?: Json | null
          processing_mode?: string | null
          skill_manifest?: Json | null
          status?: string | null
          tenant_id: string
          total_stream_outflow?: number | null
          total_transactions?: number | null
          total_volume?: number | null
          type?: string | null
          updated_at?: string | null
          use_case_description?: string | null
          wallet_address?: string | null
          wallet_verification_status?: string | null
          wallet_verified_at?: string | null
          x402_enabled?: boolean | null
        }
        Update: {
          active_streams_count?: number | null
          allow_cross_tenant?: boolean | null
          auth_client_id?: string | null
          auth_client_secret_hash?: string | null
          auth_token_hash?: string | null
          auth_token_prefix?: string | null
          auth_type?: string | null
          auto_refill_daily_cap?: number | null
          auto_refill_daily_reset_at?: string | null
          auto_refill_daily_spent?: number
          auto_refill_enabled?: boolean
          auto_refill_last_at?: string | null
          auto_refill_last_error?: string | null
          auto_refill_last_status?: string | null
          auto_refill_target?: number | null
          auto_refill_threshold?: number | null
          avatar_url?: string | null
          behavioral_consistency_score?: number | null
          created_at?: string | null
          description?: string | null
          discoverable?: boolean | null
          effective_limit_daily?: number | null
          effective_limit_monthly?: number | null
          effective_limit_per_tx?: number | null
          effective_limits_capped?: boolean | null
          endpoint_enabled?: boolean | null
          endpoint_secret?: string | null
          endpoint_type?: string | null
          endpoint_url?: string | null
          environment?: string
          erc8004_agent_id?: string | null
          escalation_policy?: string | null
          id?: string
          kill_switch_operator_email?: string | null
          kill_switch_operator_id?: string | null
          kill_switch_operator_name?: string | null
          kya_enterprise_override?: boolean | null
          kya_override_assessed_at?: string | null
          kya_status?: string | null
          kya_tier?: number | null
          kya_verified_at?: string | null
          limit_daily?: number | null
          limit_monthly?: number | null
          limit_per_transaction?: number | null
          max_active_streams?: number | null
          max_context_messages?: number | null
          max_flow_rate_per_stream?: number | null
          max_total_outflow?: number | null
          metadata?: Json | null
          model_family?: string | null
          model_version?: string | null
          name?: string
          operational_history_start?: string | null
          parent_account_id?: string | null
          permissions?: Json | null
          policy_violation_count?: number | null
          processing_config?: Json | null
          processing_mode?: string | null
          skill_manifest?: Json | null
          status?: string | null
          tenant_id?: string
          total_stream_outflow?: number | null
          total_transactions?: number | null
          total_volume?: number | null
          type?: string | null
          updated_at?: string | null
          use_case_description?: string | null
          wallet_address?: string | null
          wallet_verification_status?: string | null
          wallet_verified_at?: string | null
          x402_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ap2_mandate_executions: {
        Row: {
          amount: number
          authorization_proof: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          environment: string
          error_code: string | null
          error_message: string | null
          execution_index: number
          failed_at: string | null
          id: string
          mandate_id: string
          order_ids: Json | null
          status: string | null
          tenant_id: string
          transfer_id: string | null
        }
        Insert: {
          amount: number
          authorization_proof?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          environment?: string
          error_code?: string | null
          error_message?: string | null
          execution_index: number
          failed_at?: string | null
          id?: string
          mandate_id: string
          order_ids?: Json | null
          status?: string | null
          tenant_id: string
          transfer_id?: string | null
        }
        Update: {
          amount?: number
          authorization_proof?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          environment?: string
          error_code?: string | null
          error_message?: string | null
          execution_index?: number
          failed_at?: string | null
          id?: string
          mandate_id?: string
          order_ids?: Json | null
          status?: string | null
          tenant_id?: string
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap2_mandate_executions_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "ap2_mandates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap2_mandate_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap2_mandate_executions_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      ap2_mandates: {
        Row: {
          a2a_session_id: string | null
          account_id: string
          agent_id: string
          agent_name: string | null
          authorized_amount: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          environment: string
          execution_count: number | null
          expires_at: string | null
          funding_source_id: string | null
          id: string
          mandate_data: Json | null
          mandate_id: string
          mandate_type: string
          metadata: Json | null
          remaining_amount: number | null
          settlement_rail: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          used_amount: number | null
        }
        Insert: {
          a2a_session_id?: string | null
          account_id: string
          agent_id: string
          agent_name?: string | null
          authorized_amount: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          environment?: string
          execution_count?: number | null
          expires_at?: string | null
          funding_source_id?: string | null
          id?: string
          mandate_data?: Json | null
          mandate_id: string
          mandate_type: string
          metadata?: Json | null
          remaining_amount?: number | null
          settlement_rail?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          used_amount?: number | null
        }
        Update: {
          a2a_session_id?: string | null
          account_id?: string
          agent_id?: string
          agent_name?: string | null
          authorized_amount?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          environment?: string
          execution_count?: number | null
          expires_at?: string | null
          funding_source_id?: string | null
          id?: string
          mandate_data?: Json | null
          mandate_id?: string
          mandate_type?: string
          metadata?: Json | null
          remaining_amount?: number | null
          settlement_rail?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          used_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap2_mandates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap2_mandates_funding_source_id_fkey"
            columns: ["funding_source_id"]
            isOneToOne: false
            referencedRelation: "funding_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap2_mandates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          description: string | null
          environment: string
          expires_at: string | null
          grace_period_ends_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          last_used_ip: string | null
          name: string
          revoked_at: string | null
          revoked_by_user_id: string | null
          revoked_reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          grace_period_ends_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          last_used_ip?: string | null
          name: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          revoked_reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          grace_period_ends_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          name?: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          revoked_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_counts: {
        Row: {
          actor_type: string
          count: number
          created_at: string | null
          id: string | null
          method: string
          minute_bucket: string
          path_template: string
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string | null
          id?: string | null
          method: string
          minute_bucket: string
          path_template: string
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string | null
          id?: string | null
          method?: string
          minute_bucket?: string
          path_template?: string
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_request_counts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_counts_2026_03: {
        Row: {
          actor_type: string
          count: number
          created_at: string | null
          id: string | null
          method: string
          minute_bucket: string
          path_template: string
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string | null
          id?: string | null
          method: string
          minute_bucket: string
          path_template: string
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string | null
          id?: string | null
          method?: string
          minute_bucket?: string
          path_template?: string
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      api_request_counts_2026_04: {
        Row: {
          actor_type: string
          count: number
          created_at: string | null
          id: string | null
          method: string
          minute_bucket: string
          path_template: string
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string | null
          id?: string | null
          method: string
          minute_bucket: string
          path_template: string
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string | null
          id?: string | null
          method?: string
          minute_bucket?: string
          path_template?: string
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_type: string
          changes: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type: string
          changes?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_access_codes: {
        Row: {
          code: string
          code_type: string
          created_at: string
          created_by: string | null
          current_uses: number
          expires_at: string | null
          granted_max_agents: number | null
          granted_max_team_members: number | null
          id: string
          max_uses: number | null
          metadata: Json | null
          partner_name: string | null
          status: string
          target_actor_type: string
          updated_at: string
        }
        Insert: {
          code: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          granted_max_agents?: number | null
          granted_max_team_members?: number | null
          id?: string
          max_uses?: number | null
          metadata?: Json | null
          partner_name?: string | null
          status?: string
          target_actor_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          granted_max_agents?: number | null
          granted_max_team_members?: number | null
          id?: string
          max_uses?: number | null
          metadata?: Json | null
          partner_name?: string | null
          status?: string
          target_actor_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      beta_applications: {
        Row: {
          access_code_id: string | null
          agent_name: string | null
          applicant_type: string
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_name: string | null
          referral_source: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          use_case: string | null
        }
        Insert: {
          access_code_id?: string | null
          agent_name?: string | null
          applicant_type?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_name?: string | null
          referral_source?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          use_case?: string | null
        }
        Update: {
          access_code_id?: string | null
          agent_name?: string | null
          applicant_type?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_name?: string | null
          referral_source?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_applications_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "beta_access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_funnel_events: {
        Row: {
          access_code_id: string | null
          actor_type: string | null
          agent_id: string | null
          application_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string | null
        }
        Insert: {
          access_code_id?: string | null
          actor_type?: string | null
          agent_id?: string | null
          application_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
        }
        Update: {
          access_code_id?: string | null
          actor_type?: string | null
          agent_id?: string | null
          application_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_funnel_events_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "beta_access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_funnel_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "beta_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      card_transactions: {
        Row: {
          account_id: string
          amount: number
          authorization_code: string | null
          card_last_four: string | null
          created_at: string
          currency: string
          decline_code: string | null
          decline_reason: string | null
          dispute_id: string | null
          disputed_at: string | null
          environment: string
          external_network_id: string | null
          external_transaction_id: string | null
          id: string
          is_disputed: boolean | null
          merchant_category: string | null
          merchant_country: string | null
          merchant_id: string | null
          merchant_name: string | null
          metadata: Json | null
          payment_method_id: string
          status: string
          tenant_id: string
          transaction_time: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          authorization_code?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string
          decline_code?: string | null
          decline_reason?: string | null
          dispute_id?: string | null
          disputed_at?: string | null
          environment?: string
          external_network_id?: string | null
          external_transaction_id?: string | null
          id?: string
          is_disputed?: boolean | null
          merchant_category?: string | null
          merchant_country?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          metadata?: Json | null
          payment_method_id: string
          status?: string
          tenant_id: string
          transaction_time?: string
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          authorization_code?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string
          decline_code?: string | null
          decline_reason?: string | null
          dispute_id?: string | null
          disputed_at?: string | null
          environment?: string
          external_network_id?: string | null
          external_transaction_id?: string | null
          id?: string
          is_disputed?: boolean | null
          merchant_category?: string | null
          merchant_country?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          metadata?: Json | null
          payment_method_id?: string
          status?: string
          tenant_id?: string
          transaction_time?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_views: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          merchant_account_id: string
          referer_sku: string | null
          tenant_id: string
          viewer_agent_id: string | null
          viewer_type: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          merchant_account_id: string
          referer_sku?: string | null
          tenant_id: string
          viewer_agent_id?: string | null
          viewer_type: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          merchant_account_id?: string
          referer_sku?: string | null
          tenant_id?: string
          viewer_agent_id?: string | null
          viewer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_views_merchant_account_id_fkey"
            columns: ["merchant_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_views_viewer_agent_id_fkey"
            columns: ["viewer_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      census_known_agents: {
        Row: {
          agent_name: string
          agent_token: string | null
          agent_type: string | null
          agent_url: string | null
          category: string | null
          description: string | null
          id: string
          operator_name: string | null
          raw_entry: Json | null
          scanned_at: string | null
        }
        Insert: {
          agent_name: string
          agent_token?: string | null
          agent_type?: string | null
          agent_url?: string | null
          category?: string | null
          description?: string | null
          id?: string
          operator_name?: string | null
          raw_entry?: Json | null
          scanned_at?: string | null
        }
        Update: {
          agent_name?: string
          agent_token?: string | null
          agent_type?: string | null
          agent_url?: string | null
          category?: string | null
          description?: string | null
          id?: string
          operator_name?: string | null
          raw_entry?: Json | null
          scanned_at?: string | null
        }
        Relationships: []
      }
      census_mcp_servers: {
        Row: {
          description: string | null
          icon_url: string | null
          id: string
          is_latest: boolean | null
          published_at: string | null
          raw_entry: Json | null
          remote_type: string | null
          remote_url: string | null
          repo_source: string | null
          repo_url: string | null
          scanned_at: string | null
          server_name: string
          status: string | null
          updated_at: string | null
          version: string | null
          website_url: string | null
        }
        Insert: {
          description?: string | null
          icon_url?: string | null
          id?: string
          is_latest?: boolean | null
          published_at?: string | null
          raw_entry?: Json | null
          remote_type?: string | null
          remote_url?: string | null
          repo_source?: string | null
          repo_url?: string | null
          scanned_at?: string | null
          server_name: string
          status?: string | null
          updated_at?: string | null
          version?: string | null
          website_url?: string | null
        }
        Update: {
          description?: string | null
          icon_url?: string | null
          id?: string
          is_latest?: boolean | null
          published_at?: string | null
          raw_entry?: Json | null
          remote_type?: string | null
          remote_url?: string | null
          repo_source?: string | null
          repo_url?: string | null
          scanned_at?: string | null
          server_name?: string
          status?: string | null
          updated_at?: string | null
          version?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      census_scans: {
        Row: {
          achievements: Json | null
          avatar_url: string | null
          bond_balance: number | null
          claimed: boolean | null
          data_completeness: number
          dedup_hash: string
          description: string | null
          earnings: number | null
          enriched_at: string | null
          eth_balance: number | null
          first_tx_at: string | null
          followers: number | null
          id: string
          karma: number | null
          kya_signals: Json | null
          kya_tier: number
          last_tx_at: string | null
          listing_count: number | null
          moltroad_balance: number | null
          name: string | null
          platform: string
          platform_id: string
          rank: number | null
          rating: number | null
          rating_count: number | null
          raw_profile: Json | null
          reputation: number | null
          scan_version: string
          scanned_at: string
          service_tags: string[] | null
          skills_installed: number | null
          skills_published: number | null
          token_balance: number | null
          trust_score: number | null
          twitter_handle: string | null
          tx_count: number | null
          updated_at: string
          usdc_balance: number | null
          verified: boolean | null
          wallet_address: string | null
        }
        Insert: {
          achievements?: Json | null
          avatar_url?: string | null
          bond_balance?: number | null
          claimed?: boolean | null
          data_completeness?: number
          dedup_hash: string
          description?: string | null
          earnings?: number | null
          enriched_at?: string | null
          eth_balance?: number | null
          first_tx_at?: string | null
          followers?: number | null
          id?: string
          karma?: number | null
          kya_signals?: Json | null
          kya_tier?: number
          last_tx_at?: string | null
          listing_count?: number | null
          moltroad_balance?: number | null
          name?: string | null
          platform: string
          platform_id: string
          rank?: number | null
          rating?: number | null
          rating_count?: number | null
          raw_profile?: Json | null
          reputation?: number | null
          scan_version?: string
          scanned_at?: string
          service_tags?: string[] | null
          skills_installed?: number | null
          skills_published?: number | null
          token_balance?: number | null
          trust_score?: number | null
          twitter_handle?: string | null
          tx_count?: number | null
          updated_at?: string
          usdc_balance?: number | null
          verified?: boolean | null
          wallet_address?: string | null
        }
        Update: {
          achievements?: Json | null
          avatar_url?: string | null
          bond_balance?: number | null
          claimed?: boolean | null
          data_completeness?: number
          dedup_hash?: string
          description?: string | null
          earnings?: number | null
          enriched_at?: string | null
          eth_balance?: number | null
          first_tx_at?: string | null
          followers?: number | null
          id?: string
          karma?: number | null
          kya_signals?: Json | null
          kya_tier?: number
          last_tx_at?: string | null
          listing_count?: number | null
          moltroad_balance?: number | null
          name?: string | null
          platform?: string
          platform_id?: string
          rank?: number | null
          rating?: number | null
          rating_count?: number | null
          raw_profile?: Json | null
          reputation?: number | null
          scan_version?: string
          scanned_at?: string
          service_tags?: string[] | null
          skills_installed?: number | null
          skills_published?: number | null
          token_balance?: number | null
          trust_score?: number | null
          twitter_handle?: string | null
          tx_count?: number | null
          updated_at?: string
          usdc_balance?: number | null
          verified?: boolean | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      chain_performance_metrics: {
        Row: {
          amount_usd: number
          attestation_time_ms: number | null
          blockchain: string
          confirmation_time_ms: number | null
          created_at: string
          error: string | null
          fee_amount_usd: number | null
          gas_price_gwei: number | null
          gas_used: number | null
          id: string
          metadata: Json | null
          settlement_path: string
          settlement_type: string | null
          submission_time_ms: number | null
          success: boolean
          tenant_id: string
          total_duration_ms: number
          transfer_id: string | null
          tx_hash: string | null
        }
        Insert: {
          amount_usd: number
          attestation_time_ms?: number | null
          blockchain: string
          confirmation_time_ms?: number | null
          created_at?: string
          error?: string | null
          fee_amount_usd?: number | null
          gas_price_gwei?: number | null
          gas_used?: number | null
          id?: string
          metadata?: Json | null
          settlement_path: string
          settlement_type?: string | null
          submission_time_ms?: number | null
          success?: boolean
          tenant_id: string
          total_duration_ms: number
          transfer_id?: string | null
          tx_hash?: string | null
        }
        Update: {
          amount_usd?: number
          attestation_time_ms?: number | null
          blockchain?: string
          confirmation_time_ms?: number | null
          created_at?: string
          error?: string | null
          fee_amount_usd?: number | null
          gas_price_gwei?: number | null
          gas_used?: number | null
          id?: string
          metadata?: Json | null
          settlement_path?: string
          settlement_type?: string | null
          submission_time_ms?: number | null
          success?: boolean
          tenant_id?: string
          total_duration_ms?: number
          transfer_id?: string | null
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_performance_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_telemetry: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          amount: number | null
          created_at: string
          currency: string | null
          error_details: Json | null
          event_type: string
          failure_code: string | null
          failure_reason: string | null
          id: string
          kya_tier: number | null
          merchant_domain: string | null
          merchant_id: string | null
          merchant_name: string | null
          protocol: string
          protocol_metadata: Json | null
          success: boolean
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_details?: Json | null
          event_type: string
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          kya_tier?: number | null
          merchant_domain?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          protocol: string
          protocol_metadata?: Json | null
          success?: boolean
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_details?: Json | null
          event_type?: string
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          kya_tier?: number | null
          merchant_domain?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          protocol?: string
          protocol_metadata?: Json | null
          success?: boolean
        }
        Relationships: []
      }
      compliance_flags: {
        Row: {
          account_id: string | null
          ai_analysis: Json | null
          assigned_to_user_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          escalated_at: string | null
          flag_type: string
          id: string
          reason_code: string
          reasons: string[]
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          risk_level: string
          status: string
          tenant_id: string
          transfer_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          ai_analysis?: Json | null
          assigned_to_user_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalated_at?: string | null
          flag_type: string
          id?: string
          reason_code: string
          reasons?: string[]
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          risk_level: string
          status?: string
          tenant_id: string
          transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          ai_analysis?: Json | null
          assigned_to_user_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalated_at?: string | null
          flag_type?: string
          id?: string
          reason_code?: string
          reasons?: string[]
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          risk_level?: string
          status?: string
          tenant_id?: string
          transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_flags_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_flags_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_screenings: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          provider: string
          related_id: string | null
          result: Json
          risk_level: string
          subject: Json
          tenant_id: string
          type: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          provider: string
          related_id?: string | null
          result: Json
          risk_level: string
          subject: Json
          tenant_id: string
          type: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          provider?: string
          related_id?: string | null
          result?: Json
          risk_level?: string
          subject?: Json
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_screenings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          created_at: string | null
          credentials_encrypted: string
          credentials_key_id: string
          error_code: string | null
          error_message: string | null
          handler_name: string
          handler_type: string
          id: string
          last_verified_at: string | null
          metadata: Json | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials_encrypted: string
          credentials_key_id?: string
          error_code?: string | null
          error_message?: string | null
          handler_name: string
          handler_type: string
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials_encrypted?: string
          credentials_key_id?: string
          error_code?: string | null
          error_message?: string | null
          handler_name?: string
          handler_type?: string
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          connected_account_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          connected_account_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          connected_account_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_audit_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connected_accounts_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparty_exposures: {
        Row: {
          active_contracts: number
          active_escrows: number
          agent_id: string | null
          counterparty_address: string | null
          counterparty_agent_id: string | null
          created_at: string
          currency: string
          exposure_24h: number
          exposure_30d: number
          exposure_7d: number
          id: string
          last_24h_reset_at: string
          last_30d_reset_at: string
          last_7d_reset_at: string
          tenant_id: string
          total_volume: number
          transaction_count: number
          updated_at: string
          wallet_id: string
        }
        Insert: {
          active_contracts?: number
          active_escrows?: number
          agent_id?: string | null
          counterparty_address?: string | null
          counterparty_agent_id?: string | null
          created_at?: string
          currency?: string
          exposure_24h?: number
          exposure_30d?: number
          exposure_7d?: number
          id?: string
          last_24h_reset_at?: string
          last_30d_reset_at?: string
          last_7d_reset_at?: string
          tenant_id: string
          total_volume?: number
          transaction_count?: number
          updated_at?: string
          wallet_id: string
        }
        Update: {
          active_contracts?: number
          active_escrows?: number
          agent_id?: string | null
          counterparty_address?: string | null
          counterparty_agent_id?: string | null
          created_at?: string
          currency?: string
          exposure_24h?: number
          exposure_30d?: number
          exposure_7d?: number
          id?: string
          last_24h_reset_at?: string
          last_30d_reset_at?: string
          last_7d_reset_at?: string
          tenant_id?: string
          total_volume?: number
          transaction_count?: number
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_exposures_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparty_exposures_counterparty_agent_id_fkey"
            columns: ["counterparty_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparty_exposures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparty_exposures_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_intelligence: {
        Row: {
          category: string | null
          collected_at: string
          confidence: string
          created_at: string
          description: string | null
          id: string
          metric: string
          period: string | null
          region: string | null
          source: string
          source_url: string | null
          unit: string | null
          value: number
        }
        Insert: {
          category?: string | null
          collected_at?: string
          confidence?: string
          created_at?: string
          description?: string | null
          id?: string
          metric: string
          period?: string | null
          region?: string | null
          source: string
          source_url?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          category?: string | null
          collected_at?: string
          confidence?: string
          created_at?: string
          description?: string | null
          id?: string
          metric?: string
          period?: string | null
          region?: string | null
          source?: string
          source_url?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      disputes: {
        Row: {
          amount_disputed: number
          claimant_account_id: string
          claimant_account_name: string | null
          claimant_evidence: Json | null
          counter_offer: Json | null
          created_at: string | null
          description: string | null
          due_date: string | null
          environment: string
          escalated_at: string | null
          filing_window_days: number | null
          id: string
          reason: string
          refund_id: string | null
          requested_amount: number | null
          requested_resolution: string | null
          resolution: string | null
          resolution_amount: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_id: string | null
          resolved_by_name: string | null
          resolved_by_type: string | null
          respondent_accepted_claim: boolean | null
          respondent_account_id: string
          respondent_account_name: string | null
          respondent_evidence: Json | null
          respondent_response: string | null
          response_window_days: number | null
          status: string
          tenant_id: string
          transfer_id: string
          updated_at: string | null
        }
        Insert: {
          amount_disputed: number
          claimant_account_id: string
          claimant_account_name?: string | null
          claimant_evidence?: Json | null
          counter_offer?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          environment?: string
          escalated_at?: string | null
          filing_window_days?: number | null
          id?: string
          reason: string
          refund_id?: string | null
          requested_amount?: number | null
          requested_resolution?: string | null
          resolution?: string | null
          resolution_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          resolved_by_name?: string | null
          resolved_by_type?: string | null
          respondent_accepted_claim?: boolean | null
          respondent_account_id: string
          respondent_account_name?: string | null
          respondent_evidence?: Json | null
          respondent_response?: string | null
          response_window_days?: number | null
          status?: string
          tenant_id: string
          transfer_id: string
          updated_at?: string | null
        }
        Update: {
          amount_disputed?: number
          claimant_account_id?: string
          claimant_account_name?: string | null
          claimant_evidence?: Json | null
          counter_offer?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          environment?: string
          escalated_at?: string | null
          filing_window_days?: number | null
          id?: string
          reason?: string
          refund_id?: string | null
          requested_amount?: number | null
          requested_resolution?: string | null
          resolution?: string | null
          resolution_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          resolved_by_name?: string | null
          resolved_by_type?: string | null
          respondent_accepted_claim?: boolean | null
          respondent_account_id?: string
          respondent_account_name?: string | null
          respondent_evidence?: Json | null
          respondent_response?: string | null
          response_window_days?: number | null
          status?: string
          tenant_id?: string
          transfer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_claimant_account_id_fkey"
            columns: ["claimant_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_respondent_account_id_fkey"
            columns: ["respondent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          account_id: string | null
          content: Json | null
          created_at: string | null
          expires_at: string | null
          format: string | null
          generated_at: string | null
          generated_by_id: string | null
          generated_by_name: string | null
          generated_by_type: string | null
          id: string
          metadata: Json | null
          name: string
          period_end: string | null
          period_start: string | null
          status: string | null
          storage_path: string | null
          summary: Json | null
          tenant_id: string
          type: string
        }
        Insert: {
          account_id?: string | null
          content?: Json | null
          created_at?: string | null
          expires_at?: string | null
          format?: string | null
          generated_at?: string | null
          generated_by_id?: string | null
          generated_by_name?: string | null
          generated_by_type?: string | null
          id?: string
          metadata?: Json | null
          name: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          storage_path?: string | null
          summary?: Json | null
          tenant_id: string
          type: string
        }
        Update: {
          account_id?: string | null
          content?: Json | null
          created_at?: string | null
          expires_at?: string | null
          format?: string | null
          generated_at?: string | null
          generated_by_id?: string | null
          generated_by_name?: string | null
          generated_by_type?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          storage_path?: string | null
          summary?: Json | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          account_id: string | null
          completed_at: string | null
          corridor: string | null
          created_at: string | null
          currency: string | null
          download_url: string | null
          end_date: string | null
          error_message: string | null
          expires_at: string | null
          export_type: string
          failed_at: string | null
          file_url: string | null
          format: string
          id: string
          include_fees: boolean | null
          include_refunds: boolean | null
          include_streams: boolean | null
          record_count: number | null
          start_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          account_id?: string | null
          completed_at?: string | null
          corridor?: string | null
          created_at?: string | null
          currency?: string | null
          download_url?: string | null
          end_date?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          failed_at?: string | null
          file_url?: string | null
          format: string
          id?: string
          include_fees?: boolean | null
          include_refunds?: boolean | null
          include_streams?: boolean | null
          record_count?: number | null
          start_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          account_id?: string | null
          completed_at?: string | null
          corridor?: string | null
          created_at?: string | null
          currency?: string | null
          download_url?: string | null
          end_date?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          failed_at?: string | null
          file_url?: string | null
          format?: string
          id?: string
          include_fees?: boolean | null
          include_refunds?: boolean | null
          include_streams?: boolean | null
          record_count?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_fee_configs: {
        Row: {
          created_at: string | null
          currency: string
          fee_waiver_active: boolean | null
          fee_waiver_expires_at: string | null
          fixed_fee_cents: number | null
          id: string
          is_active: boolean | null
          max_fee_cents: number | null
          min_fee_cents: number | null
          percentage_fee: number | null
          platform_fixed_fee_cents: number | null
          platform_percentage_fee: number | null
          provider: string
          source_type: Database["public"]["Enums"]["funding_source_type"]
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          fee_waiver_active?: boolean | null
          fee_waiver_expires_at?: string | null
          fixed_fee_cents?: number | null
          id?: string
          is_active?: boolean | null
          max_fee_cents?: number | null
          min_fee_cents?: number | null
          percentage_fee?: number | null
          platform_fixed_fee_cents?: number | null
          platform_percentage_fee?: number | null
          provider: string
          source_type: Database["public"]["Enums"]["funding_source_type"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          fee_waiver_active?: boolean | null
          fee_waiver_expires_at?: string | null
          fixed_fee_cents?: number | null
          id?: string
          is_active?: boolean | null
          max_fee_cents?: number | null
          min_fee_cents?: number | null
          percentage_fee?: number | null
          platform_fixed_fee_cents?: number | null
          platform_percentage_fee?: number | null
          provider?: string
          source_type?: Database["public"]["Enums"]["funding_source_type"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_fee_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_sources: {
        Row: {
          account_id: string
          brand: string | null
          created_at: string | null
          daily_limit_cents: number | null
          daily_reset_at: string | null
          daily_used_cents: number | null
          display_name: string | null
          environment: string
          funding_count: number | null
          id: string
          last_four: string | null
          last_used_at: string | null
          monthly_limit_cents: number | null
          monthly_reset_at: string | null
          monthly_used_cents: number | null
          per_transaction_limit_cents: number | null
          provider: string
          provider_id: string
          provider_metadata: Json | null
          removed_at: string | null
          status: Database["public"]["Enums"]["funding_source_status"]
          supported_currencies: string[] | null
          tenant_id: string
          total_funded_cents: number | null
          type: Database["public"]["Enums"]["funding_source_type"]
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          account_id: string
          brand?: string | null
          created_at?: string | null
          daily_limit_cents?: number | null
          daily_reset_at?: string | null
          daily_used_cents?: number | null
          display_name?: string | null
          environment?: string
          funding_count?: number | null
          id?: string
          last_four?: string | null
          last_used_at?: string | null
          monthly_limit_cents?: number | null
          monthly_reset_at?: string | null
          monthly_used_cents?: number | null
          per_transaction_limit_cents?: number | null
          provider: string
          provider_id: string
          provider_metadata?: Json | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["funding_source_status"]
          supported_currencies?: string[] | null
          tenant_id: string
          total_funded_cents?: number | null
          type: Database["public"]["Enums"]["funding_source_type"]
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          account_id?: string
          brand?: string | null
          created_at?: string | null
          daily_limit_cents?: number | null
          daily_reset_at?: string | null
          daily_used_cents?: number | null
          display_name?: string | null
          environment?: string
          funding_count?: number | null
          id?: string
          last_four?: string | null
          last_used_at?: string | null
          monthly_limit_cents?: number | null
          monthly_reset_at?: string | null
          monthly_used_cents?: number | null
          per_transaction_limit_cents?: number | null
          provider?: string
          provider_id?: string
          provider_metadata?: Json | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["funding_source_status"]
          supported_currencies?: string[] | null
          tenant_id?: string
          total_funded_cents?: number | null
          type?: Database["public"]["Enums"]["funding_source_type"]
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_sources_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_transactions: {
        Row: {
          account_id: string
          amount_cents: number
          completed_at: string | null
          conversion_currency: string | null
          conversion_fee_cents: number | null
          converted_amount_cents: number | null
          created_at: string | null
          currency: string
          environment: string
          exchange_rate: number | null
          failed_at: string | null
          failure_reason: string | null
          funding_source_id: string | null
          id: string
          idempotency_key: string | null
          initiated_at: string | null
          platform_fee_cents: number | null
          processing_at: string | null
          provider: string
          provider_fee_cents: number | null
          provider_metadata: Json | null
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["funding_transaction_status"]
          tenant_id: string
          total_fee_cents: number | null
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          account_id: string
          amount_cents: number
          completed_at?: string | null
          conversion_currency?: string | null
          conversion_fee_cents?: number | null
          converted_amount_cents?: number | null
          created_at?: string | null
          currency: string
          environment?: string
          exchange_rate?: number | null
          failed_at?: string | null
          failure_reason?: string | null
          funding_source_id?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string | null
          platform_fee_cents?: number | null
          processing_at?: string | null
          provider: string
          provider_fee_cents?: number | null
          provider_metadata?: Json | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["funding_transaction_status"]
          tenant_id: string
          total_fee_cents?: number | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          account_id?: string
          amount_cents?: number
          completed_at?: string | null
          conversion_currency?: string | null
          conversion_fee_cents?: number | null
          converted_amount_cents?: number | null
          created_at?: string | null
          currency?: string
          environment?: string
          exchange_rate?: number | null
          failed_at?: string | null
          failure_reason?: string | null
          funding_source_id?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string | null
          platform_fee_cents?: number | null
          processing_at?: string | null
          provider?: string
          provider_fee_cents?: number | null
          provider_metadata?: Json | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["funding_transaction_status"]
          tenant_id?: string
          total_fee_cents?: number | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_transactions_funding_source_id_fkey"
            columns: ["funding_source_id"]
            isOneToOne: false
            referencedRelation: "funding_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      handler_payment_instruments: {
        Row: {
          brand: string | null
          checkout_id: string | null
          created_at: string | null
          data: Json | null
          expires_at: string | null
          handler_id: string
          id: string
          last4: string | null
          reusable: boolean | null
          status: string
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          checkout_id?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          handler_id: string
          id: string
          last4?: string | null
          reusable?: boolean | null
          status?: string
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          checkout_id?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          handler_id?: string
          id?: string
          last4?: string | null
          reusable?: boolean | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handler_payment_instruments_handler_id_fkey"
            columns: ["handler_id"]
            isOneToOne: false
            referencedRelation: "payment_handlers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handler_payment_instruments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      handler_payments: {
        Row: {
          amount: number
          checkout_id: string | null
          created_at: string | null
          currency: string
          environment: string
          external_id: string | null
          failure_reason: string | null
          handler_id: string
          id: string
          idempotency_key: string | null
          instrument_id: string | null
          metadata: Json | null
          refunded_amount: number | null
          settlement_id: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          created_at?: string | null
          currency: string
          environment?: string
          external_id?: string | null
          failure_reason?: string | null
          handler_id: string
          id: string
          idempotency_key?: string | null
          instrument_id?: string | null
          metadata?: Json | null
          refunded_amount?: number | null
          settlement_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          created_at?: string | null
          currency?: string
          environment?: string
          external_id?: string | null
          failure_reason?: string | null
          handler_id?: string
          id?: string
          idempotency_key?: string | null
          instrument_id?: string | null
          metadata?: Json | null
          refunded_amount?: number | null
          settlement_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handler_payments_handler_id_fkey"
            columns: ["handler_id"]
            isOneToOne: false
            referencedRelation: "payment_handlers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handler_payments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "handler_payment_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handler_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          idempotency_key: string
          request_hash: string
          request_method: string
          request_path: string
          response_body: Json
          response_headers: Json | null
          response_status: number
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          idempotency_key: string
          request_hash: string
          request_method: string
          request_path: string
          response_body: Json
          response_headers?: Json | null
          response_status: number
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string
          request_method?: string
          request_path?: string
          response_body?: Json
          response_headers?: Json | null
          response_status?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kya_agent_observations: {
        Row: {
          agent_id: string
          avg_tx_amount: number | null
          created_at: string | null
          error_count: number | null
          id: string
          max_tx_amount: number | null
          observation_date: string
          protocols_used: string[] | null
          scope_violations: number | null
          tenant_id: string
          tx_count: number | null
          tx_volume: number | null
          unique_counterparties: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          avg_tx_amount?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          max_tx_amount?: number | null
          observation_date: string
          protocols_used?: string[] | null
          scope_violations?: number | null
          tenant_id: string
          tx_count?: number | null
          tx_volume?: number | null
          unique_counterparties?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          avg_tx_amount?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          max_tx_amount?: number | null
          observation_date?: string
          protocols_used?: string[] | null
          scope_violations?: number | null
          tenant_id?: string
          tx_count?: number | null
          tx_volume?: number | null
          unique_counterparties?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kya_tier_limits: {
        Row: {
          created_at: string | null
          daily: number
          description: string | null
          id: string
          max_active_streams: number | null
          max_flow_rate_per_stream: number | null
          max_total_outflow: number | null
          monthly: number
          per_transaction: number
          tenant_id: string | null
          tier: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily: number
          description?: string | null
          id?: string
          max_active_streams?: number | null
          max_flow_rate_per_stream?: number | null
          max_total_outflow?: number | null
          monthly: number
          per_transaction: number
          tenant_id?: string | null
          tier: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily?: number
          description?: string | null
          id?: string
          max_active_streams?: number | null
          max_flow_rate_per_stream?: number | null
          max_total_outflow?: number | null
          monthly?: number
          per_transaction?: number
          tenant_id?: string | null
          tier?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kya_tier_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          created_at: string | null
          currency: string | null
          description: string | null
          environment: string
          id: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          environment?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          environment?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      limit_increase_requests: {
        Row: {
          agent_id: string
          created_at: string
          current_limit: number
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          duration: string
          expires_at: string | null
          id: string
          limit_type: string
          reason: string
          requested_amount: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          current_limit: number
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          duration?: string
          expires_at?: string | null
          id?: string
          limit_type: string
          reason: string
          requested_amount: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          current_limit?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          duration?: string
          expires_at?: string | null
          id?: string
          limit_type?: string
          reason?: string
          requested_amount?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "limit_increase_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limit_increase_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limit_increase_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_ratings: {
        Row: {
          checkout_id: string | null
          checkout_protocol: string | null
          comment: string | null
          created_at: string
          error_clarity: number | null
          fulfillment: number | null
          id: string
          merchant_account_id: string
          navigation: number | null
          price_accuracy: number | null
          rater_agent_id: string
          response_speed: number | null
          tenant_id: string
        }
        Insert: {
          checkout_id?: string | null
          checkout_protocol?: string | null
          comment?: string | null
          created_at?: string
          error_clarity?: number | null
          fulfillment?: number | null
          id?: string
          merchant_account_id: string
          navigation?: number | null
          price_accuracy?: number | null
          rater_agent_id: string
          response_speed?: number | null
          tenant_id: string
        }
        Update: {
          checkout_id?: string | null
          checkout_protocol?: string | null
          comment?: string | null
          created_at?: string
          error_clarity?: number | null
          fulfillment?: number | null
          id?: string
          merchant_account_id?: string
          navigation?: number | null
          price_accuracy?: number | null
          rater_agent_id?: string
          response_speed?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_ratings_merchant_account_id_fkey"
            columns: ["merchant_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_ratings_rater_agent_id_fkey"
            columns: ["rater_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_scans: {
        Row: {
          accessibility_score: number
          business_model: string | null
          checkout_score: number
          country_code: string | null
          created_at: string
          data_score: number
          domain: string
          error_message: string | null
          id: string
          last_scanned_at: string | null
          merchant_category: string | null
          merchant_name: string | null
          protocol_score: number
          readiness_score: number
          region: string | null
          scan_duration_ms: number | null
          scan_status: string
          scan_version: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          accessibility_score?: number
          business_model?: string | null
          checkout_score?: number
          country_code?: string | null
          created_at?: string
          data_score?: number
          domain: string
          error_message?: string | null
          id?: string
          last_scanned_at?: string | null
          merchant_category?: string | null
          merchant_name?: string | null
          protocol_score?: number
          readiness_score?: number
          region?: string | null
          scan_duration_ms?: number | null
          scan_status?: string
          scan_version?: string
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          accessibility_score?: number
          business_model?: string | null
          checkout_score?: number
          country_code?: string | null
          created_at?: string
          data_score?: number
          domain?: string
          error_message?: string | null
          id?: string
          last_scanned_at?: string | null
          merchant_category?: string | null
          merchant_name?: string | null
          protocol_score?: number
          readiness_score?: number
          region?: string | null
          scan_duration_ms?: number | null
          scan_status?: string
          scan_version?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_scans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mpp_sessions: {
        Row: {
          agent_id: string
          closed_at: string | null
          created_at: string
          deposit_amount: number
          environment: string
          id: string
          last_voucher_at: string | null
          max_budget: number | null
          metadata: Json | null
          mpp_session_id: string | null
          opened_at: string
          service_url: string
          spent_amount: number
          status: string
          tenant_id: string
          updated_at: string
          voucher_count: number
          wallet_id: string
        }
        Insert: {
          agent_id: string
          closed_at?: string | null
          created_at?: string
          deposit_amount?: number
          environment?: string
          id?: string
          last_voucher_at?: string | null
          max_budget?: number | null
          metadata?: Json | null
          mpp_session_id?: string | null
          opened_at?: string
          service_url: string
          spent_amount?: number
          status?: string
          tenant_id: string
          updated_at?: string
          voucher_count?: number
          wallet_id: string
        }
        Update: {
          agent_id?: string
          closed_at?: string | null
          created_at?: string
          deposit_amount?: number
          environment?: string
          id?: string
          last_voucher_at?: string | null
          max_budget?: number | null
          metadata?: Json | null
          mpp_session_id?: string | null
          opened_at?: string
          service_url?: string
          spent_amount?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          voucher_count?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpp_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          amount_usd: number | null
          category: string
          correlation_id: string | null
          currency: string | null
          data: Json | null
          duration_ms: number | null
          external_cost_usd: number | null
          id: string | null
          operation: string
          protocol: string | null
          source: string
          specversion: string
          subject: string
          success: boolean
          tenant_id: string
          time: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          amount_usd?: number | null
          category: string
          correlation_id?: string | null
          currency?: string | null
          data?: Json | null
          duration_ms?: number | null
          external_cost_usd?: number | null
          id?: string | null
          operation: string
          protocol?: string | null
          source?: string
          specversion?: string
          subject: string
          success?: boolean
          tenant_id: string
          time?: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          amount_usd?: number | null
          category?: string
          correlation_id?: string | null
          currency?: string | null
          data?: Json | null
          duration_ms?: number | null
          external_cost_usd?: number | null
          id?: string | null
          operation?: string
          protocol?: string | null
          source?: string
          specversion?: string
          subject?: string
          success?: boolean
          tenant_id?: string
          time?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_events_2026_03: {
        Row: {
          actor_id: string | null
          actor_type: string
          amount_usd: number | null
          category: string
          correlation_id: string | null
          currency: string | null
          data: Json | null
          duration_ms: number | null
          external_cost_usd: number | null
          id: string | null
          operation: string
          protocol: string | null
          source: string
          specversion: string
          subject: string
          success: boolean
          tenant_id: string
          time: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          amount_usd?: number | null
          category: string
          correlation_id?: string | null
          currency?: string | null
          data?: Json | null
          duration_ms?: number | null
          external_cost_usd?: number | null
          id?: string | null
          operation: string
          protocol?: string | null
          source?: string
          specversion?: string
          subject: string
          success?: boolean
          tenant_id: string
          time?: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          amount_usd?: number | null
          category?: string
          correlation_id?: string | null
          currency?: string | null
          data?: Json | null
          duration_ms?: number | null
          external_cost_usd?: number | null
          id?: string | null
          operation?: string
          protocol?: string | null
          source?: string
          specversion?: string
          subject?: string
          success?: boolean
          tenant_id?: string
          time?: string
          type?: string
        }
        Relationships: []
      }
      operation_events_2026_04: {
        Row: {
          actor_id: string | null
          actor_type: string
          amount_usd: number | null
          category: string
          correlation_id: string | null
          currency: string | null
          data: Json | null
          duration_ms: number | null
          external_cost_usd: number | null
          id: string | null
          operation: string
          protocol: string | null
          source: string
          specversion: string
          subject: string
          success: boolean
          tenant_id: string
          time: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          amount_usd?: number | null
          category: string
          correlation_id?: string | null
          currency?: string | null
          data?: Json | null
          duration_ms?: number | null
          external_cost_usd?: number | null
          id?: string | null
          operation: string
          protocol?: string | null
          source?: string
          specversion?: string
          subject: string
          success?: boolean
          tenant_id: string
          time?: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          amount_usd?: number | null
          category?: string
          correlation_id?: string | null
          currency?: string | null
          data?: Json | null
          duration_ms?: number | null
          external_cost_usd?: number | null
          id?: string | null
          operation?: string
          protocol?: string | null
          source?: string
          specversion?: string
          subject?: string
          success?: boolean
          tenant_id?: string
          time?: string
          type?: string
        }
        Relationships: []
      }
      payment_handlers: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          id_prefix: string
          integration_mode: string
          metadata: Json | null
          name: string
          profile_metadata: Json
          status: string
          supported_currencies: string[]
          supported_types: string[]
          tenant_id: string | null
          updated_at: string | null
          validation_config: Json | null
          version: string
          webhook_config: Json | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id: string
          id_prefix?: string
          integration_mode?: string
          metadata?: Json | null
          name: string
          profile_metadata?: Json
          status?: string
          supported_currencies: string[]
          supported_types: string[]
          tenant_id?: string | null
          updated_at?: string | null
          validation_config?: Json | null
          version: string
          webhook_config?: Json | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          id_prefix?: string
          integration_mode?: string
          metadata?: Json | null
          name?: string
          profile_metadata?: Json
          status?: string
          supported_currencies?: string[]
          supported_types?: string[]
          tenant_id?: string | null
          updated_at?: string | null
          validation_config?: Json | null
          version?: string
          webhook_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_handlers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          authorized_at: string | null
          batch_id: string | null
          batched_at: string | null
          created_at: string
          currency: string
          destination_account_id: string
          destination_tenant_id: string | null
          destination_wallet_id: string
          environment: string
          id: string
          nonce: string | null
          protocol: string | null
          protocol_metadata: Json | null
          settled_at: string | null
          settled_transfer_id: string | null
          source_account_id: string
          source_wallet_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          authorized_at?: string | null
          batch_id?: string | null
          batched_at?: string | null
          created_at?: string
          currency?: string
          destination_account_id: string
          destination_tenant_id?: string | null
          destination_wallet_id: string
          environment?: string
          id?: string
          nonce?: string | null
          protocol?: string | null
          protocol_metadata?: Json | null
          settled_at?: string | null
          settled_transfer_id?: string | null
          source_account_id: string
          source_wallet_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          authorized_at?: string | null
          batch_id?: string | null
          batched_at?: string | null
          created_at?: string
          currency?: string
          destination_account_id?: string
          destination_tenant_id?: string | null
          destination_wallet_id?: string
          environment?: string
          id?: string
          nonce?: string | null
          protocol?: string | null
          protocol_metadata?: Json | null
          settled_at?: string | null
          settled_transfer_id?: string | null
          source_account_id?: string
          source_wallet_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_destination_wallet_id_fkey"
            columns: ["destination_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_source_wallet_id_fkey"
            columns: ["source_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_id: string
          bank_account_holder: string | null
          bank_account_last_four: string | null
          bank_country: string | null
          bank_currency: string | null
          bank_name: string | null
          bank_routing_last_four: string | null
          card_id: string | null
          card_last_four: string | null
          created_at: string | null
          environment: string
          frozen_at: string | null
          frozen_reason: string | null
          id: string
          is_default: boolean | null
          is_frozen: boolean
          is_verified: boolean | null
          label: string | null
          metadata: Json | null
          spending_limit_daily: number | null
          spending_limit_monthly: number | null
          spending_limit_per_transaction: number | null
          spending_period_start_daily: string | null
          spending_period_start_monthly: string | null
          spending_used_daily: number
          spending_used_monthly: number
          tenant_id: string
          type: string
          updated_at: string | null
          verified_at: string | null
          wallet_address: string | null
          wallet_network: string | null
        }
        Insert: {
          account_id: string
          bank_account_holder?: string | null
          bank_account_last_four?: string | null
          bank_country?: string | null
          bank_currency?: string | null
          bank_name?: string | null
          bank_routing_last_four?: string | null
          card_id?: string | null
          card_last_four?: string | null
          created_at?: string | null
          environment?: string
          frozen_at?: string | null
          frozen_reason?: string | null
          id?: string
          is_default?: boolean | null
          is_frozen?: boolean
          is_verified?: boolean | null
          label?: string | null
          metadata?: Json | null
          spending_limit_daily?: number | null
          spending_limit_monthly?: number | null
          spending_limit_per_transaction?: number | null
          spending_period_start_daily?: string | null
          spending_period_start_monthly?: string | null
          spending_used_daily?: number
          spending_used_monthly?: number
          tenant_id: string
          type: string
          updated_at?: string | null
          verified_at?: string | null
          wallet_address?: string | null
          wallet_network?: string | null
        }
        Update: {
          account_id?: string
          bank_account_holder?: string | null
          bank_account_last_four?: string | null
          bank_country?: string | null
          bank_currency?: string | null
          bank_name?: string | null
          bank_routing_last_four?: string | null
          card_id?: string | null
          card_last_four?: string | null
          created_at?: string | null
          environment?: string
          frozen_at?: string | null
          frozen_reason?: string | null
          id?: string
          is_default?: boolean | null
          is_frozen?: boolean
          is_verified?: boolean | null
          label?: string | null
          metadata?: Json | null
          spending_limit_daily?: number | null
          spending_limit_monthly?: number | null
          spending_limit_per_transaction?: number | null
          spending_period_start_daily?: string | null
          spending_period_start_monthly?: string | null
          spending_used_daily?: number
          spending_used_monthly?: number
          tenant_id?: string
          type?: string
          updated_at?: string | null
          verified_at?: string | null
          wallet_address?: string | null
          wallet_network?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_evaluations: {
        Row: {
          action_type: string
          agent_id: string | null
          amount: number | null
          approval_id: string | null
          checks_performed: Json
          contract_type: string | null
          correlation_id: string | null
          counterparty_address: string | null
          counterparty_agent_id: string | null
          created_at: string
          currency: string | null
          decision: string
          decision_reasons: Json
          evaluation_ms: number | null
          id: string
          protocol: string | null
          suggested_counter_offer: Json | null
          tenant_id: string
          wallet_id: string
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          amount?: number | null
          approval_id?: string | null
          checks_performed?: Json
          contract_type?: string | null
          correlation_id?: string | null
          counterparty_address?: string | null
          counterparty_agent_id?: string | null
          created_at?: string
          currency?: string | null
          decision: string
          decision_reasons?: Json
          evaluation_ms?: number | null
          id?: string
          protocol?: string | null
          suggested_counter_offer?: Json | null
          tenant_id: string
          wallet_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          amount?: number | null
          approval_id?: string | null
          checks_performed?: Json
          contract_type?: string | null
          correlation_id?: string | null
          counterparty_address?: string | null
          counterparty_agent_id?: string | null
          created_at?: string
          currency?: string | null
          decision?: string
          decision_reasons?: Json
          evaluation_ms?: number | null
          id?: string
          protocol?: string | null
          suggested_counter_offer?: Json | null
          tenant_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_evaluations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_counterparty_agent_id_fkey"
            columns: ["counterparty_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          scopes: string[]
          status: string
          tenant_id: string
          token_hash: string
          token_prefix: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          scopes?: string[]
          status?: string
          tenant_id: string
          token_hash: string
          token_prefix: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          status?: string
          tenant_id?: string
          token_hash?: string
          token_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          corridor_id: string | null
          created_at: string | null
          environment: string
          expires_at: string
          fee_amount: number | null
          fee_breakdown: Json | null
          from_amount: number
          from_currency: string
          fx_rate: number
          id: string
          tenant_id: string
          to_amount: number
          to_currency: string
          transfer_id: string | null
          used_at: string | null
        }
        Insert: {
          corridor_id?: string | null
          created_at?: string | null
          environment?: string
          expires_at: string
          fee_amount?: number | null
          fee_breakdown?: Json | null
          from_amount: number
          from_currency: string
          fx_rate: number
          id?: string
          tenant_id: string
          to_amount: number
          to_currency: string
          transfer_id?: string | null
          used_at?: string | null
        }
        Update: {
          corridor_id?: string | null
          created_at?: string | null
          environment?: string
          expires_at?: string
          fee_amount?: number | null
          fee_breakdown?: Json | null
          from_amount?: number
          from_currency?: string
          fx_rate?: number
          id?: string
          tenant_id?: string
          to_amount?: number
          to_currency?: string
          transfer_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_config: {
        Row: {
          alert_email: string | null
          alert_on_discrepancy: boolean | null
          alert_severity_threshold: string | null
          alert_webhook_url: string | null
          amount_tolerance_fixed: number | null
          amount_tolerance_percent: number | null
          auto_resolve_enabled: boolean | null
          auto_resolve_max_amount: number | null
          created_at: string | null
          discrepancy_retention_days: number | null
          enabled: boolean | null
          id: string
          metadata: Json | null
          rail: string | null
          report_retention_days: number | null
          schedule_cron: string | null
          tenant_id: string | null
          timing_tolerance_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          alert_email?: string | null
          alert_on_discrepancy?: boolean | null
          alert_severity_threshold?: string | null
          alert_webhook_url?: string | null
          amount_tolerance_fixed?: number | null
          amount_tolerance_percent?: number | null
          auto_resolve_enabled?: boolean | null
          auto_resolve_max_amount?: number | null
          created_at?: string | null
          discrepancy_retention_days?: number | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          rail?: string | null
          report_retention_days?: number | null
          schedule_cron?: string | null
          tenant_id?: string | null
          timing_tolerance_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_email?: string | null
          alert_on_discrepancy?: boolean | null
          alert_severity_threshold?: string | null
          alert_webhook_url?: string | null
          amount_tolerance_fixed?: number | null
          amount_tolerance_percent?: number | null
          auto_resolve_enabled?: boolean | null
          auto_resolve_max_amount?: number | null
          created_at?: string | null
          discrepancy_retention_days?: number | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          rail?: string | null
          report_retention_days?: number | null
          schedule_cron?: string | null
          tenant_id?: string | null
          timing_tolerance_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_discrepancies: {
        Row: {
          actual_amount: number | null
          actual_status: string | null
          auto_resolution_attempted: boolean | null
          auto_resolution_result: string | null
          created_at: string | null
          description: string
          detected_at: string | null
          expected_amount: number | null
          expected_status: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          rail: string
          report_id: string | null
          resolution: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          settlement_record_id: string | null
          severity: string
          status: string
          tenant_id: string | null
          transfer_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          actual_amount?: number | null
          actual_status?: string | null
          auto_resolution_attempted?: boolean | null
          auto_resolution_result?: string | null
          created_at?: string | null
          description: string
          detected_at?: string | null
          expected_amount?: number | null
          expected_status?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          rail: string
          report_id?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          settlement_record_id?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          transfer_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          actual_amount?: number | null
          actual_status?: string | null
          auto_resolution_attempted?: boolean | null
          auto_resolution_result?: string | null
          created_at?: string | null
          description?: string
          detected_at?: string | null
          expected_amount?: number | null
          expected_status?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          rail?: string
          report_id?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          settlement_record_id?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          transfer_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_discrepancies_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_discrepancies_settlement_record_id_fkey"
            columns: ["settlement_record_id"]
            isOneToOne: false
            referencedRelation: "settlement_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_discrepancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_discrepancies_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_reports: {
        Row: {
          amount_difference: number | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          discrepancies_by_severity: Json | null
          discrepancies_by_type: Json | null
          discrepancy_count: number | null
          duration_ms: number | null
          error_message: string | null
          id: string
          matched_transactions: number | null
          period_end: string
          period_start: string
          rail: string
          report_type: string
          results: Json | null
          started_at: string | null
          status: string
          tenant_id: string | null
          total_actual_amount: number | null
          total_expected_amount: number | null
          total_transactions: number | null
          updated_at: string | null
        }
        Insert: {
          amount_difference?: number | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          discrepancies_by_severity?: Json | null
          discrepancies_by_type?: Json | null
          discrepancy_count?: number | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          matched_transactions?: number | null
          period_end: string
          period_start: string
          rail: string
          report_type?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          total_actual_amount?: number | null
          total_expected_amount?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_difference?: number | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          discrepancies_by_severity?: Json | null
          discrepancies_by_type?: Json | null
          discrepancy_count?: number | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          matched_transactions?: number | null
          period_end?: string
          period_start?: string
          rail?: string
          report_type?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          total_actual_amount?: number | null
          total_expected_amount?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string
          environment: string
          failed_at: string | null
          failure_reason: string | null
          from_account_id: string
          id: string
          idempotency_key: string | null
          network: string | null
          original_transfer_id: string
          reason: string
          reason_details: string | null
          status: string
          tenant_id: string
          to_account_id: string
          tx_hash: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          environment?: string
          failed_at?: string | null
          failure_reason?: string | null
          from_account_id: string
          id?: string
          idempotency_key?: string | null
          network?: string | null
          original_transfer_id: string
          reason: string
          reason_details?: string | null
          status?: string
          tenant_id: string
          to_account_id: string
          tx_hash?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          environment?: string
          failed_at?: string | null
          failure_reason?: string | null
          from_account_id?: string
          id?: string
          idempotency_key?: string | null
          network?: string | null
          original_transfer_id?: string
          reason?: string
          reason_details?: string | null
          status?: string
          tenant_id?: string
          to_account_id?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_original_transfer_id_fkey"
            columns: ["original_transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_queries: {
        Row: {
          cache_hit: boolean
          created_at: string
          error: string | null
          id: string
          identifier: string
          latency_ms: number | null
          source_type: string
        }
        Insert: {
          cache_hit?: boolean
          created_at?: string
          error?: string | null
          id?: string
          identifier: string
          latency_ms?: number | null
          source_type: string
        }
        Update: {
          cache_hit?: boolean
          created_at?: string
          error?: string | null
          id?: string
          identifier?: string
          latency_ms?: number | null
          source_type?: string
        }
        Relationships: []
      }
      reputation_scores: {
        Row: {
          agent_id: string | null
          confidence: string | null
          created_at: string
          data_points: number
          dimensions: Json
          external_identifier: string | null
          id: string
          last_refreshed: string
          source_data: Json
          unified_score: number | null
          unified_tier: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          confidence?: string | null
          created_at?: string
          data_points?: number
          dimensions?: Json
          external_identifier?: string | null
          id?: string
          last_refreshed?: string
          source_data?: Json
          unified_score?: number | null
          unified_tier?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          confidence?: string | null
          created_at?: string
          data_points?: number
          dimensions?: Json
          external_identifier?: string | null
          id?: string
          last_refreshed?: string
          source_data?: Json
          unified_score?: number | null
          unified_tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_scores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_source_configs: {
        Row: {
          api_endpoint: string | null
          created_at: string
          enabled: boolean
          id: string
          refresh_interval_secs: number | null
          source_type: string
          tenant_id: string
          weight_override: number | null
        }
        Insert: {
          api_endpoint?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          refresh_interval_secs?: number | null
          source_type: string
          tenant_id: string
          weight_override?: number | null
        }
        Update: {
          api_endpoint?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          refresh_interval_secs?: number | null
          source_type?: string
          tenant_id?: string
          weight_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reputation_source_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      run_logs: {
        Row: {
          batch_number: number | null
          created_at: string
          id: string
          level: string
          message: string
          metadata_json: Json | null
          object_name: string | null
          phase: string | null
          records_failed: number | null
          records_processed: number | null
          records_succeeded: number | null
          run_id: string
        }
        Insert: {
          batch_number?: number | null
          created_at?: string
          id?: string
          level: string
          message: string
          metadata_json?: Json | null
          object_name?: string | null
          phase?: string | null
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
          run_id: string
        }
        Update: {
          batch_number?: number | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata_json?: Json | null
          object_name?: string | null
          phase?: string | null
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
          run_id?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_summary_json: Json | null
          id: string
          progress_json: Json | null
          records_failed: number | null
          records_succeeded: number | null
          records_total: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_summary_json?: Json | null
          id: string
          progress_json?: Json | null
          records_failed?: number | null
          records_succeeded?: number | null
          records_total?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_summary_json?: Json | null
          id?: string
          progress_json?: Json | null
          records_failed?: number | null
          records_succeeded?: number | null
          records_total?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      scan_accessibility: {
        Row: {
          checkout_steps_count: number | null
          created_at: string
          ecommerce_platform: string | null
          guest_checkout_available: boolean | null
          has_captcha: boolean | null
          homepage_accessible: boolean | null
          id: string
          merchant_scan_id: string
          payment_processors: Json | null
          platform_version: string | null
          requires_account: boolean | null
          requires_javascript: boolean | null
          robots_allows_agents: boolean | null
          robots_blocks_all_bots: boolean | null
          robots_blocks_claudebot: boolean | null
          robots_blocks_googlebot: boolean | null
          robots_blocks_gptbot: boolean | null
          robots_raw: string | null
          robots_txt_exists: boolean
          supports_crypto: boolean | null
          supports_digital_wallets: boolean | null
          supports_pix: boolean | null
          supports_spei: boolean | null
        }
        Insert: {
          checkout_steps_count?: number | null
          created_at?: string
          ecommerce_platform?: string | null
          guest_checkout_available?: boolean | null
          has_captcha?: boolean | null
          homepage_accessible?: boolean | null
          id?: string
          merchant_scan_id: string
          payment_processors?: Json | null
          platform_version?: string | null
          requires_account?: boolean | null
          requires_javascript?: boolean | null
          robots_allows_agents?: boolean | null
          robots_blocks_all_bots?: boolean | null
          robots_blocks_claudebot?: boolean | null
          robots_blocks_googlebot?: boolean | null
          robots_blocks_gptbot?: boolean | null
          robots_raw?: string | null
          robots_txt_exists?: boolean
          supports_crypto?: boolean | null
          supports_digital_wallets?: boolean | null
          supports_pix?: boolean | null
          supports_spei?: boolean | null
        }
        Update: {
          checkout_steps_count?: number | null
          created_at?: string
          ecommerce_platform?: string | null
          guest_checkout_available?: boolean | null
          has_captcha?: boolean | null
          homepage_accessible?: boolean | null
          id?: string
          merchant_scan_id?: string
          payment_processors?: Json | null
          platform_version?: string | null
          requires_account?: boolean | null
          requires_javascript?: boolean | null
          robots_allows_agents?: boolean | null
          robots_blocks_all_bots?: boolean | null
          robots_blocks_claudebot?: boolean | null
          robots_blocks_googlebot?: boolean | null
          robots_blocks_gptbot?: boolean | null
          robots_raw?: string | null
          robots_txt_exists?: boolean
          supports_crypto?: boolean | null
          supports_digital_wallets?: boolean | null
          supports_pix?: boolean | null
          supports_spei?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_accessibility_merchant_scan_id_fkey"
            columns: ["merchant_scan_id"]
            isOneToOne: false
            referencedRelation: "merchant_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_batches: {
        Row: {
          batch_type: string
          completed_at: string | null
          completed_targets: number
          created_at: string
          description: string | null
          failed_targets: number
          id: string
          name: string
          scan_config: Json | null
          started_at: string | null
          status: string
          target_domains: Json
          tenant_id: string
          total_targets: number
          updated_at: string
        }
        Insert: {
          batch_type?: string
          completed_at?: string | null
          completed_targets?: number
          created_at?: string
          description?: string | null
          failed_targets?: number
          id?: string
          name: string
          scan_config?: Json | null
          started_at?: string | null
          status?: string
          target_domains?: Json
          tenant_id: string
          total_targets?: number
          updated_at?: string
        }
        Update: {
          batch_type?: string
          completed_at?: string | null
          completed_targets?: number
          created_at?: string
          description?: string | null
          failed_targets?: number
          id?: string
          name?: string
          scan_config?: Json | null
          started_at?: string | null
          status?: string
          target_domains?: Json
          tenant_id?: string
          total_targets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_protocol_results: {
        Row: {
          capabilities: Json | null
          confidence: string | null
          created_at: string
          detected: boolean
          detection_method: string | null
          eligibility_signals: Json | null
          endpoint_url: string | null
          id: string
          is_functional: boolean | null
          last_verified_at: string | null
          merchant_scan_id: string
          protocol: string
          response_time_ms: number | null
          status: string | null
        }
        Insert: {
          capabilities?: Json | null
          confidence?: string | null
          created_at?: string
          detected?: boolean
          detection_method?: string | null
          eligibility_signals?: Json | null
          endpoint_url?: string | null
          id?: string
          is_functional?: boolean | null
          last_verified_at?: string | null
          merchant_scan_id: string
          protocol: string
          response_time_ms?: number | null
          status?: string | null
        }
        Update: {
          capabilities?: Json | null
          confidence?: string | null
          created_at?: string
          detected?: boolean
          detection_method?: string | null
          eligibility_signals?: Json | null
          endpoint_url?: string | null
          id?: string
          is_functional?: boolean | null
          last_verified_at?: string | null
          merchant_scan_id?: string
          protocol?: string
          response_time_ms?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_protocol_results_merchant_scan_id_fkey"
            columns: ["merchant_scan_id"]
            isOneToOne: false
            referencedRelation: "merchant_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_snapshots: {
        Row: {
          acp_adoption_rate: number | null
          agent_blocking_rate: number | null
          any_protocol_adoption_rate: number | null
          ap2_adoption_rate: number | null
          avg_data_score: number | null
          avg_protocol_score: number | null
          avg_readiness_score: number | null
          captcha_rate: number | null
          created_at: string
          guest_checkout_rate: number | null
          id: string
          json_ld_adoption_rate: number | null
          mcp_adoption_rate: number | null
          schema_org_adoption_rate: number | null
          scores_by_category: Json | null
          scores_by_platform: Json | null
          scores_by_region: Json | null
          snapshot_date: string
          snapshot_period: string
          total_merchants_scanned: number
          ucp_adoption_rate: number | null
          x402_adoption_rate: number | null
        }
        Insert: {
          acp_adoption_rate?: number | null
          agent_blocking_rate?: number | null
          any_protocol_adoption_rate?: number | null
          ap2_adoption_rate?: number | null
          avg_data_score?: number | null
          avg_protocol_score?: number | null
          avg_readiness_score?: number | null
          captcha_rate?: number | null
          created_at?: string
          guest_checkout_rate?: number | null
          id?: string
          json_ld_adoption_rate?: number | null
          mcp_adoption_rate?: number | null
          schema_org_adoption_rate?: number | null
          scores_by_category?: Json | null
          scores_by_platform?: Json | null
          scores_by_region?: Json | null
          snapshot_date: string
          snapshot_period?: string
          total_merchants_scanned?: number
          ucp_adoption_rate?: number | null
          x402_adoption_rate?: number | null
        }
        Update: {
          acp_adoption_rate?: number | null
          agent_blocking_rate?: number | null
          any_protocol_adoption_rate?: number | null
          ap2_adoption_rate?: number | null
          avg_data_score?: number | null
          avg_protocol_score?: number | null
          avg_readiness_score?: number | null
          captcha_rate?: number | null
          created_at?: string
          guest_checkout_rate?: number | null
          id?: string
          json_ld_adoption_rate?: number | null
          mcp_adoption_rate?: number | null
          schema_org_adoption_rate?: number | null
          scores_by_category?: Json | null
          scores_by_platform?: Json | null
          scores_by_region?: Json | null
          snapshot_date?: string
          snapshot_period?: string
          total_merchants_scanned?: number
          ucp_adoption_rate?: number | null
          x402_adoption_rate?: number | null
        }
        Relationships: []
      }
      scan_structured_data: {
        Row: {
          created_at: string
          data_quality_score: number
          has_json_ld: boolean
          has_microdata: boolean
          has_open_graph: boolean
          has_schema_offer: boolean
          has_schema_organization: boolean
          has_schema_product: boolean
          id: string
          merchant_scan_id: string
          product_count: number | null
          products_with_availability: number | null
          products_with_image: number | null
          products_with_price: number | null
          products_with_sku: number | null
          sample_products: Json | null
        }
        Insert: {
          created_at?: string
          data_quality_score?: number
          has_json_ld?: boolean
          has_microdata?: boolean
          has_open_graph?: boolean
          has_schema_offer?: boolean
          has_schema_organization?: boolean
          has_schema_product?: boolean
          id?: string
          merchant_scan_id: string
          product_count?: number | null
          products_with_availability?: number | null
          products_with_image?: number | null
          products_with_price?: number | null
          products_with_sku?: number | null
          sample_products?: Json | null
        }
        Update: {
          created_at?: string
          data_quality_score?: number
          has_json_ld?: boolean
          has_microdata?: boolean
          has_open_graph?: boolean
          has_schema_offer?: boolean
          has_schema_organization?: boolean
          has_schema_product?: boolean
          id?: string
          merchant_scan_id?: string
          product_count?: number | null
          products_with_availability?: number | null
          products_with_image?: number | null
          products_with_price?: number | null
          products_with_sku?: number | null
          sample_products?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_structured_data_merchant_scan_id_fkey"
            columns: ["merchant_scan_id"]
            isOneToOne: false
            referencedRelation: "merchant_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scanner_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          last_used_ip: string | null
          name: string
          rate_limit_per_min: number
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          last_used_ip?: string | null
          name: string
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          name?: string
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanner_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scanner_credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          source: string | null
          tenant_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          source?: string | null
          tenant_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          source?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanner_credit_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scanner_usage_events: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "scanner_usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scanner_usage_events_2026_04: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_05: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_06: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_07: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_08: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_09: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_10: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_11: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2026_12: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_01: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_02: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_03: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_04: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_05: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_06: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_07: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_08: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_09: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_10: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_11: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scanner_usage_events_2027_12: {
        Row: {
          actor_type: string
          count: number
          created_at: string
          credits_consumed: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id: string | null
          status_code: number
          tenant_id: string
          total_duration_ms: number
        }
        Insert: {
          actor_type: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method: string
          minute_bucket: string
          path_template: string
          scanner_key_id?: string | null
          status_code: number
          tenant_id: string
          total_duration_ms?: number
        }
        Update: {
          actor_type?: string
          count?: number
          created_at?: string
          credits_consumed?: number
          method?: string
          minute_bucket?: string
          path_template?: string
          scanner_key_id?: string | null
          status_code?: number
          tenant_id?: string
          total_duration_ms?: number
        }
        Relationships: []
      }
      scenario_runs: {
        Row: {
          analysis: Json | null
          assessment: Json | null
          by_style: Json | null
          created_at: string | null
          duration_seconds: number | null
          error: string | null
          finished_at: string | null
          id: string
          llm_cost_usd: number | null
          mode: string
          report: Json | null
          result: Json | null
          rogue: Json | null
          scenario_id: string
          scenario_name: string | null
          started_at: string
          verdict: string | null
        }
        Insert: {
          analysis?: Json | null
          assessment?: Json | null
          by_style?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          llm_cost_usd?: number | null
          mode?: string
          report?: Json | null
          result?: Json | null
          rogue?: Json | null
          scenario_id: string
          scenario_name?: string | null
          started_at: string
          verdict?: string | null
        }
        Update: {
          analysis?: Json | null
          assessment?: Json | null
          by_style?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          llm_cost_usd?: number | null
          mode?: string
          report?: Json | null
          result?: Json | null
          rogue?: Json | null
          scenario_id?: string
          scenario_name?: string | null
          started_at?: string
          verdict?: string | null
        }
        Relationships: []
      }
      scenario_template_versions: {
        Row: {
          building_block: string | null
          created_at: string | null
          edit_summary: string | null
          edited_by: string | null
          id: string
          markdown: string
          template_id: string
          version: number
        }
        Insert: {
          building_block?: string | null
          created_at?: string | null
          edit_summary?: string | null
          edited_by?: string | null
          id?: string
          markdown: string
          template_id: string
          version?: number
        }
        Update: {
          building_block?: string | null
          created_at?: string | null
          edit_summary?: string | null
          edited_by?: string | null
          id?: string
          markdown?: string
          template_id?: string
          version?: number
        }
        Relationships: []
      }
      scenario_templates: {
        Row: {
          building_block: string | null
          compile_warnings: Json | null
          compiled: Json | null
          compiled_at: string | null
          created_at: string
          id: string
          is_active: boolean
          is_built_in: boolean
          last_run_at: string | null
          markdown: string
          name: string
          template_id: string
          updated_at: string
        }
        Insert: {
          building_block?: string | null
          compile_warnings?: Json | null
          compiled?: Json | null
          compiled_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_built_in?: boolean
          last_run_at?: string | null
          markdown: string
          name: string
          template_id: string
          updated_at?: string
        }
        Update: {
          building_block?: string | null
          compile_warnings?: Json | null
          compiled?: Json | null
          compiled_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_built_in?: boolean
          last_run_at?: string | null
          markdown?: string
          name?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          environment: string | null
          error: string | null
          id: string
          intent_count: number
          net_transfer_count: number
          started_at: string | null
          status: string
          tenant_id: string
          total_gross_amount: number
          total_net_amount: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          environment?: string | null
          error?: string | null
          id?: string
          intent_count?: number
          net_transfer_count?: number
          started_at?: string | null
          status?: string
          tenant_id: string
          total_gross_amount?: number
          total_net_amount?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          environment?: string | null
          error?: string | null
          id?: string
          intent_count?: number
          net_transfer_count?: number
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_gross_amount?: number
          total_net_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_config: {
        Row: {
          auto_settlement_enabled: boolean | null
          created_at: string | null
          cross_border_fee_percentage: number | null
          internal_fee_percentage: number | null
          settlement_schedule: string | null
          settlement_threshold: number | null
          tenant_id: string
          updated_at: string | null
          x402_fee_currency: string | null
          x402_fee_fixed: number | null
          x402_fee_percentage: number | null
          x402_fee_type: string
        }
        Insert: {
          auto_settlement_enabled?: boolean | null
          created_at?: string | null
          cross_border_fee_percentage?: number | null
          internal_fee_percentage?: number | null
          settlement_schedule?: string | null
          settlement_threshold?: number | null
          tenant_id: string
          updated_at?: string | null
          x402_fee_currency?: string | null
          x402_fee_fixed?: number | null
          x402_fee_percentage?: number | null
          x402_fee_type?: string
        }
        Update: {
          auto_settlement_enabled?: boolean | null
          created_at?: string | null
          cross_border_fee_percentage?: number | null
          internal_fee_percentage?: number | null
          settlement_schedule?: string | null
          settlement_threshold?: number | null
          tenant_id?: string
          updated_at?: string | null
          x402_fee_currency?: string | null
          x402_fee_fixed?: number | null
          x402_fee_percentage?: number | null
          x402_fee_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          currency: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          metadata: Json | null
          rail: string
          scheduled_at: string
          started_at: string | null
          status: string | null
          success_count: number | null
          tenant_id: string
          total_amount: number | null
          transfer_count: number | null
          updated_at: string | null
          window_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          rail: string
          scheduled_at: string
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          tenant_id: string
          total_amount?: number | null
          transfer_count?: number | null
          updated_at?: string | null
          window_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          rail?: string
          scheduled_at?: string
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          tenant_id?: string
          total_amount?: number | null
          transfer_count?: number | null
          updated_at?: string | null
          window_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_executions_window_id_fkey"
            columns: ["window_id"]
            isOneToOne: false
            referencedRelation: "settlement_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_holidays: {
        Row: {
          affected_rails: string[] | null
          closed_from: string | null
          closed_until: string | null
          country_code: string
          created_at: string | null
          description: string | null
          holiday_date: string
          id: string
          is_full_day: boolean | null
          metadata: Json | null
          name: string
          year: number | null
        }
        Insert: {
          affected_rails?: string[] | null
          closed_from?: string | null
          closed_until?: string | null
          country_code: string
          created_at?: string | null
          description?: string | null
          holiday_date: string
          id?: string
          is_full_day?: boolean | null
          metadata?: Json | null
          name: string
          year?: number | null
        }
        Update: {
          affected_rails?: string[] | null
          closed_from?: string | null
          closed_until?: string | null
          country_code?: string
          created_at?: string | null
          description?: string | null
          holiday_date?: string
          id?: string
          is_full_day?: boolean | null
          metadata?: Json | null
          name?: string
          year?: number | null
        }
        Relationships: []
      }
      settlement_queue: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          error_message: string | null
          id: string
          metadata: Json | null
          priority: string | null
          processed_at: string | null
          queued_at: string | null
          rail: string
          scheduled_for: string | null
          settlement_batch_id: string | null
          status: string | null
          tenant_id: string
          transfer_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          processed_at?: string | null
          queued_at?: string | null
          rail: string
          scheduled_for?: string | null
          settlement_batch_id?: string | null
          status?: string | null
          tenant_id: string
          transfer_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          processed_at?: string | null
          queued_at?: string | null
          rail?: string
          scheduled_for?: string | null
          settlement_batch_id?: string | null
          status?: string | null
          tenant_id?: string
          transfer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_queue_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_records: {
        Row: {
          actual_amount: number | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          currency: string
          destination_amount: number | null
          destination_currency: string | null
          environment: string
          error_code: string | null
          error_message: string | null
          expected_amount: number
          external_id: string | null
          failed_at: string | null
          fx_rate: number | null
          id: string
          last_retry_at: string | null
          metadata: Json | null
          rail: string
          rail_fee: number | null
          rail_response: Json | null
          reconciled_at: string | null
          reconciliation_status: string | null
          retry_count: number | null
          status: string
          submitted_at: string | null
          tenant_id: string
          transfer_id: string
          updated_at: string | null
        }
        Insert: {
          actual_amount?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string
          destination_amount?: number | null
          destination_currency?: string | null
          environment?: string
          error_code?: string | null
          error_message?: string | null
          expected_amount: number
          external_id?: string | null
          failed_at?: string | null
          fx_rate?: number | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          rail: string
          rail_fee?: number | null
          rail_response?: Json | null
          reconciled_at?: string | null
          reconciliation_status?: string | null
          retry_count?: number | null
          status?: string
          submitted_at?: string | null
          tenant_id: string
          transfer_id: string
          updated_at?: string | null
        }
        Update: {
          actual_amount?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string
          destination_amount?: number | null
          destination_currency?: string | null
          environment?: string
          error_code?: string | null
          error_message?: string | null
          expected_amount?: number
          external_id?: string | null
          failed_at?: string | null
          fx_rate?: number | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          rail?: string
          rail_fee?: number | null
          rail_response?: Json | null
          reconciled_at?: string | null
          reconciliation_status?: string | null
          retry_count?: number | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          transfer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_records_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_rule_executions: {
        Row: {
          amount: number | null
          completed_at: string | null
          currency: string | null
          error_code: string | null
          error_message: string | null
          id: string
          rule_id: string
          settlement_id: string | null
          settlement_rail: string | null
          started_at: string | null
          status: string
          tenant_id: string
          trigger_context: Json | null
          trigger_reason: string
        }
        Insert: {
          amount?: number | null
          completed_at?: string | null
          currency?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          rule_id: string
          settlement_id?: string | null
          settlement_rail?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          trigger_context?: Json | null
          trigger_reason: string
        }
        Update: {
          amount?: number | null
          completed_at?: string | null
          currency?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          rule_id?: string
          settlement_id?: string | null
          settlement_rail?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          trigger_context?: Json | null
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_rule_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "settlement_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_rule_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_rules: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          maximum_amount: number | null
          maximum_currency: string | null
          metadata: Json | null
          minimum_amount: number | null
          minimum_currency: string | null
          name: string
          priority: number | null
          settlement_priority: string
          settlement_rail: string
          tenant_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          maximum_amount?: number | null
          maximum_currency?: string | null
          metadata?: Json | null
          minimum_amount?: number | null
          minimum_currency?: string | null
          name: string
          priority?: number | null
          settlement_priority?: string
          settlement_rail?: string
          tenant_id: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          maximum_amount?: number | null
          maximum_currency?: string | null
          metadata?: Json | null
          minimum_amount?: number | null
          minimum_currency?: string | null
          name?: string
          priority?: number | null
          settlement_priority?: string
          settlement_rail?: string
          tenant_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_rules_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_windows: {
        Row: {
          created_at: string | null
          cutoff_hour: number | null
          cutoff_minute: number | null
          frequency: string
          id: string
          is_active: boolean | null
          max_batch_size: number | null
          metadata: Json | null
          min_batch_amount: number | null
          rail: string
          scheduled_times: string[] | null
          tenant_id: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cutoff_hour?: number | null
          cutoff_minute?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          max_batch_size?: number | null
          metadata?: Json | null
          min_batch_amount?: number | null
          rail: string
          scheduled_times?: string[] | null
          tenant_id: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cutoff_hour?: number | null
          cutoff_minute?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          max_batch_size?: number | null
          metadata?: Json | null
          min_batch_amount?: number | null
          rail?: string
          scheduled_times?: string[] | null
          tenant_id?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_windows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string
          destination_details: Json | null
          environment: string
          external_id: string | null
          failed_at: string | null
          fee_amount: number | null
          id: string
          provider: string
          provider_response: Json | null
          rail: string
          return_details: Json | null
          status: string
          tenant_id: string
          transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          destination_details?: Json | null
          environment?: string
          external_id?: string | null
          failed_at?: string | null
          fee_amount?: number | null
          id?: string
          provider?: string
          provider_response?: Json | null
          rail: string
          return_details?: Json | null
          status?: string
          tenant_id: string
          transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          destination_details?: Json | null
          environment?: string
          external_id?: string | null
          failed_at?: string | null
          fee_amount?: number | null
          id?: string
          provider?: string
          provider_response?: Json | null
          rail?: string
          return_details?: Json | null
          status?: string
          tenant_id?: string
          transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          action_payload: Json
          action_type: string
          can_execute: boolean | null
          created_at: string | null
          environment: string
          errors: Json | null
          executed: boolean | null
          executed_at: string | null
          execution_result_id: string | null
          execution_result_type: string | null
          expires_at: string
          id: string
          preview: Json | null
          status: string
          tenant_id: string
          updated_at: string | null
          variance: Json | null
          warnings: Json | null
        }
        Insert: {
          action_payload: Json
          action_type: string
          can_execute?: boolean | null
          created_at?: string | null
          environment?: string
          errors?: Json | null
          executed?: boolean | null
          executed_at?: string | null
          execution_result_id?: string | null
          execution_result_type?: string | null
          expires_at?: string
          id?: string
          preview?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          variance?: Json | null
          warnings?: Json | null
        }
        Update: {
          action_payload?: Json
          action_type?: string
          can_execute?: boolean | null
          created_at?: string | null
          environment?: string
          errors?: Json | null
          executed?: boolean | null
          executed_at?: string | null
          execution_result_id?: string | null
          execution_result_type?: string | null
          expires_at?: string
          id?: string
          preview?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          variance?: Json | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "simulations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_events: {
        Row: {
          actor_id: string
          actor_name: string | null
          actor_type: string
          created_at: string | null
          data: Json | null
          event_type: string
          id: string
          stream_id: string
          tenant_id: string
        }
        Insert: {
          actor_id: string
          actor_name?: string | null
          actor_type: string
          created_at?: string | null
          data?: Json | null
          event_type: string
          id?: string
          stream_id: string
          tenant_id: string
        }
        Update: {
          actor_id?: string
          actor_name?: string | null
          actor_type?: string
          created_at?: string | null
          data?: Json | null
          event_type?: string
          id?: string
          stream_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_events_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          buffer_amount: number | null
          cancelled_at: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          environment: string
          flow_rate_per_month: number
          flow_rate_per_second: number
          funded_amount: number | null
          health: string | null
          id: string
          initiated_at: string | null
          initiated_by_id: string
          initiated_by_name: string | null
          initiated_by_type: string
          last_pause_at: string | null
          managed_by_can_modify: boolean | null
          managed_by_can_pause: boolean | null
          managed_by_can_terminate: boolean | null
          managed_by_id: string
          managed_by_name: string | null
          managed_by_type: string
          onchain_flow_id: string | null
          onchain_network: string | null
          onchain_tx_hash: string | null
          paused_at: string | null
          receiver_account_id: string
          receiver_account_name: string
          resumed_at: string | null
          runway_seconds: number | null
          sender_account_id: string
          sender_account_name: string
          started_at: string | null
          status: string | null
          tenant_id: string
          total_paused_seconds: number | null
          total_streamed: number | null
          total_withdrawn: number | null
          updated_at: string | null
        }
        Insert: {
          buffer_amount?: number | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          environment?: string
          flow_rate_per_month: number
          flow_rate_per_second: number
          funded_amount?: number | null
          health?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by_id: string
          initiated_by_name?: string | null
          initiated_by_type: string
          last_pause_at?: string | null
          managed_by_can_modify?: boolean | null
          managed_by_can_pause?: boolean | null
          managed_by_can_terminate?: boolean | null
          managed_by_id: string
          managed_by_name?: string | null
          managed_by_type: string
          onchain_flow_id?: string | null
          onchain_network?: string | null
          onchain_tx_hash?: string | null
          paused_at?: string | null
          receiver_account_id: string
          receiver_account_name: string
          resumed_at?: string | null
          runway_seconds?: number | null
          sender_account_id: string
          sender_account_name: string
          started_at?: string | null
          status?: string | null
          tenant_id: string
          total_paused_seconds?: number | null
          total_streamed?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
        }
        Update: {
          buffer_amount?: number | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          environment?: string
          flow_rate_per_month?: number
          flow_rate_per_second?: number
          funded_amount?: number | null
          health?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by_id?: string
          initiated_by_name?: string | null
          initiated_by_type?: string
          last_pause_at?: string | null
          managed_by_can_modify?: boolean | null
          managed_by_can_pause?: boolean | null
          managed_by_can_terminate?: boolean | null
          managed_by_id?: string
          managed_by_name?: string | null
          managed_by_type?: string
          onchain_flow_id?: string | null
          onchain_network?: string | null
          onchain_tx_hash?: string | null
          paused_at?: string | null
          receiver_account_id?: string
          receiver_account_name?: string
          resumed_at?: string | null
          runway_seconds?: number | null
          sender_account_id?: string
          sender_account_name?: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          total_paused_seconds?: number | null
          total_streamed?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streams_receiver_account_id_fkey"
            columns: ["receiver_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_sender_account_id_fkey"
            columns: ["sender_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_escalations: {
        Row: {
          agent_id: string | null
          assigned_to: string | null
          created_at: string
          estimated_response_time: string | null
          id: string
          priority: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          summary: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          assigned_to?: string | null
          created_at?: string
          estimated_response_time?: string | null
          id?: string
          priority?: string
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          summary: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          assigned_to?: string | null
          created_at?: string
          estimated_response_time?: string | null
          id?: string
          priority?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          summary?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_escalations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_user_id: string | null
          name: string | null
          role: string
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by_user_id?: string | null
          name?: string | null
          role: string
          tenant_id: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string | null
          name?: string | null
          role?: string
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string | null
          disputes_auto_escalate_after_days: number | null
          disputes_filing_window_days: number | null
          disputes_response_window_days: number | null
          exports_date_format: string | null
          exports_default_format: string | null
          refunds_window_days: number | null
          retry_enabled: boolean | null
          retry_intervals_hours: number[] | null
          retry_max_attempts: number | null
          retry_max_window_days: number | null
          retry_skip_if_rate_changed: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disputes_auto_escalate_after_days?: number | null
          disputes_filing_window_days?: number | null
          disputes_response_window_days?: number | null
          exports_date_format?: string | null
          exports_default_format?: string | null
          refunds_window_days?: number | null
          retry_enabled?: boolean | null
          retry_intervals_hours?: number[] | null
          retry_max_attempts?: number | null
          retry_max_window_days?: number | null
          retry_skip_if_rate_changed?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disputes_auto_escalate_after_days?: number | null
          disputes_filing_window_days?: number | null
          disputes_response_window_days?: number | null
          exports_date_format?: string | null
          exports_default_format?: string | null
          refunds_window_days?: number | null
          retry_enabled?: boolean | null
          retry_intervals_hours?: number[] | null
          retry_max_attempts?: number | null
          retry_max_window_days?: number | null
          retry_skip_if_rate_changed?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          api_key: string
          api_key_hash: string
          api_key_prefix: string | null
          beta_access_code_id: string | null
          claimed_by_tenant_id: string | null
          created_at: string | null
          id: string
          is_agent_tenant: boolean
          max_agents: number | null
          max_team_members: number | null
          name: string
          onboarded_via: string | null
          settings: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_key_hash: string
          api_key_prefix?: string | null
          beta_access_code_id?: string | null
          claimed_by_tenant_id?: string | null
          created_at?: string | null
          id?: string
          is_agent_tenant?: boolean
          max_agents?: number | null
          max_team_members?: number | null
          name: string
          onboarded_via?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_key_hash?: string
          api_key_prefix?: string | null
          beta_access_code_id?: string | null
          claimed_by_tenant_id?: string | null
          created_at?: string | null
          id?: string
          is_agent_tenant?: boolean
          max_agents?: number | null
          max_team_members?: number | null
          name?: string
          onboarded_via?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_beta_access_code_id_fkey"
            columns: ["beta_access_code_id"]
            isOneToOne: false
            referencedRelation: "beta_access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_claimed_by_tenant_id_fkey"
            columns: ["claimed_by_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_batch_items: {
        Row: {
          amount: number
          batch_id: string
          created_at: string | null
          currency: string
          description: string | null
          destination_currency: string | null
          environment: string
          failed_at: string | null
          failure_reason: string | null
          fee_amount: number | null
          from_account_id: string
          id: string
          is_valid: boolean | null
          metadata: Json | null
          net_amount: number | null
          processed_at: string | null
          reference: string | null
          sequence_number: number
          settlement_rail: string | null
          status: string
          tenant_id: string
          to_account_id: string
          transfer_id: string | null
          updated_at: string | null
          validation_errors: Json | null
        }
        Insert: {
          amount: number
          batch_id: string
          created_at?: string | null
          currency?: string
          description?: string | null
          destination_currency?: string | null
          environment?: string
          failed_at?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          from_account_id: string
          id?: string
          is_valid?: boolean | null
          metadata?: Json | null
          net_amount?: number | null
          processed_at?: string | null
          reference?: string | null
          sequence_number: number
          settlement_rail?: string | null
          status?: string
          tenant_id: string
          to_account_id: string
          transfer_id?: string | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Update: {
          amount?: number
          batch_id?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          destination_currency?: string | null
          environment?: string
          failed_at?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          from_account_id?: string
          id?: string
          is_valid?: boolean | null
          metadata?: Json | null
          net_amount?: number | null
          processed_at?: string | null
          reference?: string | null
          sequence_number?: number
          settlement_rail?: string | null
          status?: string
          tenant_id?: string
          to_account_id?: string
          transfer_id?: string | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "transfer_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_batch_items_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_batch_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_batch_items_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_batch_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_batches: {
        Row: {
          completed_at: string | null
          completed_items: number
          created_at: string | null
          created_by_id: string | null
          created_by_name: string | null
          created_by_type: string
          currency: string
          description: string | null
          environment: string
          failed_at: string | null
          failed_items: number
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          name: string | null
          pending_items: number
          processing_items: number
          source_file_hash: string | null
          source_file_name: string | null
          started_at: string | null
          status: string
          tenant_id: string
          total_amount: number
          total_fees: number
          total_items: number
          type: string | null
          updated_at: string | null
          webhook_delivered_at: string | null
          webhook_url: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_items?: number
          created_at?: string | null
          created_by_id?: string | null
          created_by_name?: string | null
          created_by_type?: string
          currency?: string
          description?: string | null
          environment?: string
          failed_at?: string | null
          failed_items?: number
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          name?: string | null
          pending_items?: number
          processing_items?: number
          source_file_hash?: string | null
          source_file_name?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          total_amount?: number
          total_fees?: number
          total_items?: number
          type?: string | null
          updated_at?: string | null
          webhook_delivered_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_items?: number
          created_at?: string | null
          created_by_id?: string | null
          created_by_name?: string | null
          created_by_type?: string
          currency?: string
          description?: string | null
          environment?: string
          failed_at?: string | null
          failed_items?: number
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          name?: string | null
          pending_items?: number
          processing_items?: number
          source_file_hash?: string | null
          source_file_name?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          total_fees?: number
          total_items?: number
          type?: string | null
          updated_at?: string | null
          webhook_delivered_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_schedules: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          end_date: string | null
          environment: string
          frequency: string
          from_account_id: string
          id: string
          initiated_by_id: string | null
          initiated_by_name: string | null
          initiated_by_type: string | null
          interval_value: number | null
          last_execution: string | null
          max_occurrences: number | null
          max_retry_attempts: number | null
          next_execution: string | null
          occurrences_completed: number | null
          retry_enabled: boolean | null
          retry_window_days: number | null
          start_date: string
          status: string
          tenant_id: string
          timezone: string | null
          to_account_id: string | null
          to_payment_method_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          environment?: string
          frequency: string
          from_account_id: string
          id?: string
          initiated_by_id?: string | null
          initiated_by_name?: string | null
          initiated_by_type?: string | null
          interval_value?: number | null
          last_execution?: string | null
          max_occurrences?: number | null
          max_retry_attempts?: number | null
          next_execution?: string | null
          occurrences_completed?: number | null
          retry_enabled?: boolean | null
          retry_window_days?: number | null
          start_date: string
          status?: string
          tenant_id: string
          timezone?: string | null
          to_account_id?: string | null
          to_payment_method_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          environment?: string
          frequency?: string
          from_account_id?: string
          id?: string
          initiated_by_id?: string | null
          initiated_by_name?: string | null
          initiated_by_type?: string | null
          interval_value?: number | null
          last_execution?: string | null
          max_occurrences?: number | null
          max_retry_attempts?: number | null
          next_execution?: string | null
          occurrences_completed?: number | null
          retry_enabled?: boolean | null
          retry_window_days?: number | null
          start_date?: string
          status?: string
          tenant_id?: string
          timezone?: string | null
          to_account_id?: string | null
          to_payment_method_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_schedules_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_schedules_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          completed_at: string | null
          corridor_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          destination_amount: number | null
          destination_currency: string | null
          destination_tenant_id: string | null
          environment: string
          external_issuer_id: string | null
          external_payout_id: string | null
          external_tx_hash: string | null
          failed_at: string | null
          failure_reason: string | null
          fee_amount: number | null
          fee_breakdown: Json | null
          from_account_id: string | null
          from_account_name: string | null
          fx_rate: number | null
          id: string
          idempotency_key: string | null
          initiated_by_id: string
          initiated_by_name: string | null
          initiated_by_type: string
          processing_at: string | null
          protocol_metadata: Json | null
          schedule_id: string | null
          scheduled_for: string | null
          settled_at: string | null
          settlement_metadata: Json | null
          settlement_network: string | null
          status: string | null
          stream_id: string | null
          tenant_id: string
          to_account_id: string | null
          to_account_name: string | null
          tx_hash: string | null
          type: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          corridor_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          destination_tenant_id?: string | null
          environment?: string
          external_issuer_id?: string | null
          external_payout_id?: string | null
          external_tx_hash?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          fee_breakdown?: Json | null
          from_account_id?: string | null
          from_account_name?: string | null
          fx_rate?: number | null
          id?: string
          idempotency_key?: string | null
          initiated_by_id: string
          initiated_by_name?: string | null
          initiated_by_type: string
          processing_at?: string | null
          protocol_metadata?: Json | null
          schedule_id?: string | null
          scheduled_for?: string | null
          settled_at?: string | null
          settlement_metadata?: Json | null
          settlement_network?: string | null
          status?: string | null
          stream_id?: string | null
          tenant_id: string
          to_account_id?: string | null
          to_account_name?: string | null
          tx_hash?: string | null
          type: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          corridor_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          destination_tenant_id?: string | null
          environment?: string
          external_issuer_id?: string | null
          external_payout_id?: string | null
          external_tx_hash?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          fee_breakdown?: Json | null
          from_account_id?: string | null
          from_account_name?: string | null
          fx_rate?: number | null
          id?: string
          idempotency_key?: string | null
          initiated_by_id?: string
          initiated_by_name?: string | null
          initiated_by_type?: string
          processing_at?: string | null
          protocol_metadata?: Json | null
          schedule_id?: string | null
          scheduled_for?: string | null
          settled_at?: string | null
          settlement_metadata?: Json | null
          settlement_network?: string | null
          status?: string | null
          stream_id?: string | null
          tenant_id?: string
          to_account_id?: string | null
          to_account_name?: string | null
          tx_hash?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transfers_stream"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "transfer_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_accounts: {
        Row: {
          account_name: string | null
          balance_available: number | null
          balance_pending: number | null
          balance_reserved: number | null
          balance_total: number | null
          created_at: string | null
          currency: string
          environment: string
          external_account_id: string | null
          id: string
          last_sync_at: string | null
          max_balance: number | null
          metadata: Json | null
          min_balance_threshold: number | null
          rail: string
          status: string | null
          target_balance: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          balance_available?: number | null
          balance_pending?: number | null
          balance_reserved?: number | null
          balance_total?: number | null
          created_at?: string | null
          currency: string
          environment?: string
          external_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          max_balance?: number | null
          metadata?: Json | null
          min_balance_threshold?: number | null
          rail: string
          status?: string | null
          target_balance?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          balance_available?: number | null
          balance_pending?: number | null
          balance_reserved?: number | null
          balance_total?: number | null
          created_at?: string | null
          currency?: string
          environment?: string
          external_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          max_balance?: number | null
          metadata?: Json | null
          min_balance_threshold?: number | null
          rail?: string
          status?: string | null
          target_balance?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          currency: string | null
          current_value: number | null
          id: string
          message: string | null
          metadata: Json | null
          rail: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          tenant_id: string
          threshold_value: number | null
          title: string
          treasury_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          currency?: string | null
          current_value?: number | null
          id?: string
          message?: string | null
          metadata?: Json | null
          rail?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          tenant_id: string
          threshold_value?: number | null
          title: string
          treasury_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          currency?: string | null
          current_value?: number | null
          id?: string
          message?: string | null
          metadata?: Json | null
          rail?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          tenant_id?: string
          threshold_value?: number | null
          title?: string
          treasury_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_alerts_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_balance_history: {
        Row: {
          balance_available: number
          balance_pending: number
          balance_reserved: number
          balance_total: number
          created_at: string | null
          id: string
          snapshot_at: string | null
          snapshot_type: string | null
          treasury_account_id: string
          volume_inbound_24h: number | null
          volume_outbound_24h: number | null
        }
        Insert: {
          balance_available: number
          balance_pending: number
          balance_reserved: number
          balance_total: number
          created_at?: string | null
          id?: string
          snapshot_at?: string | null
          snapshot_type?: string | null
          treasury_account_id: string
          volume_inbound_24h?: number | null
          volume_outbound_24h?: number | null
        }
        Update: {
          balance_available?: number
          balance_pending?: number
          balance_reserved?: number
          balance_total?: number
          created_at?: string | null
          id?: string
          snapshot_at?: string | null
          snapshot_type?: string | null
          treasury_account_id?: string
          volume_inbound_24h?: number | null
          volume_outbound_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_balance_history_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_rebalance_recommendations: {
        Row: {
          created_at: string | null
          estimated_duration_hours: number | null
          estimated_fees: number | null
          executed_at: string | null
          executed_by: string | null
          execution_tx_id: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          priority: string | null
          rationale: string | null
          reason: string
          recommended_amount: number
          source_balance: number
          source_currency: string
          source_rail: string
          status: string | null
          target_balance: number
          target_currency: string
          target_rail: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_duration_hours?: number | null
          estimated_fees?: number | null
          executed_at?: string | null
          executed_by?: string | null
          execution_tx_id?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          rationale?: string | null
          reason: string
          recommended_amount: number
          source_balance: number
          source_currency: string
          source_rail: string
          status?: string | null
          target_balance: number
          target_currency: string
          target_rail: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_duration_hours?: number | null
          estimated_fees?: number | null
          executed_at?: string | null
          executed_by?: string | null
          execution_tx_id?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          rationale?: string | null
          reason?: string
          recommended_amount?: number
          source_balance?: number
          source_currency?: string
          source_rail?: string
          status?: string | null
          target_balance?: number
          target_currency?: string
          target_rail?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_rebalance_recommendations_execution_tx_id_fkey"
            columns: ["execution_tx_id"]
            isOneToOne: false
            referencedRelation: "treasury_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_rebalance_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          currency: string
          description: string | null
          environment: string
          external_tx_id: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          tenant_id: string
          treasury_account_id: string
          type: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          currency: string
          description?: string | null
          environment?: string
          external_tx_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tenant_id: string
          treasury_account_id: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          currency?: string
          description?: string | null
          environment?: string
          external_tx_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tenant_id?: string
          treasury_account_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ucp_authorization_codes: {
        Row: {
          buyer_id: string
          client_id: string
          code: string
          code_challenge: string | null
          code_challenge_method: string | null
          created_at: string | null
          expires_at: string
          redirect_uri: string
          scopes: string[]
          state: string
          tenant_id: string
          used: boolean
        }
        Insert: {
          buyer_id: string
          client_id: string
          code: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string | null
          expires_at: string
          redirect_uri: string
          scopes: string[]
          state: string
          tenant_id: string
          used?: boolean
        }
        Update: {
          buyer_id?: string
          client_id?: string
          code?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string | null
          expires_at?: string
          redirect_uri?: string
          scopes?: string[]
          state?: string
          tenant_id?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ucp_authorization_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ucp_oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ucp_authorization_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ucp_checkout_sessions: {
        Row: {
          agent_id: string | null
          billing_address: Json | null
          buyer: Json | null
          cancel_url: string | null
          continue_url: string | null
          created_at: string | null
          currency: string
          environment: string
          expires_at: string
          id: string
          line_items: Json
          links: Json
          messages: Json | null
          metadata: Json | null
          order_id: string | null
          payment_config: Json
          payment_instruments: Json | null
          selected_instrument_id: string | null
          shipping_address: Json | null
          status: string
          tenant_id: string
          totals: Json
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          billing_address?: Json | null
          buyer?: Json | null
          cancel_url?: string | null
          continue_url?: string | null
          created_at?: string | null
          currency: string
          environment?: string
          expires_at?: string
          id: string
          line_items?: Json
          links?: Json
          messages?: Json | null
          metadata?: Json | null
          order_id?: string | null
          payment_config?: Json
          payment_instruments?: Json | null
          selected_instrument_id?: string | null
          shipping_address?: Json | null
          status?: string
          tenant_id: string
          totals?: Json
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          billing_address?: Json | null
          buyer?: Json | null
          cancel_url?: string | null
          continue_url?: string | null
          created_at?: string | null
          currency?: string
          environment?: string
          expires_at?: string
          id?: string
          line_items?: Json
          links?: Json
          messages?: Json | null
          metadata?: Json | null
          order_id?: string | null
          payment_config?: Json
          payment_instruments?: Json | null
          selected_instrument_id?: string | null
          shipping_address?: Json | null
          status?: string
          tenant_id?: string
          totals?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_checkout_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ucp_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ucp_checkout_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ucp_linked_accounts: {
        Row: {
          access_token_expires_at: string
          access_token_hash: string
          buyer_email: string | null
          buyer_id: string
          created_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          linked_at: string | null
          platform_id: string
          platform_name: string
          refresh_token_expires_at: string
          refresh_token_hash: string
          scopes: string[]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          access_token_expires_at: string
          access_token_hash: string
          buyer_email?: string | null
          buyer_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          linked_at?: string | null
          platform_id: string
          platform_name: string
          refresh_token_expires_at: string
          refresh_token_hash: string
          scopes: string[]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          access_token_expires_at?: string
          access_token_hash?: string
          buyer_email?: string | null
          buyer_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          linked_at?: string | null
          platform_id?: string
          platform_name?: string
          refresh_token_expires_at?: string
          refresh_token_hash?: string
          scopes?: string[]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ucp_linked_accounts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "ucp_oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ucp_linked_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ucp_oauth_clients: {
        Row: {
          allowed_scopes: string[]
          client_id: string
          client_secret_hash: string | null
          client_type: string
          created_at: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          redirect_uris: string[]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_scopes?: string[]
          client_id: string
          client_secret_hash?: string | null
          client_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          redirect_uris: string[]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_scopes?: string[]
          client_id?: string
          client_secret_hash?: string | null
          client_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          redirect_uris?: string[]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ucp_oauth_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ucp_orders: {
        Row: {
          adjustments: Json | null
          agent_id: string | null
          billing_address: Json | null
          buyer: Json | null
          checkout_id: string
          created_at: string | null
          currency: string
          environment: string
          events: Json | null
          expectations: Json | null
          id: string
          line_items: Json
          metadata: Json | null
          payment: Json
          permalink_url: string | null
          shipping_address: Json | null
          status: string
          tenant_id: string
          totals: Json
          updated_at: string | null
        }
        Insert: {
          adjustments?: Json | null
          agent_id?: string | null
          billing_address?: Json | null
          buyer?: Json | null
          checkout_id: string
          created_at?: string | null
          currency: string
          environment?: string
          events?: Json | null
          expectations?: Json | null
          id: string
          line_items: Json
          metadata?: Json | null
          payment: Json
          permalink_url?: string | null
          shipping_address?: Json | null
          status?: string
          tenant_id: string
          totals: Json
          updated_at?: string | null
        }
        Update: {
          adjustments?: Json | null
          agent_id?: string | null
          billing_address?: Json | null
          buyer?: Json | null
          checkout_id?: string
          created_at?: string | null
          currency?: string
          environment?: string
          events?: Json | null
          expectations?: Json | null
          id?: string
          line_items?: Json
          metadata?: Json | null
          payment?: Json
          permalink_url?: string | null
          shipping_address?: Json | null
          status?: string
          tenant_id?: string
          totals?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ucp_orders_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "ucp_checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ucp_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ucp_settlements: {
        Row: {
          completed_at: string | null
          corridor: string
          created_at: string | null
          deferred_to_rules: boolean | null
          destination_amount: number
          destination_currency: string
          environment: string
          estimated_completion: string | null
          failed_at: string | null
          failure_reason: string | null
          fees: number
          fx_rate: number
          id: string
          mandate_id: string | null
          recipient: Json
          settlement_rule_id: string | null
          source_amount: number
          source_currency: string
          status: string
          tenant_id: string
          token: string | null
          transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          corridor?: string
          created_at?: string | null
          deferred_to_rules?: boolean | null
          destination_amount?: number
          destination_currency?: string
          environment?: string
          estimated_completion?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fees?: number
          fx_rate?: number
          id?: string
          mandate_id?: string | null
          recipient?: Json
          settlement_rule_id?: string | null
          source_amount: number
          source_currency?: string
          status?: string
          tenant_id: string
          token?: string | null
          transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          corridor?: string
          created_at?: string | null
          deferred_to_rules?: boolean | null
          destination_amount?: number
          destination_currency?: string
          environment?: string
          estimated_completion?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fees?: number
          fx_rate?: number
          id?: string
          mandate_id?: string | null
          recipient?: Json
          settlement_rule_id?: string | null
          source_amount?: number
          source_currency?: string
          status?: string
          tenant_id?: string
          token?: string | null
          transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ucp_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          failed_login_attempts: number | null
          id: string
          invite_accepted_at: string | null
          invite_expires_at: string | null
          invite_token: string | null
          invited_by_user_id: string | null
          last_failed_login_at: string | null
          last_failed_login_ip: string | null
          locked_until: string | null
          name: string | null
          permissions: Json | null
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_login_attempts?: number | null
          id: string
          invite_accepted_at?: string | null
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by_user_id?: string | null
          last_failed_login_at?: string | null
          last_failed_login_ip?: string | null
          locked_until?: string | null
          name?: string | null
          permissions?: Json | null
          role?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_login_attempts?: number | null
          id?: string
          invite_accepted_at?: string | null
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by_user_id?: string | null
          last_failed_login_at?: string | null
          last_failed_login_ip?: string | null
          locked_until?: string | null
          name?: string | null
          permissions?: Json | null
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_tier_limits: {
        Row: {
          created_at: string | null
          daily: number
          description: string | null
          entity_type: string | null
          id: string
          monthly: number
          per_transaction: number
          tenant_id: string | null
          tier: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily: number
          description?: string | null
          entity_type?: string | null
          id?: string
          monthly: number
          per_transaction: number
          tenant_id?: string | null
          tier: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily?: number
          description?: string | null
          entity_type?: string | null
          id?: string
          monthly?: number
          per_transaction?: number
          tenant_id?: string | null
          tier?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_tier_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          aml_cleared: boolean | null
          balance: number
          blockchain: string | null
          created_at: string
          currency: string
          custody_type: string
          environment: string
          id: string
          kyc_status: string | null
          last_synced_at: string | null
          managed_by_agent_id: string | null
          name: string | null
          network: string | null
          owner_account_id: string
          provider: string
          provider_entity_id: string | null
          provider_metadata: Json | null
          provider_wallet_id: string | null
          provider_wallet_set_id: string | null
          purpose: string | null
          risk_score: number | null
          sanctions_status: string | null
          spending_policy: Json | null
          status: string
          sync_data: Json | null
          sync_enabled: boolean | null
          tenant_id: string
          token_contract: string | null
          updated_at: string
          verification_method: string | null
          verification_status: string
          verified_at: string | null
          wallet_address: string | null
          wallet_type: string
        }
        Insert: {
          aml_cleared?: boolean | null
          balance?: number
          blockchain?: string | null
          created_at?: string
          currency?: string
          custody_type?: string
          environment?: string
          id?: string
          kyc_status?: string | null
          last_synced_at?: string | null
          managed_by_agent_id?: string | null
          name?: string | null
          network?: string | null
          owner_account_id: string
          provider?: string
          provider_entity_id?: string | null
          provider_metadata?: Json | null
          provider_wallet_id?: string | null
          provider_wallet_set_id?: string | null
          purpose?: string | null
          risk_score?: number | null
          sanctions_status?: string | null
          spending_policy?: Json | null
          status?: string
          sync_data?: Json | null
          sync_enabled?: boolean | null
          tenant_id: string
          token_contract?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_status?: string
          verified_at?: string | null
          wallet_address?: string | null
          wallet_type?: string
        }
        Update: {
          aml_cleared?: boolean | null
          balance?: number
          blockchain?: string | null
          created_at?: string
          currency?: string
          custody_type?: string
          environment?: string
          id?: string
          kyc_status?: string | null
          last_synced_at?: string | null
          managed_by_agent_id?: string | null
          name?: string | null
          network?: string | null
          owner_account_id?: string
          provider?: string
          provider_entity_id?: string | null
          provider_metadata?: Json | null
          provider_wallet_id?: string | null
          provider_wallet_set_id?: string | null
          purpose?: string | null
          risk_score?: number | null
          sanctions_status?: string | null
          spending_policy?: Json | null
          status?: string
          sync_data?: Json | null
          sync_enabled?: boolean | null
          tenant_id?: string
          token_contract?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_status?: string
          verified_at?: string | null
          wallet_address?: string | null
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_managed_by_agent_id_fkey"
            columns: ["managed_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          dlq_at: string | null
          dlq_reason: string | null
          endpoint_id: string | null
          endpoint_url: string
          environment: string
          event_id: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          last_attempt_at: string | null
          last_response_body: string | null
          last_response_code: number | null
          last_response_time_ms: number | null
          max_attempts: number | null
          next_retry_at: string | null
          payload: Json
          signature: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          dlq_at?: string | null
          dlq_reason?: string | null
          endpoint_id?: string | null
          endpoint_url: string
          environment?: string
          event_id?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          last_response_body?: string | null
          last_response_code?: number | null
          last_response_time_ms?: number | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload: Json
          signature?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          dlq_at?: string | null
          dlq_reason?: string | null
          endpoint_id?: string | null
          endpoint_url?: string
          environment?: string
          event_id?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          last_response_body?: string | null
          last_response_code?: number | null
          last_response_time_ms?: number | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload?: Json
          signature?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          consecutive_failures: number | null
          created_at: string | null
          description: string | null
          events: string[]
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          metadata: Json | null
          name: string | null
          secret_hash: string
          secret_prefix: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          consecutive_failures?: number | null
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          name?: string | null
          secret_hash: string
          secret_prefix?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          consecutive_failures?: number | null
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          name?: string | null
          secret_hash?: string
          secret_prefix?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          environment: string
          error: string | null
          event_type: string
          external_id: string
          id: string
          payload: Json
          processed_at: string | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string | null
          environment?: string
          error?: string | null
          event_type: string
          external_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          source?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          environment?: string
          error?: string | null
          event_type?: string
          external_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      workflow_instances: {
        Row: {
          agent_context: Json | null
          completed_at: string | null
          context: Json | null
          created_at: string
          current_step_index: number
          environment: string
          error: string | null
          id: string
          initiated_by: string | null
          initiated_by_agent_id: string | null
          initiated_by_type: string | null
          started_at: string | null
          status: string
          template_id: string
          template_version: number
          tenant_id: string
          timeout_at: string | null
          trigger_data: Json | null
          updated_at: string
        }
        Insert: {
          agent_context?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string
          current_step_index?: number
          environment?: string
          error?: string | null
          id?: string
          initiated_by?: string | null
          initiated_by_agent_id?: string | null
          initiated_by_type?: string | null
          started_at?: string | null
          status?: string
          template_id: string
          template_version?: number
          tenant_id: string
          timeout_at?: string | null
          trigger_data?: Json | null
          updated_at?: string
        }
        Update: {
          agent_context?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string
          current_step_index?: number
          environment?: string
          error?: string | null
          id?: string
          initiated_by?: string | null
          initiated_by_agent_id?: string | null
          initiated_by_type?: string | null
          started_at?: string | null
          status?: string
          template_id?: string
          template_version?: number
          tenant_id?: string
          timeout_at?: string | null
          trigger_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_initiated_by_agent_id_fkey"
            columns: ["initiated_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          agent_reasoning: string | null
          approval_decision: string | null
          approval_reason: string | null
          approved_by: string | null
          approved_by_agent_id: string | null
          callback_token: string | null
          completed_at: string | null
          created_at: string
          environment: string
          error: string | null
          expires_at: string | null
          external_request: Json | null
          external_response: Json | null
          id: string
          input: Json | null
          instance_id: string
          output: Json | null
          started_at: string | null
          status: string
          step_config: Json | null
          step_index: number
          step_name: string | null
          step_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_reasoning?: string | null
          approval_decision?: string | null
          approval_reason?: string | null
          approved_by?: string | null
          approved_by_agent_id?: string | null
          callback_token?: string | null
          completed_at?: string | null
          created_at?: string
          environment?: string
          error?: string | null
          expires_at?: string | null
          external_request?: Json | null
          external_response?: Json | null
          id?: string
          input?: Json | null
          instance_id: string
          output?: Json | null
          started_at?: string | null
          status?: string
          step_config?: Json | null
          step_index: number
          step_name?: string | null
          step_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_reasoning?: string | null
          approval_decision?: string | null
          approval_reason?: string | null
          approved_by?: string | null
          approved_by_agent_id?: string | null
          callback_token?: string | null
          completed_at?: string | null
          created_at?: string
          environment?: string
          error?: string | null
          expires_at?: string | null
          external_request?: Json | null
          external_response?: Json | null
          id?: string
          input?: Json | null
          instance_id?: string
          output?: Json | null
          started_at?: string | null
          status?: string
          step_config?: Json | null
          step_index?: number
          step_name?: string | null
          step_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_approved_by_agent_id_fkey"
            columns: ["approved_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_executions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_template_secrets: {
        Row: {
          created_at: string
          encrypted_value: string
          id: string
          secret_name: string
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_value: string
          id?: string
          secret_name: string
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_value?: string
          id?: string
          secret_name?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_template_secrets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps: Json
          tenant_id: string
          timeout_hours: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          tenant_id: string
          timeout_hours?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
          tenant_id?: string
          timeout_hours?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      x402_endpoints: {
        Row: {
          account_id: string
          asset_address: string | null
          base_price: number
          created_at: string
          currency: string
          description: string | null
          environment: string
          id: string
          method: string
          name: string
          network: string
          path: string
          payment_address: string | null
          status: string
          tenant_id: string
          total_calls: number
          total_revenue: number
          updated_at: string
          volume_discounts: Json | null
          webhook_url: string | null
        }
        Insert: {
          account_id: string
          asset_address?: string | null
          base_price: number
          created_at?: string
          currency?: string
          description?: string | null
          environment?: string
          id?: string
          method: string
          name: string
          network?: string
          path: string
          payment_address?: string | null
          status?: string
          tenant_id: string
          total_calls?: number
          total_revenue?: number
          updated_at?: string
          volume_discounts?: Json | null
          webhook_url?: string | null
        }
        Update: {
          account_id?: string
          asset_address?: string | null
          base_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          environment?: string
          id?: string
          method?: string
          name?: string
          network?: string
          path?: string
          payment_address?: string | null
          status?: string
          tenant_id?: string
          total_calls?: number
          total_revenue?: number
          updated_at?: string
          volume_discounts?: Json | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "x402_endpoints_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "x402_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      x402_vendor_ratings: {
        Row: {
          agent_id: string | null
          created_at: string
          host: string
          id: string
          note: string | null
          rated_by_id: string | null
          rated_by_name: string | null
          rated_by_type: string
          tenant_id: string
          thumb: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          host: string
          id?: string
          note?: string | null
          rated_by_id?: string | null
          rated_by_name?: string | null
          rated_by_type: string
          tenant_id: string
          thumb: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          host?: string
          id?: string
          note?: string | null
          rated_by_id?: string | null
          rated_by_name?: string | null
          rated_by_type?: string
          tenant_id?: string
          thumb?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "x402_vendor_ratings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "x402_vendor_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      x402_endpoint_performance: {
        Row: {
          avg_transaction_value: number | null
          endpoint_created_at: string | null
          endpoint_id: string | null
          endpoint_name: string | null
          failed_transactions: number | null
          last_transaction_at: string | null
          path: string | null
          status: string | null
          tenant_id: string | null
          total_calls: number | null
          total_fees: number | null
          total_revenue: number | null
          unique_payers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "x402_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_acp_checkout_totals: {
        Args: { p_checkout_id: string }
        Returns: {
          item_count: number
          subtotal: number
        }[]
      }
      calculate_agent_effective_limits: {
        Args: { p_agent_id: string }
        Returns: {
          daily_transaction_limit: number
          max_active_streams: number
          max_transaction_amount: number
          monthly_transaction_limit: number
        }[]
      }
      calculate_stream_balance: {
        Args: { p_stream_id: string }
        Returns: {
          available_balance: number
          held_balance: number
          total_funded: number
          total_streamed: number
        }[]
      }
      calculate_webhook_retry_at: {
        Args: { attempts: number }
        Returns: string
      }
      calculate_x402_fee:
        | { Args: { p_amount: number }; Returns: number }
        | { Args: { p_amount: number; p_tenant_id: string }; Returns: number }
      check_acp_checkout_valid: {
        Args: { p_checkout_id: string }
        Returns: boolean
      }
      check_ap2_mandate_valid: {
        Args: { p_amount: number; p_mandate_id: string }
        Returns: boolean
      }
      check_payment_method_limits: {
        Args: { p_payment_method_id: string; p_transaction_amount: number }
        Returns: {
          allowed: boolean
          daily_remaining: number
          monthly_remaining: number
          reason: string
        }[]
      }
      check_threshold_rules: {
        Args: {
          p_balance: number
          p_currency: string
          p_tenant_id: string
          p_wallet_id: string
        }
        Returns: {
          rule_id: string
          rule_name: string
          settlement_rail: string
          threshold_amount: number
        }[]
      }
      cleanup_expired_idempotency_keys: { Args: never; Returns: number }
      cleanup_expired_ucp_auth_codes: { Args: never; Returns: number }
      consume_agent_challenge: {
        Args: { p_agent_id: string; p_nonce: string }
        Returns: {
          agent_id: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          nonce: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "agent_challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      credit_account: {
        Args: {
          p_account_id: string
          p_amount: number
          p_description: string
          p_reference_id: string
          p_reference_type: string
        }
        Returns: boolean
      }
      debit_account: {
        Args: {
          p_account_id: string
          p_amount: number
          p_description: string
          p_reference_id: string
          p_reference_type: string
        }
        Returns: boolean
      }
      ensure_scanner_usage_partitions: {
        Args: { p_months_ahead?: number }
        Returns: {
          created_partition: string
        }[]
      }
      expire_pending_approvals: { Args: never; Returns: number }
      expire_workflow_instances: { Args: never; Returns: number }
      expire_workflow_steps: { Args: never; Returns: number }
      find_applicable_settlement_rules: {
        Args: {
          p_tenant_id: string
          p_transfer_type?: string
          p_wallet_id?: string
        }
        Returns: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          maximum_amount: number | null
          maximum_currency: string | null
          metadata: Json | null
          minimum_amount: number | null
          minimum_currency: string | null
          name: string
          priority: number | null
          settlement_priority: string
          settlement_rail: string
          tenant_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
          wallet_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "settlement_rules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_card_activity: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_payment_method_id: string
        }
        Returns: {
          amount: number
          card_last_four: string
          currency: string
          id: string
          is_disputed: boolean
          merchant_category: string
          merchant_name: string
          status: string
          transaction_time: string
          type: string
        }[]
      }
      get_card_spending_summary: {
        Args: { p_days?: number; p_payment_method_id: string }
        Returns: {
          avg_transaction: number
          largest_transaction: number
          merchant_count: number
          most_frequent_merchant: string
          total_spent: number
          transaction_count: number
        }[]
      }
      get_dashboard_account_stats: {
        Args: { p_tenant_id: string }
        Returns: {
          business_accounts: number
          new_accounts_30d: number
          person_accounts: number
          total_accounts: number
          verified_accounts: number
        }[]
      }
      get_monthly_volume: {
        Args: { p_months?: number; p_tenant_id: string }
        Returns: {
          month: string
          total_volume: number
          transaction_count: number
          us_arg_volume: number
          us_col_volume: number
          us_mex_volume: number
        }[]
      }
      get_pending_approval_amount: {
        Args: { p_wallet_id: string }
        Returns: number
      }
      get_pending_approval_count: {
        Args: { p_wallet_id: string }
        Returns: number
      }
      get_stream_netflow: {
        Args: { p_tenant_id: string }
        Returns: {
          inflow_stream_count: number
          net_flow_per_day: number
          net_flow_per_hour: number
          net_flow_per_month: number
          outflow_stream_count: number
          total_inflow_per_month: number
          total_outflow_per_month: number
        }[]
      }
      get_treasury_currency_summary: {
        Args: { p_tenant_id: string }
        Returns: {
          account_count: number
          available_balance: number
          balance_in_streams: number
          currency: string
          health_status: string
          stream_utilization_pct: number
          total_balance: number
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_x402_revenue_timeseries:
        | {
            Args: {
              p_currency?: string
              p_end_date: string
              p_endpoint_id?: string
              p_start_date: string
              p_tenant_id: string
              p_trunc_by?: string
            }
            Returns: {
              fees: number
              revenue: number
              time_bucket: string
              transaction_count: number
            }[]
          }
        | {
            Args: {
              p_end_date: string
              p_start_date: string
              p_tenant_id: string
            }
            Returns: {
              date: string
              revenue: number
            }[]
          }
      hold_for_stream: {
        Args: {
          p_account_id: string
          p_amount: number
          p_buffer: number
          p_stream_id: string
        }
        Returns: boolean
      }
      increment_agent_counters: {
        Args: { p_agent_id: string; p_volume: number }
        Returns: undefined
      }
      log_audit: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_name: string
          p_actor_type: string
          p_changes?: Json
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_tenant_id: string
        }
        Returns: string
      }
      queue_webhook_delivery: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_idempotency_key?: string
          p_payload: Json
          p_tenant_id: string
        }
        Returns: string[]
      }
      recalculate_agent_effective_limits: {
        Args: { p_agent_id: string }
        Returns: undefined
      }
      record_agent_usage: {
        Args: { p_agent_id: string; p_amount: number }
        Returns: string
      }
      release_from_stream: {
        Args: {
          p_account_id: string
          p_return_buffer: number
          p_stream_id: string
          p_streamed_amount: number
        }
        Returns: boolean
      }
      reset_funding_source_daily_usage: { Args: never; Returns: undefined }
      reset_funding_source_monthly_usage: { Args: never; Returns: undefined }
      reveal_double_blind_ratings: {
        Args: { feedback_id_a: string; feedback_id_b: string }
        Returns: undefined
      }
      scanner_credit_debit: {
        Args: {
          p_cost: number
          p_metadata?: Json
          p_source: string
          p_tenant_id: string
        }
        Returns: number
      }
      scanner_credit_grant: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_source: string
          p_tenant_id: string
        }
        Returns: number
      }
      settle_x402_payment:
        | {
            Args: {
              p_consumer_wallet_id: string
              p_gross_amount: number
              p_net_amount: number
              p_provider_tenant_id?: string
              p_provider_wallet_id: string
              p_tenant_id: string
              p_transfer_id: string
            }
            Returns: Json
          }
        | {
            Args: { p_payment_id: string; p_settlement_tx: string }
            Returns: boolean
          }
      update_payment_method_spending: {
        Args: { p_payment_method_id: string; p_transaction_amount: number }
        Returns: undefined
      }
      update_signing_key_usage: {
        Args: { p_key_id: string }
        Returns: undefined
      }
      x402_vendor_reliability: {
        Args: { p_environment?: string; p_since?: string; p_tenant_id: string }
        Returns: {
          avg_duration_ms: number
          avg_response_size: number
          cancelled_count: number
          classification_histogram: Json
          completed_count: number
          first_seen_at: string
          host: string
          last_failure_at: string
          last_success_at: string
          marketplace: string
          pending_count: number
          settlement_network: string
          success_rate: number
          total_calls: number
          total_usdc_authorized_unredeemed: number
          total_usdc_paid_unreturned: number
          total_usdc_spent: number
        }[]
      }
    }
    Enums: {
      funding_source_status:
        | "pending"
        | "verifying"
        | "active"
        | "failed"
        | "suspended"
        | "removed"
      funding_source_type:
        | "card"
        | "bank_account_us"
        | "bank_account_eu"
        | "bank_account_latam"
        | "crypto_wallet"
      funding_transaction_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "refunded"
      workflow_instance_status:
        | "pending"
        | "running"
        | "paused"
        | "completed"
        | "failed"
        | "cancelled"
        | "timed_out"
      workflow_step_status:
        | "pending"
        | "running"
        | "waiting_approval"
        | "waiting_external"
        | "waiting_schedule"
        | "approved"
        | "rejected"
        | "completed"
        | "failed"
        | "skipped"
        | "timed_out"
      workflow_step_type:
        | "approval"
        | "condition"
        | "action"
        | "wait"
        | "notification"
        | "external"
      workflow_trigger_type: "manual" | "on_transfer" | "on_event"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      funding_source_status: [
        "pending",
        "verifying",
        "active",
        "failed",
        "suspended",
        "removed",
      ],
      funding_source_type: [
        "card",
        "bank_account_us",
        "bank_account_eu",
        "bank_account_latam",
        "crypto_wallet",
      ],
      funding_transaction_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      workflow_instance_status: [
        "pending",
        "running",
        "paused",
        "completed",
        "failed",
        "cancelled",
        "timed_out",
      ],
      workflow_step_status: [
        "pending",
        "running",
        "waiting_approval",
        "waiting_external",
        "waiting_schedule",
        "approved",
        "rejected",
        "completed",
        "failed",
        "skipped",
        "timed_out",
      ],
      workflow_step_type: [
        "approval",
        "condition",
        "action",
        "wait",
        "notification",
        "external",
      ],
      workflow_trigger_type: ["manual", "on_transfer", "on_event"],
    },
  },
} as const
