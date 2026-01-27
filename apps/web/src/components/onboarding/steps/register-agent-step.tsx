'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, CheckCircle, Info, Shield } from 'lucide-react';
import { cn } from '@payos/ui';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { toast } from 'sonner';

interface RegisterAgentStepProps {
  onAgentRegistered: (agentId: string, token: string) => void;
  helpText?: string;
}

const KYA_TIERS = [
  {
    value: 0,
    label: 'Tier 0 - Minimal',
    limit: '$100/month',
    desc: 'Basic verification, lowest limits',
  },
  {
    value: 1,
    label: 'Tier 1 - Basic',
    limit: '$500/month',
    desc: 'Standard verification, moderate limits',
  },
  {
    value: 2,
    label: 'Tier 2 - Verified',
    limit: '$5,000/month',
    desc: 'Enhanced verification, high limits',
  },
  {
    value: 3,
    label: 'Tier 3 - Enterprise',
    limit: 'Unlimited',
    desc: 'Full verification, no limits',
  },
];

export function RegisterAgentStep({
  onAgentRegistered,
  helpText = 'Agents need identity to create mandates. Set KYA (Know Your Agent) tier based on risk.',
}: RegisterAgentStepProps) {
  const api = useApiClient();
  const { authToken } = useApiConfig();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kyaTier: 1,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<{
    id: string;
    name: string;
    token: string;
    kyaTier: number;
  } | null>(null);
  const [accountId, setAccountId] = useState<string>('');

  // Fetch account ID
  useEffect(() => {
    async function fetchAccountId() {
      if (!api) return;
      try {
        const accountsResponse = await api.accounts.list({ limit: 1 });
        if (accountsResponse.data && accountsResponse.data.length > 0) {
          setAccountId(accountsResponse.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch account:', error);
      }
    }
    fetchAccountId();
  }, [api]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !accountId) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await api.agents.create({
        parentAccountId: accountId,
        name: formData.name,
        description: formData.description,
      });

      // Response structure: { data: Agent, credentials: AgentCredentials }
      const agent = response.data;
      const credentials = response.credentials;

      setCreatedAgent({
        id: agent.id,
        name: agent.name,
        token: credentials?.token || '[Token hidden for security]',
        kyaTier: agent.kyaTier || formData.kyaTier,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });

      toast.success('Agent registered successfully!');
      onAgentRegistered(agent.id, credentials?.token || '');
    } catch (err: any) {
      setError(err.message || 'Failed to register agent');
      toast.error('Failed to register agent');
    } finally {
      setIsCreating(false);
    }
  };

  if (createdAgent) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agent Registered!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your AI agent is ready to create payment mandates
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Agent Name</span>
            <span className="font-medium text-gray-900 dark:text-white">{createdAgent.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">KYA Tier</span>
            <span className="font-medium text-gray-900 dark:text-white">
              Tier {createdAgent.kyaTier}
            </span>
          </div>
        </div>

        {createdAgent.token && createdAgent.token !== '[Token hidden for security]' && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                  Agent Token
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 mb-2">
                  Save this token securely. It won't be shown again.
                </p>
                <code className="block p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-xs font-mono break-all text-amber-900 dark:text-amber-100">
                  {createdAgent.token}
                </code>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Click <strong>Continue</strong> to proceed to the next step
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Help tip */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">{helpText}</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Agent Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Shopping Agent"
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Handles subscription renewals"
            rows={2}
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            KYA (Know Your Agent) Tier
          </label>
          <div className="space-y-2">
            {KYA_TIERS.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, kyaTier: tier.value }))}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all',
                  formData.kyaTier === tier.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{tier.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tier.desc}</div>
                  </div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {tier.limit}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating || !accountId || !formData.name}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registering Agent...
            </>
          ) : (
            <>
              <Bot className="w-5 h-5" />
              Register Agent
            </>
          )}
        </button>
      </form>
    </div>
  );
}
