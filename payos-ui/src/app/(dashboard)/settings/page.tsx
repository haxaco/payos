'use client';

import { SettingsPage } from '../../../pages/SettingsPage';
import { useLegacyNavigation } from '../../../lib/useLegacyNavigation';

export default function Settings() {
  const { onNavigate } = useLegacyNavigation();
  return <SettingsPage onNavigate={onNavigate} />;
}
