'use client';

import { AccountDetailPage } from '../../../../pages/AccountDetailPage';
import { useLegacyNavigation } from '../../../../lib/useLegacyNavigation';

export default function AccountDetail({ params }: { params: { id: string } }) {
  const { onNavigate } = useLegacyNavigation();
  return <AccountDetailPage accountId={params.id} onNavigate={onNavigate} />;
}
