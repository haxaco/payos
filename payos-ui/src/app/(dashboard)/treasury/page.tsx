'use client';

import { TreasuryPage } from '../../../pages/TreasuryPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function Treasury() {
  const { onNavigate } = useLegacyNavigation();
  return <TreasuryPage onNavigate={onNavigate} />;
}
