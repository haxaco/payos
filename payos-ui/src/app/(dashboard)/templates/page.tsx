'use client';

import { TemplatesPage } from '../../../pages/TemplatesPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function Templates() {
  const { onNavigate } = useLegacyNavigation();
  return <TemplatesPage onNavigate={onNavigate} />;
}
