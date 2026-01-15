'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function X402EndpointDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const endpointId = params.id as string;

  useEffect(() => {
    // Redirect to new agentic-payments structure
    router.replace(`/dashboard/agentic-payments/x402/endpoints/${endpointId}`);
  }, [endpointId, router]);

  return (
    <div className="p-8">
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}



