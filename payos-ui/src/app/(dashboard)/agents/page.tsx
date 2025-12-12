'use client';

import { AgentsPage } from '../../../pages/AgentsPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function Agents() {
  const { onNavigate } = useLegacyNavigation();
  return <AgentsPage onNavigate={onNavigate} />;
}
