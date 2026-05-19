import { redirect } from 'next/navigation';

/**
 * The webhooks management UI now lives under Settings. This route used to
 * render a "Coming Soon" placeholder — keep the old nav/links working by
 * redirecting to the real, self-serve page.
 */
export default function WebhooksRedirectPage() {
  redirect('/dashboard/settings/webhooks');
}
