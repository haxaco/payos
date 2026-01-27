'use client';

/**
 * AP2 Integration Guide Page
 * 
 * Documentation for integrating with the Agent Payment Protocol (AP2).
 */

import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Badge
} from '@sly/ui';
import {
    Copy,
    CheckCircle2,
    Code,
    Zap,
    CreditCard,
    Book,
    ExternalLink,
    Bot
} from 'lucide-react';

export default function Ap2IntegrationPage() {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const apiClientInstall = `npm install @sly/api-client`;

    const createMandateExample = `import { SlyClient } from '@sly/api-client';

const client = new SlyClient({
  apiKey: process.env.SLY_API_KEY
});

// Create a payment mandate for an AI agent
const { data: mandate } = await client.ap2.create({
  mandate_id: 'mandate_travel_bot_001',
  mandate_type: 'payment',
  agent_id: 'agent_travel_assistant',
  agent_name: 'Travel Bot',
  account_id: 'acc_123456789',
  authorized_amount: 1000, // 1000 USDC limit
  currency: 'USDC',
  expires_at: '2026-12-31T23:59:59Z'
});

console.log('Mandate created:', mandate.id);`;

    const executePaymentExample = `// Agent executes a payment against the mandate
const { data: execution } = await client.ap2.execute(mandate.id, {
  amount: 50.00,
  currency: 'USDC',
  description: 'Flight booking fee',
  authorization_proof: 'jwt_proof_from_agent' // Optional
});

console.log('Payment executed:', execution.transfer_id);
console.log('Remaining balance:', execution.mandate.remaining_amount);`;

    const curlCreateExample = `curl https://api.payos.com/v1/ap2/mandates \\
  -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mandate_id": "mandate_travel_bot_001",
    "mandate_type": "payment",
    "agent_id": "agent_travel_assistant",
    "account_id": "acc_123456789",
    "authorized_amount": 1000,
    "currency": "USDC"
  }'`;

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AP2 Integration Guide</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Integrate Agentic Payments into your application
                </p>
            </div>

            {/* Quick Start Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-blue-200 dark:border-blue-900">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                                <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <CardTitle>Mandate Concept</CardTitle>
                                <CardDescription>Pre-authorized budgets</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Create mandates to give AI agents a specific budget and authorized actions.
                            Agents can then execute payments autonomously within these limits.
                        </p>
                        <div className="flex gap-2">
                            <Badge>Budgets</Badge>
                            <Badge>Auth Proofs</Badge>
                            <Badge>Capping</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 border-green-200 dark:border-green-900">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                                <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <CardTitle>Execution</CardTitle>
                                <CardDescription>Autonomous payments</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Agents execute payments against mandates instantly without requiring
                            user approval for every transaction, as long as it's within the mandate.
                        </p>
                        <div className="flex gap-2">
                            <Badge>Instant</Badge>
                            <Badge>Idempotent</Badge>
                            <Badge variant="outline">Low Latency</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Integration Tabs */}
            <Tabs defaultValue="sdk" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sdk">Node.js SDK</TabsTrigger>
                    <TabsTrigger value="api">REST API</TabsTrigger>
                </TabsList>

                {/* SDK Tab */}
                <TabsContent value="sdk" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Installation</CardTitle>
                            <CardDescription>Install the Sly API Client</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                                    <code className="text-sm">{apiClientInstall}</code>
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(apiClientInstall, 'install')}
                                >
                                    {copiedCode === 'install' ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>1. Create a Mandate</CardTitle>
                            <CardDescription>Authorize an agent with a budget</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                                    <code className="text-sm">{createMandateExample}</code>
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(createMandateExample, 'create-example')}
                                >
                                    {copiedCode === 'create-example' ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>2. Execute Payment</CardTitle>
                            <CardDescription>Agent consumes the budget</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                                    <code className="text-sm">{executePaymentExample}</code>
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(executePaymentExample, 'execute-example')}
                                >
                                    {copiedCode === 'execute-example' ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API Tab */}
                <TabsContent value="api" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Mandate (cURL)</CardTitle>
                            <CardDescription>Direct API call example</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                                    <code className="text-sm">{curlCreateExample}</code>
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(curlCreateExample, 'curl-create')}
                                >
                                    {copiedCode === 'curl-create' ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>API Endpoints</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <Badge className="mb-2">POST</Badge>
                                    <code className="text-xs">/v1/ap2/mandates</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">Create a new mandate</p>
                                </div>
                                <div>
                                    <Badge className="mb-2">POST</Badge>
                                    <code className="text-xs">/v1/ap2/mandates/:id/execute</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">Execute a payment against a mandate</p>
                                </div>
                                <div>
                                    <Badge variant="secondary" className="mb-2">GET</Badge>
                                    <code className="text-xs">/v1/ap2/mandates</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">List existing mandates</p>
                                </div>
                                <div>
                                    <Badge variant="destructive" className="mb-2">PATCH</Badge>
                                    <code className="text-xs">/v1/ap2/mandates/:id/cancel</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">Cancel an active mandate</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Resources */}
            <Card>
                <CardHeader>
                    <CardTitle>Related Resources</CardTitle>
                    <CardDescription>Learn more about implementing Agentic Payments</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a
                            href="/dashboard/agentic-payments/ap2/mandates"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                            <Bot className="h-5 w-5 text-blue-500" />
                            <div className="flex-1">
                                <div className="font-medium">Manage Mandates</div>
                                <div className="text-sm text-gray-500">View and create mandates in UI</div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>

                        <a
                            href="/dashboard/agentic-payments/analytics"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                            <Zap className="h-5 w-5 text-green-500" />
                            <div className="flex-1">
                                <div className="font-medium">View Analytics</div>
                                <div className="text-sm text-gray-500">Track agent spending</div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
