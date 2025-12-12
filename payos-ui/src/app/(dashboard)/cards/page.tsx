'use client';

import { CardsPage } from '../../../pages/CardsPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function Cards() {
  const { onNavigate } = useLegacyNavigation();
  return <CardsPage onNavigate={onNavigate} />;
}
