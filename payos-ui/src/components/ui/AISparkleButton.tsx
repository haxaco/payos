import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface Props {
  context: string;          // What to analyze, e.g. "treasury balance for TechCorp"
  label?: string;           // Optional button label, e.g. "Deep dive"
  onOpenChat?: (query: string) => void;  // Callback to open AI Assistant with query
}

// Pre-built insights based on context keywords
const getInsight = (context: string): { summary: string; detail: string } => {
  const ctx = context.toLowerCase();
  
  if (ctx.includes('treasury') || ctx.includes('balance')) {
    return {
      summary: 'Healthy balance with minor alert',
      detail: 'Current balance covers 3 weeks of scheduled payouts. COP float is running low — consider rebalancing $20K from USDC.'
    };
  }
  
  if (ctx.includes('payout')) {
    return {
      summary: 'Consistent payout pattern',
      detail: 'Monthly payouts average $7,800 across 4 contractors. No unusual spikes or timing changes detected.'
    };
  }
  
  if (ctx.includes('contractor') || ctx.includes('person')) {
    return {
      summary: 'Low-risk contractor',
      detail: 'Regular payment recipient with 6-month history. All KYC verified. No compliance flags.'
    };
  }
  
  if (ctx.includes('transaction')) {
    return {
      summary: 'Standard transaction',
      detail: 'Amount and recipient match historical patterns. Auto-approved by compliance rules.'
    };
  }
  
  if (ctx.includes('analysis') || ctx.includes('full')) {
    return {
      summary: 'Comprehensive analysis available',
      detail: 'Open the AI Assistant for detailed behavioral analysis, risk scoring, and recommendations.'
    };
  }
  
  return {
    summary: 'AI insight available',
    detail: 'Click to get AI-powered analysis of this data.'
  };
};

export function AISparkleButton({ context, label, onOpenChat }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const insight = getInsight(context);
  
  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  const handleOpenChat = () => {
    setIsOpen(false);
    if (onOpenChat) {
      onOpenChat(`Analyze ${context}`);
    }
    // If no callback, dispatch custom event that App.tsx can listen to
    window.dispatchEvent(new CustomEvent('open-ai-chat', { 
      detail: { query: `Analyze ${context}` }
    }));
  };
  
  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
          isOpen
            ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
            : 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {label && <span>{label}</span>}
      </button>
      
      {isOpen && (
        <div 
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">AI Insight</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {insight.summary}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {insight.detail}
            </p>
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <button
              onClick={handleOpenChat}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Open in AI Chat
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
