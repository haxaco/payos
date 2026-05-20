// The full Visa VIC + Mastercard Agent Pay configuration page (1112
// lines, with credential-vault wiring, network status, analytics, test
// flows) is hidden until Sly has sandbox credentials for either network.
// The original page is preserved in git history — trivially restorable
// once we wire the integrations.
//
// In the meantime, Stripe-backed card processing is fully supported via
// /dashboard/payment-handlers (the canonical card path today). This
// placeholder explains the state and points users there.

import Link from 'next/link';
import { CreditCard, ArrowRight, Clock } from 'lucide-react';

export default function CardNetworksPlaceholder() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Card Networks</h1>
      </div>

      <div className="rounded-xl border border-border bg-muted p-5 flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Visa & Mastercard direct-rail support is coming soon</p>
          <p className="text-sm text-muted-foreground">
            Sly&rsquo;s native integrations for{' '}
            <span className="font-medium text-foreground">Visa Intelligent Commerce</span>{' '}
            and{' '}
            <span className="font-medium text-foreground">Mastercard Agent Pay</span>{' '}
            (the two AI-agent card-network protocols) are built but not enabled in
            production yet &mdash; both networks are still rolling out sandbox access.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Today: process cards via Stripe</h2>
        <p className="text-sm text-muted-foreground">
          Card payments work in production right now through Stripe. Connect your
          Stripe account on the Payment Handlers page &mdash; ACP checkouts and UCP
          hosted checkouts will route card settlements through it automatically.
        </p>
        <Link
          href="/dashboard/payment-handlers"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open Payment Handlers
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        We&rsquo;ll re-enable this surface and notify connected tenants the moment
        Visa VIC or Mastercard Agent Pay sandbox credentials become available.
      </p>
    </div>
  );
}
