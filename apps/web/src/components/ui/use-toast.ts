'use client';

import { useState } from 'react';

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// Simple toast implementation
// In a real app, you might use something like sonner or react-hot-toast
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = 'default' }: Toast) => {
    // For now, just log to console
    // In production, you'd show an actual toast notification
    console.log(`[Toast ${variant}]`, title, description);
    
    const newToast = { title, description, variant };
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== newToast));
    }, 3000);
  };

  return { toast, toasts };
}



