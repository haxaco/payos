import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { matchQuery, defaultResponse } from '../../data/aiResponses';
import { AIResponse } from '../../types/aiAssistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | AIResponse;
  timestamp: Date;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AIAssistant({ isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSend = () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Simulate AI thinking delay
    setTimeout(() => {
      const response = matchQuery(input);
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 600);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const suggestedQueries = [
    'Show me flagged transactions',
    'Transactions over $5K this week',
    'Why was the last transaction flagged?',
    'Treasury status',
    'Approve all low-risk flags'
  ];
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">AI Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button 
                onClick={() => setMessages([])}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ask me anything about your accounts, transactions, compliance, or treasury.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  Try asking:
                </p>
                {suggestedQueries.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(query)}
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    &quot;{query}&quot;
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'user' ? (
                  <div className="max-w-[80%] px-4 py-2 bg-blue-600 text-white rounded-2xl rounded-br-md">
                    <p className="text-sm">{message.content as string}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    <AIResponseRenderer response={message.content as AIResponse} />
                  </div>
                )}
              </div>
            ))
          )}
          
          {isTyping && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Response renderer component
function AIResponseRenderer({ response }: { response: AIResponse }) {
  if (response.type === 'text') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        {response.title && (
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {response.title}
          </h4>
        )}
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {response.text.split('**').map((part, i) => 
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </div>
        {response.actions && response.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {response.actions.map((action, i) => (
              <button 
                key={i}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  i === 0 
                    ? 'bg-violet-600 text-white hover:bg-violet-700' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  if (response.type === 'list') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white">{response.title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{response.summary}</p>
        
        {response.alert && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {response.alert}
          </div>
        )}
        
        {response.stats && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.entries(response.stats).map(([key, value]) => (
              <div key={key}>
                <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-3 space-y-2">
          {response.items.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                {item.desc || item.currency}
              </span>
              {item.risk && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 ${
                  item.risk === 'high' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                  item.risk === 'medium' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                  'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                }`}>
                  {item.risk}
                </span>
              )}
              {item.amount && (
                <span className="text-sm font-medium text-gray-900 dark:text-white ml-2">
                  {item.amount}
                </span>
              )}
              {item.status && !item.risk && (
                <span className={`text-xs ml-2 ${
                  item.status === 'healthy' ? 'text-green-600 dark:text-green-400' :
                  item.status === 'low' ? 'text-red-600 dark:text-red-400' :
                  item.status === 'flagged' ? 'text-amber-600 dark:text-amber-400' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {item.status}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {response.recommendation && (
          <p className="mt-3 text-sm text-violet-600 dark:text-violet-400 flex items-start gap-1">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {response.recommendation}
          </p>
        )}
        
        {response.actions && response.actions.length > 0 && (
          <div className="mt-3 flex gap-2">
            {response.actions.map((action, i) => (
              <button 
                key={i}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  i === 0 
                    ? 'bg-violet-600 text-white hover:bg-violet-700' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  if (response.type === 'action') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white">{response.title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{response.summary}</p>
        
        <div className="mt-3 space-y-2">
          {response.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{item.desc}</span>
            </div>
          ))}
          {response.items.length < 8 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">
              +{8 - response.items.length} more...
            </p>
          )}
        </div>
        
        {response.warning && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-1">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {response.warning}
          </p>
        )}
        
        <div className="mt-4 flex gap-2">
          <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
            {response.actions[0]}
          </button>
          <button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors">
            {response.actions[1]}
          </button>
        </div>
      </div>
    );
  }
  
  return null;
}