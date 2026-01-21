'use client';

import { Bot, Zap, ShoppingCart, TrendingUp, DollarSign, Activity, Globe } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@payos/ui';

export default function AgenticPaymentsOverviewPage() {
    const protocols = [
        {
            id: 'ucp',
            name: 'UCP Protocol',
            description: 'Universal Commerce Protocol - PayOS payment handler for Pix and SPEI checkouts',
            icon: Globe,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-100 dark:bg-green-950',
            href: '/dashboard/agentic-payments/ucp/checkouts',
            stats: { checkouts: 0, volume: '$0' }
        },
        {
            id: 'acp',
            name: 'ACP Protocol',
            description: 'Agentic Commerce Protocol - Enable AI agents to complete purchases',
            icon: ShoppingCart,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-100 dark:bg-purple-950',
            href: '/dashboard/agentic-payments/acp/checkouts',
            stats: { checkouts: 2, volume: '$1,245' }
        },
        {
            id: 'ap2',
            name: 'AP2 Protocol',
            description: 'Google Agent Payment Protocol - Manage agent authorization mandates',
            icon: Bot,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-950',
            href: '/dashboard/agentic-payments/ap2/mandates',
            stats: { mandates: 3, active: 2 }
        },
        {
            id: 'x402',
            name: 'x402 Protocol',
            description: 'HTTP 402 Payment Required - Monetize your APIs with micropayments',
            icon: Zap,
            color: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-100 dark:bg-yellow-950',
            href: '/dashboard/agentic-payments/x402/endpoints',
            stats: { endpoints: 3, revenue: '$21.82' }
        },
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Agentic Payments</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage your AI agent payment protocols and infrastructure.
                </p>
            </div>

            {/* Protocol Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {protocols.map((protocol) => {
                    const Icon = protocol.icon;
                    return (
                        <Link key={protocol.id} href={protocol.href}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 ${protocol.bgColor} rounded-lg flex items-center justify-center`}>
                                            <Icon className={`h-6 w-6 ${protocol.color}`} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{protocol.name}</CardTitle>
                                        </div>
                                    </div>
                                    <CardDescription className="mt-3">
                                        {protocol.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-4 text-sm">
                                        {Object.entries(protocol.stats).map(([key, value]) => (
                                            <div key={key}>
                                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                                                <div className="text-gray-500 dark:text-gray-400 capitalize">{key}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/agentic-payments/analytics">
                    <Card className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">Analytics</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">View protocol metrics</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/wallets">
                    <Card className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">Wallets</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Manage agent wallets</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/agents">
                    <Card className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">Agents</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Configure AI agents</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
