'use client';

import { AgentVerificationTiersPage } from '../../../pages/AgentVerificationTiersPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function AgentVerificationTiers() {
  const { onNavigate } = useLegacyNavigation();
  return <AgentVerificationTiersPage onNavigate={onNavigate} />;
}
