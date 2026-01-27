'use client';

import { useState } from 'react';
import {
    Terminal,
    Book,
    Key,
    Code,
    Download,
    ExternalLink,
    Zap,
    ShoppingCart,
    Bot,
    Globe,
    Plus,
    Trash2,
    Copy,
    Check
} from 'lucide-react';
import { Card, Button, Input, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@sly/ui';
import { CodeBlock } from './components/code-block';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DevelopersPage() {
    const [activeTab, setActiveTab] = useState('x402-provider');

    // Mock API Key state
    const [apiKeys, setApiKeys] = useState([
        { id: 'pk_live_51M...', name: 'Production Key', type: 'Live', created: '2025-01-01', lastUsed: '2 hours ago' },
        { id: 'pk_test_51M...', name: 'Development Key', type: 'Test', created: '2025-01-15', lastUsed: 'Just now' }
    ]);

    const handleCreateKey = () => {
        const newKey = {
            id: `pk_test_${Math.random().toString(36).substring(2, 15)}`,
            name: 'New Test Key',
            type: 'Test',
            created: new Date().toISOString().split('T')[0],
            lastUsed: 'Never'
        };
        setApiKeys([...apiKeys, newKey]);
        toast.success('New API key generated');
    };

    const handleDeleteKey = (id: string) => {
        if (confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
            setApiKeys(apiKeys.filter(k => k.id !== id));
            toast.success('API key revoked');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const codeExamples = {
        'x402-provider':
            `import { Sly } from '@sly/sdk';

// Initialize SDK
const sly = new Sly({ apiKey: process.env.SLY_SECRET_KEY });

// Create an x402-protected endpoint
app.post('/api/generate-image', async (req, res) => {
  // 1. Create a payment quote
  const quote = await sly.x402.createQuote({
    amount: 0.05,
    currency: 'USDC',
    description: 'AI Image Generation'
  });

  // 2. Return 402 Payment Required
  if (!req.headers['authorization']) {
    return res.status(402)
      .header('WWW-Authenticate', \`x402 \${quote.id}\`)
      .json(quote);
  }

  // 3. Verify Payment
  const { valid } = await sly.x402.verifyPayment(
    req.headers['authorization']
  );

  if (!valid) return res.status(403).json({ error: 'Invalid Payment' });

  // 4. Serve Content
  const image = await generateAIImage(req.body.prompt);
  res.json({ url: image });
});`,
        'x402-consumer':
            `import { Sly } from '@sly/sdk';

// Initialize client SDK
const sly = new Sly({ apiKey: process.env.NEXT_PUBLIC_SLY_KEY });

async function fetchPaidContent() {
  try {
    // The SDK automatically handles 402 responses and payments
    const response = await sly.fetch('https://api.example.com/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'A futuristic city' })
    });
    
    const data = await response.json();
    console.log('Image URL:', data.url);
    
  } catch (error) {
    console.error('Payment failed:', error);
  }
}`,
        'ap2-agent':
            `import { AP2Client } from '@sly/ap2-sdk';

const client = new AP2Client({
  agentId: 'agent_12345',
  apiKey: process.env.PAYOS_API_KEY
});

// Request a spending mandate
const mandate = await client.mandates.request({
    accountId: 'acc_user_789',
    budget: {
        limit: 100,
        currency: 'USDC',
        period: 'monthly'
    },
    constraints: {
        categories: ['software', 'hosting']
    }
});

console.log('Mandate Status:', mandate.status); // 'pending_approval'`,
        'acp-checkout':
            `import { ACPCheckout } from '@sly/react';

function CheckoutPage() {
  return (
    <ACPCheckout
      cart={{
        items: [
           { id: 'item_1', name: 'Premium Plan', price: 29.99 }
        ]
      }}
      agentId="agent_sales_bot"
      onSuccess={(tx) => console.log('Order complete:', tx.id)}
    />
  );
}`
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-12">
            {/* Header */}
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Developer Resources</h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 max-w-3xl">
                    Build the next generation of AI-native commerce apps. Integrate <span className="text-blue-600 font-medium">x402</span> for micropayments, <span className="text-green-600 font-medium">AP2</span> for autonomous agents, and <span className="text-orange-600 font-medium">ACP</span> for smart checkout flows.
                </p>
                <div className="flex gap-4 pt-2">
                    <Button variant="outline" className="gap-2">
                        <Book className="w-4 h-4" /> Documentation
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Terminal className="w-4 h-4" /> API Reference
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Globe className="w-4 h-4" /> Community
                    </Button>
                </div>
            </div>

            {/* Quick Start Protocols */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">x402 Protocol</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 min-h-[40px]">
                        HTTP 402 Payment Required standard for machine-to-machine micropayments.
                    </p>
                    <div className="space-y-3">
                        <div className="text-xs font-semibold text-gray-400 uppercase">Use Cases</div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary">API Monetization</Badge>
                            <Badge variant="secondary">Content Paywalls</Badge>
                            <Badge variant="secondary">LLM Inference</Badge>
                        </div>
                    </div>
                    <Button className="w-full mt-6 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        Start with x402 <ExternalLink className="w-4 h-4" />
                    </Button>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-green-500">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4">
                        <Bot className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AP2 Protocol</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 min-h-[40px]">
                        Agentic Payment Protocol for autonomous spending mandates and budget control.
                    </p>
                    <div className="space-y-3">
                        <div className="text-xs font-semibold text-gray-400 uppercase">Use Cases</div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary">Shopping Assistants</Badge>
                            <Badge variant="secondary">SaaS Auto-Scaling</Badge>
                            <Badge variant="secondary">DAO Agents</Badge>
                        </div>
                    </div>
                    <Button className="w-full mt-6 gap-2 bg-green-600 hover:bg-green-700 text-white">
                        Start with AP2 <ExternalLink className="w-4 h-4" />
                    </Button>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
                        <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ACP Protocol</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 min-h-[40px]">
                        Agentic Commerce Protocol for standardizing shopping carts and checkout flows.
                    </p>
                    <div className="space-y-3">
                        <div className="text-xs font-semibold text-gray-400 uppercase">Use Cases</div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary">Universal Checkout</Badge>
                            <Badge variant="secondary">B2B Procurement</Badge>
                            <Badge variant="secondary">Multi-Vendor Cart</Badge>
                        </div>
                    </div>
                    <Button className="w-full mt-6 gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                        Start with ACP <ExternalLink className="w-4 h-4" />
                    </Button>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* Code Examples */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Code className="w-5 h-5 text-gray-500" />
                            Integration Examples
                        </h2>
                        <Link href="#" className="text-sm text-blue-600 hover:underline">View all examples</Link>
                    </div>

                    <Card className="overflow-hidden border-0 bg-gray-950 shadow-2xl">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-800">
                                <TabsList className="bg-transparent gap-2">
                                    <TabsTrigger value="x402-provider" className="data-[state=active]:bg-gray-800 data-[state=active]:text-blue-400 text-gray-400">x402 Provider</TabsTrigger>
                                    <TabsTrigger value="x402-consumer" className="data-[state=active]:bg-gray-800 data-[state=active]:text-blue-400 text-gray-400">x402 Consumer</TabsTrigger>
                                    <TabsTrigger value="ap2-agent" className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 text-gray-400">AP2 Agent</TabsTrigger>
                                    <TabsTrigger value="acp-checkout" className="data-[state=active]:bg-gray-800 data-[state=active]:text-orange-400 text-gray-400">ACP Checkout</TabsTrigger>
                                </TabsList>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                                </div>
                            </div>

                            <div className="p-0">
                                <TabsContent value="x402-provider" className="m-0">
                                    <CodeBlock code={codeExamples['x402-provider']} className="rounded-none border-0" />
                                </TabsContent>
                                <TabsContent value="x402-consumer" className="m-0">
                                    <CodeBlock code={codeExamples['x402-consumer']} className="rounded-none border-0" />
                                </TabsContent>
                                <TabsContent value="ap2-agent" className="m-0">
                                    <CodeBlock code={codeExamples['ap2-agent']} className="rounded-none border-0" />
                                </TabsContent>
                                <TabsContent value="acp-checkout" className="m-0">
                                    <CodeBlock code={codeExamples['acp-checkout']} className="rounded-none border-0" />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </Card>
                </div>

                {/* API Keys & SDKs */}
                <div className="space-y-8">

                    {/* API Keys */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Key className="w-5 h-5 text-gray-500" />
                                API Keys
                            </h2>
                            <Button size="sm" onClick={handleCreateKey}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Key
                            </Button>
                        </div>
                        <Card className="overflow-hidden">
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {apiKeys.map(key => (
                                    <div key={key.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 dark:text-white">{key.name}</span>
                                                <Badge variant={key.type === 'Live' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                                    {key.type}
                                                </Badge>
                                            </div>
                                            <div className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                                                {key.id}
                                            </div>
                                            <p className="text-xs text-gray-400">Created {key.created} • Last used {key.lastUsed}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => copyToClipboard(key.id)}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteKey(key.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* SDKs */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Download className="w-5 h-5 text-gray-500" />
                            Official SDKs
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 flex items-center justify-between hover:border-blue-500 transition cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#F7DF1E]/20 rounded-lg flex items-center justify-center text-[#F7DF1E] font-bold">JS</div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition">Node.js</p>
                                        <p className="text-xs text-gray-500">v2.4.0</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </Card>
                            <Card className="p-4 flex items-center justify-between hover:border-blue-500 transition cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#3776AB]/20 rounded-lg flex items-center justify-center text-[#3776AB] font-bold">Py</div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition">Python</p>
                                        <p className="text-xs text-gray-500">v1.8.2</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </Card>
                            <Card className="p-4 flex items-center justify-between hover:border-blue-500 transition cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#00ADD8]/20 rounded-lg flex items-center justify-center text-[#00ADD8] font-bold">Go</div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition">Go</p>
                                        <p className="text-xs text-gray-500">v1.2.0</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </Card>
                            <Card className="p-4 flex items-center justify-between hover:border-blue-500 transition cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 font-bold">C#</div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition">.NET</p>
                                        <p className="text-xs text-gray-500">v1.0.0</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </Card>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
