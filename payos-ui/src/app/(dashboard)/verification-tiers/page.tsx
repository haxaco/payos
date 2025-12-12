'use client';

import { VerificationTiersPage } from '../../../pages/VerificationTiersPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function VerificationTiers() {
  const { onNavigate } = useLegacyNavigation();
  return <VerificationTiersPage onNavigate={onNavigate} />;
}
