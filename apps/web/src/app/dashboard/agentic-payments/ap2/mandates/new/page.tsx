"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useApiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

import {
    Button,
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@sly/ui";

const formSchema = z.object({
    mandateId: z.string().min(3, "Mandate ID must be at least 3 characters"),
    type: z.enum(["intent", "cart", "payment"]),
    agentId: z.string().min(1, "Agent is required"),
    accountId: z.string().min(1, "Account is required"),
    authorizedAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
    }),
    currency: z.string().min(1, "Currency is required"),
    expiresAt: z.string().optional(),
    fundingSourceId: z.string().optional(),
    settlementRail: z.string().optional(),
});

const NONE = "__none__";

const SETTLEMENT_RAILS = [
    { value: NONE, label: "Auto (default)" },
    { value: "internal", label: "Internal" },
    { value: "circle_usdc", label: "Circle USDC" },
    { value: "pix", label: "PIX (Brazil)" },
    { value: "spei", label: "SPEI (Mexico)" },
    { value: "ach", label: "ACH (US)" },
    { value: "wire", label: "Wire Transfer" },
];

export default function CreateMandatePage() {
    const router = useRouter();
    const api = useApiClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch agents and accounts to populate dropdowns
    const { data: agents, isLoading: isLoadingAgents, error: agentsError } = useQuery({
        queryKey: ["agents"],
        queryFn: async () => {
            if (!api) throw new Error("API client not initialized");
            const res = await api.agents.list({ limit: 100 });
            return res;
        },
        enabled: !!api,
    });

    const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useQuery({
        queryKey: ["accounts"],
        queryFn: async () => {
            if (!api) throw new Error("API client not initialized");
            const res = await api.accounts.list({ limit: 100 });
            return res;
        },
        enabled: !!api,
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            mandateId: "",
            type: "payment",
            agentId: "",
            accountId: "",
            authorizedAmount: "",
            currency: "USDC",
            fundingSourceId: NONE,
            settlementRail: NONE,
        },
    });

    const selectedAccountId = form.watch("accountId");

    // Fetch funding sources for the selected account
    const { data: fundingSources } = useQuery({
        queryKey: ["funding-sources", selectedAccountId],
        queryFn: async () => {
            if (!api || !selectedAccountId) return [];
            return api.fundingSources.list({ accountId: selectedAccountId, status: "active" });
        },
        enabled: !!api && !!selectedAccountId,
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!api) {
            toast.error("API client not available");
            return;
        }
        try {
            setIsSubmitting(true);
            const payload = {
                ...values,
                authorizedAmount: Number(values.authorizedAmount),
                fundingSourceId: values.fundingSourceId === NONE ? undefined : values.fundingSourceId,
                settlementRail: values.settlementRail === NONE ? undefined : values.settlementRail,
            };
            const mandate = await api.ap2.create(payload);

            toast.success("Mandate created successfully");
            router.push(`/dashboard/agentic-payments/ap2/mandates/${mandate.id}`);
        } catch (error: any) {
            console.error("Failed to create mandate:", error);
            if (error?.details) {
                console.error("Validation Details:", error.details);
                toast.error(`Failed to create mandate: ${JSON.stringify(error.details)}`);
            } else {
                toast.error("Failed to create mandate");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent">
                    <Link href="/dashboard/agentic-payments/ap2/mandates">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Mandates
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Create New Mandate</h1>
                <p className="text-muted-foreground">
                    Authorize an AI agent to spend funds on behalf of an account.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mandate Details</CardTitle>
                    <CardDescription>
                        Configure the spending limits and permissions for this mandate.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="mandateId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mandate ID (AP2 Reference)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="mandate_travel_bot_001" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The unique identifier from the Google AP2 protocol.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mandate Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="payment">Payment (Direct)</SelectItem>
                                                    <SelectItem value="cart">Cart (Checkout)</SelectItem>
                                                    <SelectItem value="intent">Intent (Pre-auth)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Currency</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select currency" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="USDC">USDC (Base)</SelectItem>
                                                    <SelectItem value="EURC">EURC (Base)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="agentId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Authorized Agent</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select agent" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {((agents as any)?.data || []).map((agent: any) => (
                                                        <SelectItem key={agent.id} value={agent.id}>
                                                            {agent.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="accountId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Funding Account</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select account" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {accounts?.data?.map((account: any) => (
                                                        <SelectItem key={account.id} value={account.id}>
                                                            {account.name} ({account.currency})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="authorizedAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Authorized Amount Limit</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                                <Input placeholder="1000.00" className="pl-7" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            The maximum amount this agent can spend under this mandate.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="fundingSourceId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Payment Instrument (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Use wallet (default)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>Use wallet (default)</SelectItem>
                                                    {(fundingSources || []).map((fs: any) => (
                                                        <SelectItem key={fs.id} value={fs.id}>
                                                            {fs.displayName || fs.display_name || `${fs.brand || fs.type} ••••${fs.lastFour || fs.last_four || ''}`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Bind a specific card or bank account to this mandate.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="settlementRail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Settlement Rail (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Auto (default)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {SETTLEMENT_RAILS.map((rail) => (
                                                        <SelectItem key={rail.value} value={rail.value}>
                                                            {rail.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Force a specific settlement rail for executions.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" type="button" onClick={() => router.back()}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Mandate
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
