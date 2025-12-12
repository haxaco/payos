'use client';

import { TransactionDetailPage } from '../../../../pages/TransactionDetailPage';
import { useLegacyNavigation } from '../../../../lib/useLegacyNavigation';

export default function TransactionDetail() {
  const { onNavigate } = useLegacyNavigation();
  return <TransactionDetailPage onNavigate={onNavigate} />;
}
