'use client';

import { Suspense } from 'react';
import SetupWizard from '@/components/setup/setup-wizard';

export default function SetupPage() {
  return (
    <Suspense>
      <SetupWizard />
    </Suspense>
  );
}
