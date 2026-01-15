'use client';

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, Copy } from "lucide-react";
import { useApiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@payos/ui";
import { Mandate } from "@payos/api-client";
import { cn } from "@/lib/utils";

interface VirtualCardProps {
    mandate: Mandate;
    className?: string;
}

export function VirtualCard({ mandate, className }: VirtualCardProps) {
    const api = useApiClient();
    const queryClient = useQueryClient();

    // Check if VDC is issued in metadata
    const isIssued = mandate.metadata?.vdc_issued === true;
    const pan = (mandate.metadata?.vdc_pan as string) || "4242 4242 4242 4242";
    const expiry = (mandate.metadata?.vdc_expiry as string) || "12/28";
    const cvc = (mandate.metadata?.vdc_cvc as string) || "123";

    const issueMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error("API client not initialized");

            // Mock card issuance by updating metadata
            // In a real scenario, this would call a specific endpoint
            return api.ap2.update(mandate.id, {
                metadata: {
                    ...mandate.metadata,
                    vdc_issued: true,
                    vdc_pan: "4532 9988 7766 5544", // Mock PAN
                    vdc_expiry: "09/29",
                    vdc_cvc: "888",
                    vdc_status: "active"
                }
            });
        },
        onSuccess: () => {
            toast.success("Virtual card issued successfully");
            queryClient.invalidateQueries({ queryKey: ["mandate", mandate.id] });
        },
        onError: () => {
            toast.error("Failed to issue virtual card");
        }
    });

    if (!isIssued) {
        return (
            <Card className={cn("border-dashed", className)}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Virtual Debit Card
                    </CardTitle>
                    <CardDescription>
                        Issue a virtual card linked to this mandate for direct merchant payments.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => issueMutation.mutate()}
                        disabled={issueMutation.isPending || mandate.status !== 'active'}
                    >
                        {issueMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Issue Virtual Card
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <div className={cn("relative group perspective-1000", className)}>
            {/* Card Visual */}
            <div className="relative h-48 w-full rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-xl transition-all hover:shadow-2xl overflow-hidden">
                {/* Background Texture */}
                <div className="absolute inset-0 opacity-10 bg-[url('/noise.svg')]"></div>
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-3xl"></div>
                <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-black/20 blur-3xl"></div>

                <div className="relative flex h-full flex-col justify-between z-10">
                    <div className="flex items-start justify-between">
                        <div className="text-lg font-bold tracking-wider opacity-90">PayOS</div>
                        <CreditCard className="h-8 w-8 opacity-80" />
                    </div>

                    <div className="space-y-4">
                        {/* PAN */}
                        <div className="flex items-center gap-2">
                            <div className="font-mono text-xl tracking-widest text-shadow-sm">
                                {`•••• •••• •••• ${pan ? pan.slice(-4) : '••••'}`}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white/70 hover:bg-white/10 hover:text-white"
                                onClick={() => {
                                    // In a real environment, you might want to fetch the PAN securely or copy it
                                    // depending on compliance. For now, allowing copy of the underlying value
                                    // but keeping it visually masked is a safer default than displaying it.
                                    navigator.clipboard.writeText(pan);
                                    toast.success("Card number copied");
                                }}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* Bottom Details */}
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-wider opacity-70">Cardholder</div>
                                <div className="font-medium tracking-wide truncate max-w-[180px]">
                                    {mandate.agent.name}
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase tracking-wider opacity-70">Expires</div>
                                    <div className="font-mono text-sm">{expiry}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase tracking-wider opacity-70">CVC</div>
                                    <div className="font-mono text-sm flex items-center gap-1">
                                        ***
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
