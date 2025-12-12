'use client';

import { ComplianceFlagDetailPage } from '../../../../pages/ComplianceFlagDetailPage';
import { useLegacyNavigation } from '../../../../lib/useLegacyNavigation';

export default function ComplianceFlagDetail({ params }: { params: { id: string } }) {
  const { onNavigate } = useLegacyNavigation();
  return <ComplianceFlagDetailPage flagId={params.id} onNavigate={onNavigate} />;
}
