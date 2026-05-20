// Cards (Visa VIC + Mastercard Agent Pay) is hidden until we have
// sandbox credentials for either network. Stripe-backed card processing
// remains available, so anyone who lands here by bookmark or external
// link is redirected to the Payment Handlers surface that drives it.
//
// The 430-line generic payment-method registry that previously lived at
// this route is preserved in git history — trivially restorable once we
// wire VIC/MAP.

import { redirect } from 'next/navigation';

export default function CardsRedirect() {
  redirect('/dashboard/payment-handlers');
}
