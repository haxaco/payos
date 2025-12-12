'use client';

import { TransactionsPage } from '../../../pages/TransactionsPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function Transactions() {
  const { onNavigate } = useLegacyNavigation();
  return <TransactionsPage onNavigate={onNavigate} />;
}
