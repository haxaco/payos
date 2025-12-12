import { useState } from 'react';
import { Sparkles, Send, Search, ExternalLink, Copy } from 'lucide-react';

const suggestedQueries = [
  'Show me all high-risk transactions from the past week',
  'Which employers have pending KYB approvals?',
  'What is the current USD balance in treasury?',
  'List contractors with failed transactions today'
];

export function AISupport({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      type: 'user',
      text: 'Show me all transactions over $10,000 from TechCorp Inc in the last 30 days'
    },
    {
      type: 'ai',
      text: 'I found 8 transactions from TechCorp Inc over $10,000 in the last 30 days, totaling $127,450. Here are the details:',
      data: {
        summary: { total: '$127,450', count: 8, flagged: 1 },
        transactions: [
          { id: 'TXN-2024-0482', amount: '$15,000', contractor: 'Carlos Rodriguez', date: '2 hours ago', status: 'flagged' },
          { id: 'TXN-2024-0456', amount: '$12,500', contractor: 'Maria Silva', date: '3 days ago', status: 'completed' },
          { id: 'TXN-2024-0423', amount: '$18,200', contractor: 'Juan Martinez', date: '1 week ago', status: 'completed' },
        ]
      }
    }
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { type: 'user', text: input }]);
    setInput('');
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'ai',
        text: 'I\'m processing your request. In a production environment, this would connect to your actual data sources and provide real-time insights.'
      }]);
    }, 1000);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-4">
        <button className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" />
          New Chat
        </button>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Recent Chats</div>
        <div className="space-y-1">
          <button className="w-full text-left px-3 py-2.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg font-medium">
            <div className="text-sm mb-1">TechCorp Transactions</div>
            <div className="text-xs text-blue-600/60 dark:text-blue-400/60">2 hours ago</div>
          </button>
          <button className="w-full text-left px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg">
            <div className="text-sm mb-1">Pending KYB Reviews</div>
            <div className="text-xs text-gray-500">Yesterday</div>
          </button>
          <button className="w-full text-left px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg">
            <div className="text-sm mb-1">Treasury Analysis</div>
            <div className="text-xs text-gray-500">3 days ago</div>
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-black">
        {/* Header */}
        <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Support Agent</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ask me anything about your platform data</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto mt-12">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-blue-100 dark:bg-blue-950 rounded-2xl mb-4">
                  <Sparkles className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">How can I help you today?</h3>
                <p className="text-gray-600 dark:text-gray-400">Ask me about transactions, employers, contractors, compliance, or treasury.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedQueries.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(query)}
                    className="p-4 text-left bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Search className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{query}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'user' ? (
                    <div className="max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-md px-5 py-3">
                      <p>{msg.text}</p>
                    </div>
                  ) : (
                    <div className="max-w-3xl">
                      <div className="bg-white dark:bg-gray-950 rounded-2xl rounded-tl-md p-5 border border-gray-200 dark:border-gray-800">
                        <p className="text-gray-900 dark:text-white mb-4">{msg.text}</p>
                        
                        {msg.data && (
                          <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Amount</div>
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">{msg.data.summary.total}</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transactions</div>
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">{msg.data.summary.count}</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Flagged</div>
                                <div className="text-lg font-semibold text-red-600 dark:text-red-400">{msg.data.summary.flagged}</div>
                              </div>
                            </div>

                            {/* Transactions */}
                            <div className="border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-800">
                              {msg.data.transactions.map((txn: any, j: number) => (
                                <div key={j} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <code className="text-sm text-blue-600 dark:text-blue-400 font-mono">{txn.id}</code>
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                      txn.status === 'flagged' 
                                        ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                    }`}>
                                      {txn.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">{txn.contractor}</div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">{txn.date}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{txn.amount}</span>
                                      <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors">
                                        <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button className="mt-2 ml-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2">
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about transactions, employers, contractors, compliance..."
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleSend}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-3">AI responses are generated based on your platform data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
