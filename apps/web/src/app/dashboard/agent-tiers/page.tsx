import { redirect } from 'next/navigation';

export default function AgentTiersRedirect() {
  redirect('/dashboard/settings/agent-tiers');
}
