import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@sly/ui';
import { useApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatCurrencyStandalone } from '@/lib/locale';

const completeSchema = z.object({
    shared_payment_token: z.string().min(1, 'Token is required'),
    payment_method: z.string().optional(),
});

type CompleteFormValues = z.infer<typeof completeSchema>;

interface CompleteCheckoutDialogProps {
    checkoutId: string;
    totalAmount: number;
    currency: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CompleteCheckoutDialog({
    checkoutId,
    totalAmount,
    currency,
    open,
    onOpenChange,
    onSuccess
}: CompleteCheckoutDialogProps) {
    const api = useApiClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CompleteFormValues>({
        resolver: zodResolver(completeSchema),
        defaultValues: {
            shared_payment_token: 'valid_token_123',
            payment_method: 'card'
        }
    });

    const onSubmit = async (data: CompleteFormValues) => {
        setIsSubmitting(true);
        try {
            if (!api) throw new Error("API not initialized");

            await api.acp.complete(checkoutId, {
                shared_payment_token: data.shared_payment_token,
                payment_method: data.payment_method,
            });
            toast.success('Checkout completed successfully');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to complete checkout');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Complete Checkout</DialogTitle>
                    <DialogDescription>
                        Enter payment details to complete this checkout.
                        <br />
                        <strong>Total: {formatCurrencyStandalone(totalAmount, currency)}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="shared_payment_token">Shared Payment Token</Label>
                        <Input id="shared_payment_token" {...form.register('shared_payment_token')} />
                        {form.formState.errors.shared_payment_token && (
                            <p className="text-sm text-destructive">{form.formState.errors.shared_payment_token.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="payment_method">Payment Method</Label>
                        <Select
                            onValueChange={(val) => form.setValue('payment_method', val)}
                            defaultValue="card"
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="card">Credit Card</SelectItem>
                                <SelectItem value="ach">Bank Transfer (ACH)</SelectItem>
                                <SelectItem value="wallet">Crypto Wallet</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : 'Complete Payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
