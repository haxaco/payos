'use client';

import { FileCode, Plus, Copy, Edit2, Trash2 } from 'lucide-react';

const mockTemplates = [
  { id: 1, name: 'Monthly Salary', type: 'stream', description: 'Standard monthly salary payment stream', flowRate: '$5,000/month', uses: 45 },
  { id: 2, name: 'Contractor Payment', type: 'transfer', description: 'One-time contractor payment', amount: '$2,500', uses: 128 },
  { id: 3, name: 'Weekly Allowance', type: 'stream', description: 'Weekly recurring allowance', flowRate: '$200/week', uses: 23 },
  { id: 4, name: 'Invoice Payment', type: 'transfer', description: 'Standard invoice payment', amount: 'Variable', uses: 89 },
];

export default function TemplatesPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Templates</h1>
          <p className="text-gray-600 dark:text-gray-400">Create reusable payment templates</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTemplates.map((template) => (
          <div key={template.id} className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                template.type === 'stream'
                  ? 'bg-purple-100 dark:bg-purple-950'
                  : 'bg-blue-100 dark:bg-blue-950'
              }`}>
                <FileCode className={`w-5 h-5 ${
                  template.type === 'stream'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                template.type === 'stream'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
              }`}>
                {template.type}
              </span>
            </div>
            
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {template.type === 'stream' ? template.flowRate : template.amount}
              </span>
              <span className="text-gray-500 dark:text-gray-400">{template.uses} uses</span>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Copy className="w-4 h-4" />
                Use
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Add New Template Card */}
        <button className="bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Create New Template</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Start from scratch</span>
        </button>
      </div>
    </div>
  );
}

