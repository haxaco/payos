import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Send, Copy, ExternalLink, Search } from 'lucide-react';

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  data?: any;
}

const suggestedQueries = [
  'Show me all high-risk transactions from the past week',
  'Which employers have pending KYB approvals?',
  'What is the current USD balance in treasury?',
  'List contractors with failed transactions today'
];

const sampleConversation: Message[] = [
  {
    id: 1,
    type: 'user',
    content: 'Show me all transactions over $10,000 from TechCorp Inc in the last 30 days'
  },
  {
    id: 2,
    type: 'ai',
    content: 'I found 8 transactions from TechCorp Inc over $10,000 in the last 30 days, totaling $127,450. Here are the details:',
    data: {
      transactions: [
        { id: 'TXN-2024-0482', amount: '$15,000', contractor: 'Carlos Rodriguez', date: '2 hours ago', status: 'flagged' },
        { id: 'TXN-2024-0456', amount: '$12,500', contractor: 'Maria Silva', date: '3 days ago', status: 'completed' },
        { id: 'TXN-2024-0423', amount: '$18,200', contractor: 'Juan Martinez', date: '1 week ago', status: 'completed' },
        { id: 'TXN-2024-0401', amount: '$22,100', contractor: 'Ana Garcia', date: '2 weeks ago', status: 'completed' }
      ],
      summary: {
        total: '$127,450',
        count: 8,
        flagged: 1,
        completed: 7
      }
    }
  }
];

export function AISupportAgent() {
  const [messages, setMessages] = useState<Message[]>(sampleConversation);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, {
      id: messages.length + 1,
      type: 'user',
      content: input
    }]);
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        type: 'ai',
        content: 'I\'m processing your request. In a production environment, this would connect to your actual data sources and provide real-time insights.'
      }]);
    }, 1000);
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar - Chat History */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4">
        <Button variant="primary" size="md" className="w-full mb-4">
          <Sparkles className="w-4 h-4" />
          New Conversation
        </Button>
        
        <div className="space-y-2">
          <div className="text-gray-600 dark:text-gray-400 mb-2">Recent Conversations</div>
          <button className="w-full text-left p-3 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="text-gray-900 dark:text-gray-100 mb-1">TechCorp Transactions</div>
            <div className="text-gray-500 dark:text-gray-500">2 hours ago</div>
          </button>
          <button className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <div className="text-gray-900 dark:text-gray-100 mb-1">Pending KYB Reviews</div>
            <div className="text-gray-500 dark:text-gray-500">Yesterday</div>
          </button>
          <button className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <div className="text-gray-900 dark:text-gray-100 mb-1">Treasury Analysis</div>
            <div className="text-gray-500 dark:text-gray-500">3 days ago</div>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-black">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-gray-100">AI Support Agent</h2>
              <p className="text-gray-600 dark:text-gray-400">Ask me anything about your platform data</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto mt-12">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-primary-100 dark:bg-primary-900 rounded-2xl mb-4">
                  <Sparkles className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-gray-900 dark:text-gray-100 mb-2">How can I help you today?</h3>
                <p className="text-gray-600 dark:text-gray-400">Ask me about transactions, employers, contractors, compliance, or treasury.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(query)}
                    className="p-4 text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Search className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{query}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.type === 'user' ? (
                <div className="max-w-2xl bg-primary-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                  {message.content}
                </div>
              ) : (
                <div className="max-w-3xl">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl rounded-tl-sm p-4 border border-gray-200 dark:border-gray-800">
                    <p className="text-gray-900 dark:text-gray-100 mb-3">{message.content}</p>
                    
                    {message.data?.transactions && (
                      <div className="mt-4 space-y-3">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-gray-600 dark:text-gray-400 mb-1">Total Amount</div>
                            <div className="text-gray-900 dark:text-gray-100">{message.data.summary.total}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-gray-600 dark:text-gray-400 mb-1">Transactions</div>
                            <div className="text-gray-900 dark:text-gray-100">{message.data.summary.count}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-gray-600 dark:text-gray-400 mb-1">Flagged</div>
                            <div className="text-error-600 dark:text-error-400">{message.data.summary.flagged}</div>
                          </div>
                        </div>

                        {/* Transaction List */}
                        <div className="border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-800">
                          {message.data.transactions.map((txn: any, index: number) => (
                            <div key={index} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <code className="text-primary-600 dark:text-primary-400">{txn.id}</code>
                                {txn.status === 'flagged' ? (
                                  <Badge variant="error">Flagged</Badge>
                                ) : (
                                  <Badge variant="success">Completed</Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-gray-900 dark:text-gray-100">
                                <div>
                                  <div>{txn.contractor}</div>
                                  <div className="text-gray-600 dark:text-gray-400">{txn.date}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>{txn.amount}</span>
                                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
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
                  <div className="flex gap-2 mt-2 ml-2">
                    <Button variant="ghost" size="sm">
                      <Copy className="w-3 h-3" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about transactions, employers, contractors, compliance..."
              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button variant="primary" size="md" onClick={handleSend}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-gray-500 dark:text-gray-500 mt-2">AI responses are generated based on your platform data</p>
        </div>
      </div>
    </div>
  );
}
