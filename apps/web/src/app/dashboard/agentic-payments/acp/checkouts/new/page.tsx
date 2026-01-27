'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    Button,
    Input,
    Label,
    Separator,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@sly/ui';
import {
    ArrowLeft,
    Plus,
    Trash,
    Receipt,
    Truck,
    Tag
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import Link from 'next/link';

const checkoutSchema = z.object({
    checkout_id: z.string().min(1, 'Checkout ID is required'),
    agent_id: z.string().min(1, 'Agent ID is required'),
    agent_name: z.string().optional(),
    customer_id: z.string().optional(),
    customer_email: z.string().optional(),
    account_id: z.string().min(1, 'Account is required'),
    merchant_id: z.string().min(1, 'Merchant ID is required'),
    merchant_name: z.string().min(1, 'Merchant Name is required'),
    merchant_url: z.string().optional(),
    currency: z.string().min(1, 'Currency is required'),
    tax_amount: z.coerce.number().min(0),
    shipping_amount: z.coerce.number().min(0),
    discount_amount: z.coerce.number().min(0),
    items: z.array(z.object({
        name: z.string().min(1, 'Item name is required'),
        description: z.string().optional(),
        quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
        unit_price: z.coerce.number().min(0, 'Price must be positive'),
        image_url: z.string().optional(),
    })).min(1, 'At least one item is required'),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CreateCheckoutPage() {
    const router = useRouter();
    const api = useApiClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            checkout_id: `chk_${Math.random().toString(36).substring(7)}`,
            agent_id: '',
            agent_name: '',
            account_id: '',
            merchant_id: '',
            merchant_name: '',
            merchant_url: '',
            customer_id: '',
            customer_email: '',
            currency: 'USD',
            tax_amount: 0,
            shipping_amount: 0,
            discount_amount: 0,
            items: [{ name: '', description: '', quantity: 1, unit_price: 0, image_url: '' }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items'
    });

    const calculateSubtotal = (items: CheckoutFormValues['items']) => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const watchItems = form.watch('items');
    const watchTax = form.watch('tax_amount') || 0;
    const watchShipping = form.watch('shipping_amount') || 0;
    const watchDiscount = form.watch('discount_amount') || 0;

    const subtotal = calculateSubtotal(watchItems || []);
    const total = Math.max(0, subtotal + Number(watchTax) + Number(watchShipping) - Number(watchDiscount));

    const onSubmit = async (data: CheckoutFormValues) => {
        setIsSubmitting(true);
        try {
            if (!api) throw new Error("API not initialized");

            // Calculate total prices for items as backend expects
            const payload = {
                ...data,
                items: data.items.map((item: any) => ({
                    ...item,
                    total_price: item.quantity * item.unit_price,
                    currency: data.currency
                }))
            };

            await api.acp.create(payload);
            toast.success('Checkout created successfully');
            router.push('/dashboard/agentic-payments/acp/checkouts');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create checkout');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/agentic-payments/acp/checkouts">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create New Checkout</h1>
                    <p className="text-muted-foreground text-sm">
                        Manually create an agent checkout session
                    </p>
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Step 1: Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Checkout Details</CardTitle>
                        <CardDescription>Basic information about the checkout session</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="checkout_id">Checkout ID</Label>
                            <Input id="checkout_id" {...form.register('checkout_id')} />
                            {form.formState.errors.checkout_id && (
                                <p className="text-sm text-destructive">{form.formState.errors.checkout_id.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="account_id">Account ID</Label>
                            <Select
                                onValueChange={(val) => form.setValue('account_id', val)}
                                defaultValue={form.getValues('account_id')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="acc_demo_123">Demo Account</SelectItem>
                                    <SelectItem value="acc_business_456">Business Account</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.account_id && (
                                <p className="text-sm text-destructive">{form.formState.errors.account_id.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="agent_id">Agent ID</Label>
                            <Input id="agent_id" {...form.register('agent_id')} />
                            {form.formState.errors.agent_id && (
                                <p className="text-sm text-destructive">{form.formState.errors.agent_id.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="merchant_id">Merchant ID</Label>
                            <Input id="merchant_id" {...form.register('merchant_id')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="merchant_name">Merchant Name</Label>
                            <Input id="merchant_name" {...form.register('merchant_name')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer_email">Customer Email (Optional)</Label>
                            <Input id="customer_email" {...form.register('customer_email')} type="email" />
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: Items */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Cart Items</CardTitle>
                            <CardDescription>Add products to the checkout</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, unit_price: 0, description: '' })}>
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid gap-4 sm:grid-cols-12 items-start border p-4 rounded-lg bg-muted/20 relative">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1}
                                >
                                    <Trash className="h-3 w-3" />
                                </Button>

                                <div className="sm:col-span-5 space-y-2">
                                    <Label>Item Name</Label>
                                    <Input {...form.register(`items.${index}.name`)} placeholder="Product name" />
                                    {form.formState.errors.items?.[index]?.name && (
                                        <p className="text-sm text-destructive">{form.formState.errors.items[index]?.name?.message}</p>
                                    )}
                                    <Input {...form.register(`items.${index}.description`)} placeholder="Description (opt)" className="text-xs" />
                                </div>

                                <div className="sm:col-span-2 space-y-2">
                                    <Label>Qty</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        {...form.register(`items.${index}.quantity`)}
                                    />
                                </div>

                                <div className="sm:col-span-3 space-y-2">
                                    <Label>Unit Price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...form.register(`items.${index}.unit_price`)}
                                    />
                                </div>

                                <div className="sm:col-span-2 space-y-2 pt-8 text-right font-medium">
                                    {/* @ts-ignore */}
                                    ${((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.unit_price`) || 0)).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Step 3: Totals */}
                <Card>
                    <CardHeader>
                        <CardTitle>Order Totals</CardTitle>
                        <CardDescription>Review financial details</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                                <Label className="w-24">Tax</Label>
                                <Input type="number" min="0" step="0.01" {...form.register('tax_amount')} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <Label className="w-24">Shipping</Label>
                                <Input type="number" min="0" step="0.01" {...form.register('shipping_amount')} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <Label className="w-24">Discount</Label>
                                <Input type="number" min="0" step="0.01" {...form.register('discount_amount')} />
                            </div>
                        </div>

                        <div className="bg-muted p-6 rounded-lg space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Tax</span>
                                <span>+${Number(watchTax).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Shipping</span>
                                <span>+${Number(watchShipping).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Discount</span>
                                <span>-${Number(watchDiscount).toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Checkout'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
