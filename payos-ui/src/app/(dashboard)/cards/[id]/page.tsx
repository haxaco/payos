'use client';

import { CardDetailPage } from '../../../../pages/CardDetailPage';
import { useLegacyNavigation } from '../../../../lib/useLegacyNavigation';

export default function CardDetail({ params }: { params: { id: string } }) {
  const { onNavigate } = useLegacyNavigation();
  return <CardDetailPage cardId={params.id} onNavigate={onNavigate} />;
}
