'use client';

/**
 * ACP Integration Guide Page
 * 
 * Documentation for integrating with the Agentic Commerce Protocol (ACP).
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
} from '@payos/ui';
import {
    Copy,
    CheckCircle2,
    Code,
    Zap,
    CreditCard,
    Book,
    ExternalLink,
    ShoppingBag
} from 'lucide-react';

export default function AcpIntegrationPage() {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const apiClientInstall = `npm install @payos/api-client`;

    const createCheckoutExample = `import { PayOSClient } from '@payos/api-client';

const client = new PayOSClient({
  apiKey: process.env.PAYOS_API_KEY
});

// Create a checkout for a customer
const { data: checkout } = await client.acp.create({
  merchant_id: 'merchant_123',
  customer_id: 'cust_456',
  items: [
    {
      name: 'Premium Subscription',
      unit_price: 29.99,
      quantity: 1,
      currency: 'USD'
    }
  ],
  total_amount: 29.99,
  currency: 'USD',
  return_url: 'https://myshop.com/checkout/complete',
  cancel_url: 'https://myshop.com/checkout/cancel'
});

console.log('Checkout created:', checkout.id);`;

    const completeCheckoutExample = `// Complete the checkout with a payment token
const { data: result } = await client.acp.complete(checkout.id, {
  shared_payment_token: 'spt_789abc',
  payment_method: 'pm_card_visa' // Optional if SPT has default
});

console.log('Checkout completed:', result.status);`;

    const curlCreateExample = `curl https://api.payos.com/v1/acp/checkouts \\
  -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_id": "merchant_123",
    "customer_id": "cust_456",
    "items": [
      {
        "name": "Premium Subscription",
        "unit_price": 29.99,
        "quantity": 1
      }
    ],
    "total_amount": 29.99,
    "currency": "USD",
    "return_url": "https://myshop.com/complete"
  }'`;

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">ACP Integration Guide</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Integrate Agentic Commerce Protocol into your application
                </p>
            </div>

            {/* Quick Start Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-indigo-200 dark:border-indigo-900">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg">
                                <ShoppingBag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle>Checkouts</CardTitle>
                                <CardDescription>Flexible payment intents</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Create checkouts for agents or users to pay.
                            Supports complex item lists, taxes, shipping, and discounts.
                        </p>
                        <div className="flex gap-2">
                            <Badge>Multi-item</Badge>
                            <Badge>Async</Badge>
                            <Badge>Secure</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 dark:border-purple-900">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <CardTitle>Agent Completion</CardTitle>
                                <CardDescription>Automated fulfillment</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Agents can complete checkouts programmatically using Shared Payment Tokens,
                            enabling autonomous commerce flows.
                        </p>
                        <div className="flex gap-2">
                            <Badge>Programmatic</Badge>
                            <Badge>Instant</Badge>
                            <Badge variant="outline">Agent Ready</Badge>
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
                            <CardDescription>Install the PayOS API Client</CardDescription>
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
                            <CardTitle>1. Create a Checkout</CardTitle>
                            <CardDescription>Initiate a payment request</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                                    <code className="text-sm">{createCheckoutExample}</code>
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(createCheckoutExample, 'create-example')}
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
                            <CardTitle>2. Complete Checkout</CardTitle>
                            <CardDescription>Finalize the transaction</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                                    <code className="text-sm">{completeCheckoutExample}</code>
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(completeCheckoutExample, 'complete-example')}
                                >
                                    {copiedCode === 'complete-example' ? (
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
                            <CardTitle>Create Checkout (cURL)</CardTitle>
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
                                    <code className="text-xs">/v1/acp/checkouts</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">Create a new checkout</p>
                                </div>
                                <div>
                                    <Badge className="mb-2">POST</Badge>
                                    <code className="text-xs">/v1/acp/checkouts/:id/complete</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">Combine a checkout with a payment token</p>
                                </div>
                                <div>
                                    <Badge variant="secondary" className="mb-2">GET</Badge>
                                    <code className="text-xs">/v1/acp/checkouts</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">List checkouts</p>
                                </div>
                                <div>
                                    <Badge variant="destructive" className="mb-2">PATCH</Badge>
                                    <code className="text-xs">/v1/acp/checkouts/:id/cancel</code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">Cancel a pending checkout</p>
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
                    <CardDescription>Learn more about implementing Agentic Commerce</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a
                            href="/dashboard/agentic-payments/acp/checkouts"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                            <ShoppingBag className="h-5 w-5 text-indigo-500" />
                            <div className="flex-1">
                                <div className="font-medium">Manage Checkouts</div>
                                <div className="text-sm text-gray-500">View and create checkouts in UI</div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>

                        <a
                            href="/dashboard/agentic-payments/acp/analytics"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                            <Zap className="h-5 w-5 text-purple-500" />
                            <div className="flex-1">
                                <div className="font-medium">View Analytics</div>
                                <div className="text-sm text-gray-500">Track revenue and status</div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
