"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Mandate } from "@payos/api-client";
import { useApiClient } from "@/lib/api-client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Button
} from "@payos/ui";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
    }),
    description: z.string().optional(),
    authorizationProof: z.string().optional(),
});

interface ExecutePaymentDialogProps {
    mandate: Mandate;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ExecutePaymentDialog({
    mandate,
    open,
    onOpenChange,
    onSuccess
}: ExecutePaymentDialogProps) {
    const api = useApiClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: "",
            description: "",
            authorizationProof: "",
        },
    });

    const remainingAmount = mandate.amount.remaining;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!api) {
            toast.error("API client not ready");
            return;
        }
        const amount = Number(values.amount);

        if (amount > remainingAmount) {
            form.setError("amount", {
                type: "manual",
                message: `Amount cannot exceed remaining balance of ${formatCurrency(remainingAmount, mandate.amount.currency)}`
            });
            return;
        }

        try {
            setIsSubmitting(true);
            await api.ap2.execute(mandate.id, {
                amount,
                currency: mandate.amount.currency,
                description: values.description,
                authorizationProof: values.authorizationProof,
            });

            toast.success("Payment executed successfully");
            form.reset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error(error);
            toast.error("Failed to execute payment");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Execute Mandate Payment</DialogTitle>
                    <DialogDescription>
                        For Mandate: {mandate.mandateId}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/50 p-4 rounded-lg mb-4 text-sm">
                    <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Available Balance:</span>
                        <span className="font-medium">{formatCurrency(remainingAmount, mandate.amount.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="font-medium">{mandate.amount.currency}</span>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                            <Input placeholder="0.00" className="pl-7" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Payment for services..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="authorizationProof"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Auth Proof (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="External proof ID..." {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Required for strict mandates
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Execute Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
