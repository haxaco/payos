'use client';

/**
 * x402 Integration Guide Page
 * 
 * Complete guide with SDK installation, code samples, and API documentation.
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
  ExternalLink 
} from 'lucide-react';

export default function X402IntegrationPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const providerInstall = `npm install @sly/x402-provider-sdk`;
  
  const providerExample = `import { X402Provider } from '@sly/x402-provider-sdk';
import express from 'express';

const app = express();

// Initialize provider
const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: process.env.PAYOS_API_KEY,
  accountId: process.env.PAYOS_ACCOUNT_ID
});

// Register your endpoint
await provider.registerEndpoint('/api/premium-data', 'GET', {
  name: 'Premium Data API',
  basePrice: 0.001, // 0.001 USDC per call
  currency: 'USDC',
  description: 'Access to premium datasets'
});

// Protect with middleware
app.get('/api/premium-data', provider.middleware(), (req, res) => {
  // Payment verified! Serve your content
  res.json({
    data: 'Your premium data here',
    payment: req.x402Payment
  });
});

app.listen(3000);`;

  const consumerInstall = `npm install @sly/x402-client-sdk`;

  const consumerExample = `import { X402Client } from '@sly/x402-client-sdk';

// Initialize client
const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: process.env.PAYOS_WALLET_ID,
  auth: process.env.PAYOS_API_KEY,
  debug: true
});

// Call x402-protected API (payment handled automatically!)
const response = await client.fetch('https://api.example.com/premium-data', {
  autoRetry: true,
  onPayment: (payment) => {
    console.log('Paid:', payment.amount, payment.currency);
  }
});

const data = await response.json();`;

  const curlExample = `# Get a quote
curl https://api.payos.com/v1/x402/quote/{endpointId} \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Process payment
curl https://api.payos.com/v1/x402/pay \\
  -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "endpointId": "endpoint-uuid",
    "requestId": "unique-request-id",
    "amount": 0.001,
    "currency": "USDC",
    "walletId": "wallet-uuid",
    "method": "GET",
    "path": "/api/premium-data",
    "timestamp": 1703232000000
  }'`;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">x402 Integration Guide</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Get started with x402 in minutes
        </p>
      </div>

      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Provider SDK</CardTitle>
                <CardDescription>Monetize your APIs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add payment middleware to your Express, Hono, or Fastify API in minutes.
            </p>
            <div className="flex gap-2">
              <Badge>Express</Badge>
              <Badge>Hono</Badge>
              <Badge>Fastify</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Consumer SDK</CardTitle>
                <CardDescription>Call paid APIs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transparent payment handling with automatic retries and wallet management.
            </p>
            <div className="flex gap-2">
              <Badge>Browser</Badge>
              <Badge>Node.js</Badge>
              <Badge>Deno</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SDK Integration */}
      <Tabs defaultValue="provider" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="provider">Provider SDK</TabsTrigger>
          <TabsTrigger value="consumer">Consumer SDK</TabsTrigger>
          <TabsTrigger value="api">REST API</TabsTrigger>
        </TabsList>

        {/* Provider Tab */}
        <TabsContent value="provider" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Installation</CardTitle>
              <CardDescription>Install the Provider SDK</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                  <code className="text-sm">{providerInstall}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(providerInstall, 'provider-install')}
                >
                  {copiedCode === 'provider-install' ? (
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
              <CardTitle>Quick Start Example</CardTitle>
              <CardDescription>Protect your API with x402</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                  <code className="text-sm">{providerExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(providerExample, 'provider-example')}
                >
                  {copiedCode === 'provider-example' ? (
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
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Framework Agnostic:</strong> Works with Express, Hono, Fastify, and vanilla Node.js</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Automatic 402 Responses:</strong> Handles HTTP 402 protocol automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Payment Verification:</strong> Built-in payment proof verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Webhook Support:</strong> Receive notifications for all payments</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Volume Discounts:</strong> Automatic tiered pricing</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consumer Tab */}
        <TabsContent value="consumer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Installation</CardTitle>
              <CardDescription>Install the Consumer SDK</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                  <code className="text-sm">{consumerInstall}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(consumerInstall, 'consumer-install')}
                >
                  {copiedCode === 'consumer-install' ? (
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
              <CardTitle>Quick Start Example</CardTitle>
              <CardDescription>Call x402-protected APIs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                  <code className="text-sm">{consumerExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(consumerExample, 'consumer-example')}
                >
                  {copiedCode === 'consumer-example' ? (
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
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Automatic Payment:</strong> Transparent 402 handling with retries</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Idempotent Payments:</strong> No duplicate charges</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Wallet Management:</strong> Automatic balance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Quote Fetching:</strong> Check prices before paying</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>TypeScript Support:</strong> Full type safety</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>REST API Reference</CardTitle>
              <CardDescription>Direct API integration without SDKs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                  <code className="text-sm">{curlExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(curlExample, 'curl-example')}
                >
                  {copiedCode === 'curl-example' ? (
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
                  <code className="text-xs">/v1/x402/pay</code>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Process an x402 payment</p>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-2">GET</Badge>
                  <code className="text-xs">/v1/x402/quote/:endpointId</code>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Get pricing quote for an endpoint</p>
                </div>
                <div>
                  <Badge className="mb-2">POST</Badge>
                  <code className="text-xs">/v1/x402/verify</code>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Verify a payment</p>
                </div>
                <div>
                  <Badge className="mb-2">POST</Badge>
                  <code className="text-xs">/v1/x402/endpoints</code>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Register a new endpoint</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>Learn more about x402 and Sly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="/docs/X402_SDK_GUIDE.md" 
              target="_blank"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Book className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="font-medium">Complete SDK Guide</div>
                <div className="text-sm text-gray-500">Detailed documentation with examples</div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>

            <a 
              href="https://www.x402.org" 
              target="_blank"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Code className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <div className="font-medium">x402 Protocol Spec</div>
                <div className="text-sm text-gray-500">Official x402 whitepaper</div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>

            <a 
              href="/dashboard/x402/analytics" 
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Zap className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <div className="font-medium">View Analytics</div>
                <div className="text-sm text-gray-500">Track your x402 revenue</div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>

            <a 
              href="/dashboard/x402/endpoints" 
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <CreditCard className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <div className="font-medium">Manage Endpoints</div>
                <div className="text-sm text-gray-500">Configure your APIs</div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

