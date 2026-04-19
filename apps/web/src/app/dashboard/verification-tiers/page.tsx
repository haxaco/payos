import { redirect } from 'next/navigation';

export default function VerificationTiersRedirect() {
  redirect('/dashboard/settings/verification-tiers');
}
