'use client';

import { CompliancePage } from '../../../pages/CompliancePage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function Compliance() {
  const { onNavigate } = useLegacyNavigation();
  return <CompliancePage onNavigate={onNavigate} />;
}
