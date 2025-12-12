import { useState } from 'react';
import { 
  Briefcase, Send, ShoppingBag, Check, ChevronRight,
  Building2, User, ArrowRight, Sparkles, Rocket, Zap
} from 'lucide-react';
import { Page } from '../App';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  darkBgColor: string;
  accountTypes: string[];
  relationships: string[];
  verification: string;
  features: string[];
}

const templates: Template[] = [
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Businesses pay contractors and employees on schedule',
    icon: Briefcase,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100',
    darkBgColor: 'dark:bg-blue-900/50',
    accountTypes: ['Business (employer)', 'Person (contractor)'],
    relationships: ['employee', 'contractor'],
    verification: 'Business T2+, Person T1+',
    features: ['Scheduled payouts', 'Virtual cards', 'Bank withdrawals', 'Bulk payments']
  },
  {
    id: 'remittance',
    name: 'Remittance',
    description: 'Person-to-person cross-border transfers',
    icon: Send,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100',
    darkBgColor: 'dark:bg-green-900/50',
    accountTypes: ['Person (sender)', 'Person (recipient)'],
    relationships: ['family', 'friend', 'custom'],
    verification: 'Person T2+ for sender, T1+ for recipient',
    features: ['Instant transfers', 'Cash pickup', 'Mobile wallet', 'Low fees']
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Multi-party payments with escrow and splits',
    icon: ShoppingBag,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100',
    darkBgColor: 'dark:bg-purple-900/50',
    accountTypes: ['Business (platform)', 'Business (seller)', 'Person (buyer)'],
    relationships: ['seller', 'buyer', 'platform'],
    verification: 'Platform T3, Sellers T2+, Buyers T1+',
    features: ['Escrow', 'Split payments', 'Refunds', 'Dispute resolution']
  }
];

interface Props {
  onNavigate: (page: Page) => void;
}

export function TemplatesPage({ onNavigate }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<Template>(templates[0]); // Payroll is active
  const [selectedPreview, setSelectedPreview] = useState<Template | null>(null);
  
  const handleActivateTemplate = (template: Template) => {
    setActiveTemplate(template);
    setSelectedPreview(null);
  };
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Templates & Workflows
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure how accounts interact and what verification is required
        </p>
      </div>
      
      {/* Active Template Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Your Active Template
          </span>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Change
          </button>
        </div>
        
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl ${activeTemplate.bgColor} ${activeTemplate.darkBgColor} flex items-center justify-center flex-shrink-0`}>
            <activeTemplate.icon className={`w-7 h-7 ${activeTemplate.color}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {activeTemplate.name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeTemplate.description}
            </p>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Account Types
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {activeTemplate.accountTypes.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Relationships
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {activeTemplate.relationships.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Verification Required
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {activeTemplate.verification}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Features Enabled
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {activeTemplate.features.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Available Templates */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Available Templates
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {templates.map(template => {
            const isActive = template.id === activeTemplate.id;
            const Icon = template.icon;
            
            return (
              <button
                key={template.id}
                onClick={() => setSelectedPreview(isActive ? null : template)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                    : selectedPreview?.id === template.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg ${template.bgColor} ${template.darkBgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${template.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </p>
                    {isActive && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Selected Preview */}
      {selectedPreview && selectedPreview.id !== activeTemplate.id && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Preview: {selectedPreview.name}
            </h3>
            <button 
              onClick={() => setSelectedPreview(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Account Types</p>
              <p className="text-gray-900 dark:text-white">{selectedPreview.accountTypes.join(', ')}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Relationships</p>
              <p className="text-gray-900 dark:text-white">{selectedPreview.relationships.join(', ')}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Verification</p>
              <p className="text-gray-900 dark:text-white">{selectedPreview.verification}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Features</p>
              <p className="text-gray-900 dark:text-white">{selectedPreview.features.join(', ')}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
            <button 
              onClick={() => setSelectedPreview(null)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleActivateTemplate(selectedPreview)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Switch to {selectedPreview.name}
            </button>
          </div>
        </div>
      )}
      
      {/* Workflow Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Workflow Preview: {activeTemplate.name}
        </h3>
        
        <div className="flex items-center justify-center gap-2 py-8">
          {/* Business/Sender */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Business</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Initiates payout</span>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-400 mx-2" />
          
          {/* Compliance */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">AI Compliance</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Risk check</span>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-400 mx-2" />
          
          {/* Treasury */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Treasury</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Convert & route</span>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-400 mx-2" />
          
          {/* Person/Recipient */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Person</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Receives funds</span>
          </div>
        </div>
        
        {/* Sub-processes */}
        <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">KYB Verified</span>
            <div className="flex items-center gap-1 mt-1 justify-center">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-900 dark:text-white">T2+</span>
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Auto-approved</span>
            <div className="flex items-center gap-1 mt-1 justify-center">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-900 dark:text-white">Low risk</span>
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Conversion</span>
            <div className="flex items-center gap-1 mt-1 justify-center">
              <span className="text-sm text-gray-900 dark:text-white">USD → ARS</span>
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">KYC Verified</span>
            <div className="flex items-center gap-1 mt-1 justify-center">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-900 dark:text-white">T1+</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Method Options (only for Payroll template) */}
      {activeTemplate.id === 'payroll' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Payment Method
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer border-2 border-blue-200 dark:border-blue-800">
              <input type="radio" name="paymentMethod" defaultChecked className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">Batch Payroll</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly or bi-weekly batch processing</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer border-2 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <input type="radio" name="paymentMethod" className="w-4 h-4 text-green-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">Money Streaming</p>
                  <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                    Beta
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Continuous per-second payments based on actual work time</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>• Pay only for work completed</span>
                  <span>• Instant contractor access</span>
                  <span>• No waiting for pay cycles</span>
                </div>
              </div>
              <Zap className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            </label>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> Money Streaming is perfect for hourly contractors and project-based work. 
              Contractors get paid continuously as they work, improving cash flow for both parties.
            </p>
          </div>
        </div>
      )}
      
      {/* Coming Soon: Visual Builder */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Coming Soon: Visual Workflow Builder</h3>
              <p className="text-white/80 mt-1">
                Drag-and-drop workflow customization for your exact business needs. 
                Create custom approval flows, add webhooks, and integrate with your existing systems.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-white/90 transition-colors flex-shrink-0">
            Join Waitlist
          </button>
        </div>
      </div>
    </div>
  );
}