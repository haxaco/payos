'use client';

// UCP "Create Checkout" form — parity with the ACP /new page.
// UCP previously had NO in-UI creation flow: the list page rendered an
// empty state and merchants had to curl the API. This page submits to
// POST /v1/ucp/checkouts via api.ucp.checkouts.create() (same endpoint
// the agent path hits), then navigates to the detail page.
//
// Amount convention: UCP stores prices in minor units (cents) — a real
// $14.00 ceviche row had `unit_price: 1400`. This form takes dollars
// from the user and multiplies by 100 on submit so the UX stays natural.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@sly/ui';
import { useApiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

// Handler picker shape. The backend takes wallet-pay via a different
// signal than the handler string: `completeCheckout` (services/ucp/
// checkout.ts:757-824) prefers the wallet-debit path when `agent_id`
// is present and the agent has a managed wallet with sufficient
// balance — it bypasses the external handler entirely. So "Sly Wallet"
// here means "settle via agent wallet"; the handler string itself
// becomes a fallback if the wallet path fails before authorization.
interface HandlerOption {
  value: string;
  label: string;
  description: string;
}
const HANDLER_OPTIONS: HandlerOption[] = [
  {
    value: 'wallet',
    label: 'Sly Wallet (USDC) — debit from agent',
    description:
      'Settles by debiting the selected agent’s Sly wallet (USDC). No external handler call.',
  },
  {
    value: 'sly',
    label: 'Sly LATAM (Pix / SPEI)',
    description: 'Brazil and Mexico corridors via the native Sly handler.',
  },
  {
    value: 'stripe',
    label: 'Stripe',
    description: 'Card processing via your connected Stripe account.',
  },
];

const checkoutSchema = z
  .object({
    currency: z.string().length(3),
    buyer_name: z.string().optional(),
    buyer_email: z.string().email().optional().or(z.literal('')),
    merchant_name: z.string().min(1, 'Merchant name is required'),
    handler: z.string().min(1),
    agent_id: z.string().optional(),
    expires_in_hours: z.coerce.number().int().min(1).max(168),
    items: z
      .array(
        z.object({
          name: z.string().min(1, 'Item name is required'),
          description: z.string().optional(),
          quantity: z.coerce.number().int().positive(),
          unit_price_dollars: z.coerce.number().nonnegative(),
        })
      )
      .min(1, 'At least one item is required'),
  })
  .refine((d) => d.handler !== 'wallet' || !!d.agent_id, {
    message: 'Pick an agent — wallet pay debits the selected agent’s Sly wallet.',
    path: ['agent_id'],
  });

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function fmtUSDC(amount: number, currency: string): string {
  // Display-only helper — handles USDC/EURC naturally without crashing on
  // Intl.NumberFormat's ISO-only currency style. Same fix as PR #82/#83.
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function CreateUcpCheckoutPage() {
  const router = useRouter();
  const api = useApiClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      currency: 'USD',
      buyer_name: '',
      buyer_email: '',
      merchant_name: '',
      handler: 'wallet',
      agent_id: '',
      expires_in_hours: 24,
      items: [
        { name: '', description: '', quantity: 1, unit_price_dollars: 0 },
      ],
    },
  });

  // Agents for the wallet-pay picker. Only listed (and required) when
  // the user chooses the "Sly Wallet" handler; the backend uses
  // `agent_id` to trigger the wallet-debit path on completion.
  const { data: agentsResponse } = useQuery({
    queryKey: ['agents', 'for-ucp-create'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.agents.list({ limit: 100 });
    },
    enabled: !!api,
  });
  const agents: Array<{ id: string; name?: string | null }> =
    (agentsResponse as any)?.data ?? [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchCurrency = form.watch('currency');
  const subtotalDollars = (watchItems || []).reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unit_price_dollars) || 0),
    0
  );

  const onSubmit = async (data: CheckoutFormValues) => {
    setIsSubmitting(true);
    try {
      if (!api) throw new Error('API client not initialized');

      // UCP stores prices in MINOR UNITS (cents-equivalent). Convert
      // before sending. A $14.00 line item is `unit_price: 1400`.
      const line_items = data.items.map((item) => {
        const unit_price_minor = Math.round(item.unit_price_dollars * 100);
        const total_price_minor = unit_price_minor * item.quantity;
        return {
          id: `item_${Math.random().toString(36).slice(2, 10)}`,
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
          unit_price: unit_price_minor,
          total_price: total_price_minor,
        };
      });

      const subtotal_minor = line_items.reduce((s, i) => s + i.total_price, 0);
      const totals = [
        { type: 'subtotal', label: 'Subtotal', amount: subtotal_minor },
        { type: 'total', label: 'Total', amount: subtotal_minor },
      ];

      const payload: any = {
        currency: data.currency,
        line_items,
        totals,
        payment_config: { handlers: [data.handler] },
        expires_in_hours: data.expires_in_hours,
        metadata: { merchant_name: data.merchant_name },
        // agent_id is what the backend keys on to take the wallet-pay
        // path during completion. Only attach when the user picked
        // "Sly Wallet" and selected an agent.
        ...(data.handler === 'wallet' && data.agent_id
          ? { agent_id: data.agent_id }
          : {}),
      };
      if (data.buyer_name || data.buyer_email) {
        payload.buyer = {
          ...(data.buyer_name ? { name: data.buyer_name } : {}),
          ...(data.buyer_email ? { email: data.buyer_email } : {}),
        };
      }

      const created: any = await api.ucp.checkouts.create(payload);
      const checkoutId = created?.id || created?.data?.id;
      toast.success('Checkout created', {
        description: checkoutId ? `ID ${checkoutId}` : undefined,
      });
      if (checkoutId) {
        router.push(
          `/dashboard/agentic-payments/ucp/hosted-checkouts/${checkoutId}`
        );
      } else {
        router.push('/dashboard/agentic-payments/ucp/hosted-checkouts');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create checkout'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/agentic-payments/ucp/hosted-checkouts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to checkouts
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">
          Create Hosted Checkout
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hits the same endpoint an agent calls (POST /v1/ucp/checkouts).
          Sly returns a checkout session — share the resulting link with your
          customer.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  {...form.register('currency')}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {/* UCP CreateCheckoutSchema enforces `length(3)` — only
                      3-letter ISO codes here. Stablecoin display (USDC/EURC)
                      lands later when the wallet handler ships. */}
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="BRL">BRL — Pix corridor</option>
                  <option value="MXN">MXN — SPEI corridor</option>
                </select>
              </div>
              <div>
                <Label htmlFor="expires_in_hours">Expires in (hours)</Label>
                <Input
                  id="expires_in_hours"
                  type="number"
                  min={1}
                  max={168}
                  {...form.register('expires_in_hours')}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="merchant_name">Merchant name</Label>
              <Input
                id="merchant_name"
                placeholder="Your store"
                {...form.register('merchant_name')}
              />
              {form.formState.errors.merchant_name && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.merchant_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="handler">Payment handler</Label>
              <select
                id="handler"
                {...form.register('handler')}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {HANDLER_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {HANDLER_OPTIONS.find((h) => h.value === form.watch('handler'))
                  ?.description}
              </p>
            </div>

            {form.watch('handler') === 'wallet' && (
              <div>
                <Label htmlFor="agent_id">Agent</Label>
                <select
                  id="agent_id"
                  {...form.register('agent_id')}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pick an agent…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.agent_id && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.agent_id.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  On completion, Sly debits this agent’s wallet for the total.
                  Requires sufficient USDC balance and triggers the Epic 82
                  treasury-scope check just like any other settlement path.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buyer (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyer_name">Name</Label>
              <Input
                id="buyer_name"
                placeholder="Jane Doe"
                {...form.register('buyer_name')}
              />
            </div>
            <div>
              <Label htmlFor="buyer_email">Email</Label>
              <Input
                id="buyer_email"
                type="email"
                placeholder="jane@example.com"
                {...form.register('buyer_email')}
              />
              {form.formState.errors.buyer_email && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.buyer_email.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-2 items-start rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="col-span-6">
                  <Label htmlFor={`items.${index}.name`} className="text-xs">
                    Name
                  </Label>
                  <Input
                    id={`items.${index}.name`}
                    placeholder="Item name"
                    {...form.register(`items.${index}.name`)}
                  />
                  {form.formState.errors.items?.[index]?.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {form.formState.errors.items?.[index]?.name?.message}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`items.${index}.quantity`} className="text-xs">
                    Qty
                  </Label>
                  <Input
                    id={`items.${index}.quantity`}
                    type="number"
                    min={1}
                    {...form.register(`items.${index}.quantity`)}
                  />
                </div>
                <div className="col-span-3">
                  <Label
                    htmlFor={`items.${index}.unit_price_dollars`}
                    className="text-xs"
                  >
                    Unit price ({watchCurrency})
                  </Label>
                  <Input
                    id={`items.${index}.unit_price_dollars`}
                    type="number"
                    min={0}
                    step="0.01"
                    {...form.register(`items.${index}.unit_price_dollars`)}
                  />
                </div>
                <div className="col-span-1 flex items-end justify-end h-full pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  name: '',
                  description: '',
                  quantity: 1,
                  unit_price_dollars: 0,
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
              Add item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Order total</div>
            <div className="text-lg font-semibold">
              {fmtUSDC(subtotalDollars, watchCurrency)}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/agentic-payments/ucp/hosted-checkouts"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            )}
            Create checkout
          </Button>
        </div>
      </form>
    </div>
  );
}
