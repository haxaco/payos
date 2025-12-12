import { 
  Plus, CheckCircle, XCircle, AlertTriangle,
  ExternalLink, Copy, MoreHorizontal, RefreshCw, Webhook as WebhookIcon
} from 'lucide-react';
import { mockWebhooks } from '../data/mockDeveloper';

export function WebhooksPage() {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Active' };
      case 'failing':
        return { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50', label: 'Failing' };
      default:
        return { icon: XCircle, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Inactive' };
    }
  };
  
  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
  
  const availableEvents = [
    { category: 'Payments', events: ['payment.created', 'payment.completed', 'payment.failed', 'payment.refunded'] },
    { category: 'Accounts', events: ['account.created', 'account.updated', 'account.verified', 'account.suspended'] },
    { category: 'Compliance', events: ['compliance.flag.created', 'compliance.flag.resolved', 'compliance.flag.escalated'] },
    { category: 'Agents', events: ['agent.created', 'agent.payment', 'agent.approval.required'] },
    { category: 'Cards', events: ['card.created', 'card.transaction', 'card.frozen', 'card.cancelled'] }
  ];
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Receive real-time notifications when events happen in PayOS
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>
      
      {/* Webhook Cards */}
      <div className="space-y-4">
        {mockWebhooks.map(webhook => {
          const statusConfig = getStatusConfig(webhook.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <div 
              key={webhook.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
                    <WebhookIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-900 dark:text-white">{webhook.url}</code>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <a href={webhook.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-1">
                      {webhook.events.map(event => (
                        <span key={event} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                          {event}
                        </span>
                      ))}
                    </div>
                    
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Last triggered: {getTimeAgo(webhook.lastTriggered)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Success rate: <span className={
                          webhook.successRate >= 95 ? 'text-green-600 dark:text-green-400' : 
                          webhook.successRate >= 80 ? 'text-amber-600 dark:text-amber-400' : 
                          'text-red-600 dark:text-red-400'
                        }>{webhook.successRate}%</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Send test event">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              
              {webhook.status === 'failing' && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Warning:</strong> This webhook has been failing. Last 5 attempts returned errors.
                    <button className="underline ml-1">View logs</button>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Available Events Reference */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Available Events</h3>
        <div className="grid grid-cols-3 gap-6">
          {availableEvents.map(category => (
            <div key={category.category}>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{category.category}</h4>
              <div className="space-y-1">
                {category.events.map(event => (
                  <code key={event} className="block text-xs font-mono text-gray-600 dark:text-gray-300">
                    {event}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
