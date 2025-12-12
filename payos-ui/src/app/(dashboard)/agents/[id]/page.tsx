'use client';

import { AgentDetailPage } from '../../../../pages/AgentDetailPage';
import { useLegacyNavigation } from '../../../../lib/useLegacyNavigation';

export default function AgentDetail({ params }: { params: { id: string } }) {
  const { onNavigate } = useLegacyNavigation();
  return <AgentDetailPage agentId={params.id} onNavigate={onNavigate} />;
}
