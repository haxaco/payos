
import { redirect } from 'next/navigation';

export default function X402AnalyticsRedirect() {
  redirect('/dashboard/agentic-payments/analytics?protocol=x402');
}
