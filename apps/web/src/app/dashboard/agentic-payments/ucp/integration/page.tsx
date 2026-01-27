'use client';

/**
 * UCP Integration Guide Page
 * 
 * Documentation for integrating with the Universal Commerce Protocol (UCP).
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
    Globe,
    Landmark,
    Book,
    ExternalLink,
    ArrowLeftRight,
    Shield
} from 'lucide-react';

export default function UcpIntegrationPage() {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const apiClientInstall = `npm install @sly/api-client`;

    const acquireTokenExample = `import { PayOSClient } from '@sly/api-client';

const client = new PayOSClient({
  apiKey: process.env.PAYOS_API_KEY
});

// Acquire a payment token for Pix (Brazil) checkout
const token = await client.ucp.acquireToken({
  corridor: 'pix',
  amount: 100.00,
  currency: 'USD',
  recipient: {
    type: 'pix',
    name: 'João Silva',
    pix_key: 'joao.silva@email.com',
    pix_key_type: 'email'
  }
});

console.log('Token acquired:', token.token);
console.log('Expires at:', token.expires_at);`;

    const settleExample = `// Execute the payment with the token
const payment = await client.ucp.settle({
  token: token.token,
  idempotency_key: 'unique_request_id_123'
});

console.log('Payment ID:', payment.id);
console.log('Status:', payment.status);
console.log('FX Rate:', payment.quote.fx_rate);`;

    const getQuoteExample = `// Get a quote for the conversion
const quote = await client.ucp.getQuote({
  corridor: 'spei',
  amount: 500.00,
  currency: 'USD'
});

console.log('From:', quote.from_amount, quote.from_currency);
console.log('To:', quote.to_amount, quote.to_currency);
console.log('FX Rate:', quote.fx_rate);
console.log('Fees:', quote.fees.total);`;

    const curlTokenExample = `curl https://api.payos.com/v1/ucp/tokens \\
  -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "corridor": "pix",
    "amount": 100.00,
    "currency": "USD",
    "recipient": {
      "type": "pix",
      "name": "João Silva",
      "pix_key": "joao.silva@email.com",
      "pix_key_type": "email"
    }
  }'`;

    const curlSettleExample = `curl https://api.payos.com/v1/ucp/settle \\
  -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "ucp_tok_abc123...",
    "idempotency_key": "unique_request_id_123"
  }'`;

    const pixRecipientSchema = `// Pix Recipient Schema (Brazil)
{
  "type": "pix",
  "name": "Recipient Name",         // Required: max 200 chars
  "pix_key": "key_value",           // Required: the Pix key
  "pix_key_type": "cpf" | "cnpj" | "email" | "phone" | "evp",
  "tax_id": "12345678900"           // Optional: CPF (11 digits) or CNPJ (14 digits)
}

// Pix Key Type Examples:
// - cpf: "12345678900" (11 digits)
// - cnpj: "12345678000199" (14 digits)
// - email: "user@example.com"
// - phone: "+5511999999999"
// - evp: Random 32-char UUID`;

    const speiRecipientSchema = `// SPEI Recipient Schema (Mexico)
{
  "type": "spei",
  "name": "Recipient Name",         // Required: max 200 chars
  "clabe": "012345678901234567",    // Required: 18-digit CLABE
  "rfc": "XAXX010101000"            // Optional: Mexican tax ID
}

// CLABE Format:
// - Exactly 18 digits
// - First 3 digits: Bank code
// - Next 3 digits: Plaza code
// - Next 11 digits: Account number
// - Last digit: Check digit`;

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">UCP Integration</h1>
                    <p className="text-muted-foreground mt-1">
                        Universal Commerce Protocol - PayOS Payment Handler for checkout payments via Pix, SPEI, and more
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <a href="https://ucp.dev/specification" target="_blank" rel="noopener noreferrer">
                            <Book className="mr-2 h-4 w-4" />
                            UCP Specification
                        </a>
                    </Button>
                    <Button variant="outline" asChild>
                        <a href="https://docs.payos.com/ucp" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Full Documentation
                        </a>
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-green-600" />
                            Pix Corridor
                            <Badge variant="outline" className="ml-auto">Brazil</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <p>Instant settlement to any Pix key in Brazil. Supports CPF, CNPJ, email, phone, and EVP keys.</p>
                        <div className="mt-2 text-xs">
                            <span className="font-medium">Settlement time:</span> ~30 seconds
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="h-4 w-4 text-blue-600" />
                            SPEI Corridor
                            <Badge variant="outline" className="ml-auto">Mexico</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <p>Real-time settlement to CLABE accounts in Mexico. Supports all Mexican banks.</p>
                        <div className="mt-2 text-xs">
                            <span className="font-medium">Settlement time:</span> ~2 minutes
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-600" />
                            Spending Policies
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <p>Agent wallet spending limits are enforced. Payments above thresholds require human approval.</p>
                        <div className="mt-2 text-xs">
                            <span className="font-medium">Protocol:</span> Story 18.R3 compliant
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* API Documentation */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        Quick Start
                    </CardTitle>
                    <CardDescription>
                        Get started with UCP checkout payments in minutes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="typescript">
                        <TabsList>
                            <TabsTrigger value="typescript">TypeScript SDK</TabsTrigger>
                            <TabsTrigger value="curl">cURL</TabsTrigger>
                        </TabsList>

                        <TabsContent value="typescript" className="space-y-6">
                            {/* Install */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">1. Install the SDK</h3>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{apiClientInstall}</code>
                                    </pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
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
                            </div>

                            {/* Acquire Token */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">2. Acquire a Payment Token</h3>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{acquireTokenExample}</code>
                                    </pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(acquireTokenExample, 'token')}
                                    >
                                        {copiedCode === 'token' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Execute Payment */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">3. Execute Payment</h3>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{settleExample}</code>
                                    </pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(settleExample, 'settle')}
                                    >
                                        {copiedCode === 'settle' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Get Quote */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">Optional: Get a Quote First</h3>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{getQuoteExample}</code>
                                    </pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(getQuoteExample, 'quote')}
                                    >
                                        {copiedCode === 'quote' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="curl" className="space-y-6">
                            {/* cURL Token */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">1. Acquire Token</h3>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{curlTokenExample}</code>
                                    </pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(curlTokenExample, 'curl-token')}
                                    >
                                        {copiedCode === 'curl-token' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* cURL Settle */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">2. Execute Payment</h3>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{curlSettleExample}</code>
                                    </pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(curlSettleExample, 'curl-settle')}
                                    >
                                        {copiedCode === 'curl-settle' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Recipient Schemas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-green-600" />
                            Pix Recipient Schema
                        </CardTitle>
                        <CardDescription>
                            Required fields for Brazil Pix payments
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                                <code>{pixRecipientSchema}</code>
                            </pre>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(pixRecipientSchema, 'pix-schema')}
                            >
                                {copiedCode === 'pix-schema' ? (
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
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-blue-600" />
                            SPEI Recipient Schema
                        </CardTitle>
                        <CardDescription>
                            Required fields for Mexico SPEI payments
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                                <code>{speiRecipientSchema}</code>
                            </pre>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(speiRecipientSchema, 'spei-schema')}
                            >
                                {copiedCode === 'spei-schema' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Webhook Events */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5" />
                        Webhook Events
                    </CardTitle>
                    <CardDescription>
                        Events emitted during the payment lifecycle
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg">
                                <div className="font-mono text-sm font-medium">ucp.settlement.created</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Fired when a settlement token is acquired and settlement is initiated.
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <div className="font-mono text-sm font-medium">ucp.settlement.processing</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Fired when the settlement is being processed by the corridor.
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <div className="font-mono text-sm font-medium">ucp.settlement.completed</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Fired when funds have been successfully delivered to the recipient.
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <div className="font-mono text-sm font-medium">ucp.settlement.failed</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Fired if the settlement fails. Check failure_reason for details.
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <div className="font-mono text-sm font-medium">ucp.settlement.approval_required</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Fired when a settlement exceeds spending policy thresholds and requires human approval.
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <div className="font-mono text-sm font-medium">ucp.settlement.approval_decided</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Fired when a pending approval is approved or rejected by a human reviewer.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
