import { useState } from 'react';
import { Sparkles, Send, Search, ExternalLink, MessageSquare, Zap } from 'lucide-react';

const suggestedQueries = [
  { text: 'Show high-risk transactions from last week', icon: '🔍' },
  { text: 'Which employers have pending KYB?', icon: '🏢' },
  { text: 'Current USD balance in treasury', icon: '💰' },
  { text: 'Failed transactions today', icon: '⚠️' },
];

const sampleMessages = [
  {
    type: 'user',
    text: 'Show me all transactions over $10,000 from TechCorp Inc in the last 30 days'
  },
  {
    type: 'ai',
    text: 'I found 8 transactions from TechCorp Inc over $10,000 in the last 30 days, totaling $127,450.',
    data: {
      summary: { total: '$127,450', count: 8, flagged: 1, completed: 7 },
      transactions: [
        { id: 'TXN-2024-0482', amount: '$15,000', contractor: 'Carlos Rodriguez', date: '2 hours ago', status: 'flagged' },
        { id: 'TXN-2024-0456', amount: '$12,500', contractor: 'Maria Silva', date: '3 days ago', status: 'completed' },
        { id: 'TXN-2024-0423', amount: '$18,200', contractor: 'Juan Martinez', date: '1 week ago', status: 'completed' },
        { id: 'TXN-2024-0401', amount: '$22,100', contractor: 'Ana Garcia', date: '2 weeks ago', status: 'completed' },
      ]
    }
  }
];

export function AIAssistant() {
  const [messages, setMessages] = useState(sampleMessages);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, { type: 'user', text: input }]);
    setInput('');
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'ai',
        text: 'I\'m processing your request. In production, this would connect to your data sources for real-time insights.'
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            New Conversation
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-2">
            RECENT CHATS
          </div>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-3 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-semibold">TechCorp Analysis</span>
              </div>
              <div className="text-xs text-blue-600/60 dark:text-blue-400/60">2 hours ago</div>
            </button>
            
            {['Treasury Balance Query', 'Compliance Flags Review', 'Monthly Volume Report'].map((title, i) => (
              <button key={i} className="w-full text-left px-3 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold">{title}</span>
                </div>
                <div className="text-xs text-slate-500">{i + 1} days ago</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-black">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                AI Assistant
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ask me anything about your platform data and operations
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto mt-16">
              <div className="text-center mb-12">
                <div className="inline-flex p-5 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 rounded-3xl mb-6">
                  <Sparkles className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                  How can I help you today?
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  Ask me about transactions, employers, contractors, compliance, or treasury
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedQueries.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(query.text)}
                    className="p-5 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{query.icon}</span>
                      <div className="flex-1">
                        <p className="text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                          {query.text}
                        </p>
                      </div>
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
                    <div className="max-w-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-6 py-4 shadow-lg shadow-blue-500/20">
                      <p className="font-medium">{msg.text}</p>
                    </div>
                  ) : (
                    <div className="max-w-3xl w-full">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-sm p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
                        <p className="text-slate-900 dark:text-white mb-4 font-medium">{msg.text}</p>
                        
                        {msg.data && (
                          <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-4 gap-3">
                              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total</div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white">{msg.data.summary.total}</div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Count</div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white">{msg.data.summary.count}</div>
                              </div>
                              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
                                <div className="text-xs text-red-600 dark:text-red-400 mb-1">Flagged</div>
                                <div className="text-xl font-bold text-red-600 dark:text-red-400">{msg.data.summary.flagged}</div>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4">
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Completed</div>
                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{msg.data.summary.completed}</div>
                              </div>
                            </div>

                            {/* Transaction List */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                              {msg.data.transactions.map((txn: any, j: number) => (
                                <div key={j} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                  <div className="flex items-center justify-between mb-3">
                                    <code className="text-sm text-blue-600 dark:text-blue-400 font-semibold font-mono">
                                      {txn.id}
                                    </code>
                                    <span className={`
                                      px-2.5 py-1 text-xs font-semibold rounded-full
                                      ${txn.status === 'flagged' 
                                        ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400' 
                                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                      }
                                    `}>
                                      {txn.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                        {txn.contractor}
                                      </div>
                                      <div className="text-xs text-slate-600 dark:text-slate-400">
                                        {txn.date}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                                        {txn.amount}
                                      </span>
                                      <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all">
                                        <ExternalLink className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about transactions, employers, contractors..."
                className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              <button 
                onClick={handleSend}
                className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-3">
              Powered by PayOS AI • Responses generated from your platform data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
