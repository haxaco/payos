'use client';

import { useState, useCallback } from 'react';
import {
  Terminal,
  Globe,
  Code2,
  Cpu,
  Copy,
  Check,
  ChevronRight,
  MessageSquare,
  Blocks,
} from 'lucide-react';
import {
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@sly/ui';
import { useApiConfig } from '@/lib/api-client';

interface RegisterAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function RegisterAgentDialog({ open, onOpenChange }: RegisterAgentDialogProps) {
  const { apiUrl } = useApiConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const baseUrl = apiUrl || 'https://api.getsly.ai';

  const METHODS = [
    {
      id: 'a2a-skill',
      icon: MessageSquare,
      iconBg: 'bg-blue-100 dark:bg-blue-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'A2A Skill',
      desc: 'Agent-to-agent registration via the register_agent skill',
      snippet: `POST ${baseUrl}/v1/auth/agent-signup
Content-Type: application/json

{
  "name": "My Agent",
  "email": "agent@example.com"
}`,
    },
    {
      id: 'rest-api',
      icon: Code2,
      iconBg: 'bg-purple-100 dark:bg-purple-950',
      iconColor: 'text-purple-600 dark:text-purple-400',
      title: 'REST API',
      desc: 'One-click registration — creates tenant, account, wallet, and agent',
      snippet: `curl -X POST ${baseUrl}/v1/onboarding/agent/one-click \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Agent",
    "email": "agent@example.com"
  }'`,
    },
    {
      id: 'mcp',
      icon: Cpu,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'MCP Server',
      desc: 'Add to Claude Desktop, Gemini, or Cursor — runs automatically',
      snippet: `// Add to .mcp.json or Claude Desktop config:
{
  "mcpServers": {
    "sly": {
      "command": "npx",
      "args": ["@sly_ai/mcp-server"],
      "env": {
        "SLY_API_KEY": "<your_api_key>"
      }
    }
  }
}`,
    },
    {
      id: 'openai-action',
      icon: Globe,
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      title: 'OpenAI Action',
      desc: 'Import the OpenAPI spec into a custom GPT as an action',
      snippet: `// Import this URL as a GPT Action:
${baseUrl}/v1/openapi-actions.json

// Authentication: API Key
// Header: Authorization
// Value: Bearer pk_test_...`,
    },
    {
      id: 'cli',
      icon: Terminal,
      iconBg: 'bg-orange-100 dark:bg-orange-950',
      iconColor: 'text-orange-600 dark:text-orange-400',
      title: 'CLI',
      desc: 'Register and manage agents from the command line',
      snippet: `npx @sly_ai/cli agents create \\
  --name "My Agent" \\
  --account-id <ACCOUNT_ID>`,
    },
    {
      id: 'sdk',
      icon: Blocks,
      iconBg: 'bg-pink-100 dark:bg-pink-950',
      iconColor: 'text-pink-600 dark:text-pink-400',
      title: 'SDK',
      desc: 'TypeScript/Node.js SDK for programmatic agent management',
      snippet: `import Sly from '@sly_ai/sdk';

const sly = new Sly({ apiKey: 'pk_test_...' });
const agent = await sly.agents.create({
  name: 'My Agent',
  accountId: '<ACCOUNT_ID>',
});
console.log(agent.credentials.token);`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Agent</DialogTitle>
          <DialogDescription>
            Choose an integration method to register a new agent.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-2">
          {METHODS.map((method) => {
            const Icon = method.icon;
            const isExpanded = expandedId === method.id;

            return (
              <div key={method.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : method.id)}
                  className={cn(
                    'w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all text-left group',
                    isExpanded
                      ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', method.iconBg)}>
                    <Icon className={cn('w-4.5 h-4.5', method.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{method.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{method.desc}</div>
                  </div>
                  <ChevronRight className={cn(
                    'w-4 h-4 text-gray-400 transition-transform flex-shrink-0',
                    isExpanded && 'rotate-90'
                  )} />
                </button>
                {isExpanded && (
                  <div className="mt-2 ml-[52px] mr-2">
                    <div className="relative bg-gray-900 dark:bg-gray-950 rounded-lg p-3 pr-9">
                      <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                        {method.snippet}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <CopyButton text={method.snippet} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
