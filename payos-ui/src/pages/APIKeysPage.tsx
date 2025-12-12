import { useState } from 'react';
import { 
  Key, Plus, Copy, MoreHorizontal, CheckCircle, XCircle, 
  AlertTriangle
} from 'lucide-react';
import { mockAPIKeys } from '../data/mockDeveloper';

export function APIKeysPage() {
  const [toast, setToast] = useState<string | null>(null);
  
  const activeKeys = mockAPIKeys.filter(k => k.status === 'active');
  const productionKeys = activeKeys.filter(k => k.environment === 'production');
  const sandboxKeys = activeKeys.filter(k => k.environment === 'sandbox');
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast('Copied to clipboard');
    setTimeout(() => setToast(null), 2000);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };
  
  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage API keys for programmatic access to PayOS
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>
      
      {/* Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 dark:text-amber-200 font-medium">Keep your API keys secure</p>
          <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
            Never share API keys in public repositories or client-side code. Use environment variables.
          </p>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Keys</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{activeKeys.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Production</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">{productionKeys.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sandbox</p>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">{sandboxKeys.length}</p>
        </div>
      </div>
      
      {/* Keys Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Key</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Environment</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Permissions</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Used</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {mockAPIKeys.map(key => (
              <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      key.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Key className={`w-4 h-4 ${
                        key.status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{key.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Created {formatDate(key.createdAt)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-gray-600 dark:text-gray-300">
                      {key.keyPrefix}••••{key.keyHint}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(`${key.keyPrefix}...${key.keyHint}`)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    key.environment === 'production'
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                  }`}>
                    {key.environment}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {key.permissions.map(perm => (
                      <span key={perm} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                        {perm}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {getTimeAgo(key.lastUsed)}
                </td>
                <td className="px-6 py-4">
                  {key.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      Revoked
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="w-5 h-5 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
