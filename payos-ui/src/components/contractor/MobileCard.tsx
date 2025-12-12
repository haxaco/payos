import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Eye, EyeOff, Copy, CreditCard, Lock, Unlock, Settings, MapPin, Check } from 'lucide-react';

export function MobileCard() {
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
        <h2 className="text-gray-900 dark:text-gray-100">My Card</h2>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Virtual Card */}
        <div className="relative">
          {/* Card Visual */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-6 shadow-2xl aspect-[1.586/1] flex flex-col justify-between overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/20 to-transparent rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-primary-600/20 to-transparent rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg"></div>
                  <span className="text-white">PayOS</span>
                </div>
                <Badge variant="success" size="sm">
                  Virtual
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <p className="text-gray-400 mb-2">Card Number</p>
                  <div className="flex items-center justify-between">
                    <code className="text-white text-lg tracking-wider">
                      {showCardNumber ? '4532 1234 5678 9012' : '•••• •••• •••• 9012'}
                    </code>
                    <button
                      onClick={() => setShowCardNumber(!showCardNumber)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {showCardNumber ? (
                        <EyeOff className="w-4 h-4 text-white" />
                      ) : (
                        <Eye className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400 mb-1">Expiry Date</p>
                    <p className="text-white">12/27</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">CVV</p>
                    <div className="flex items-center gap-2">
                      <code className="text-white">
                        {showCVV ? '123' : '•••'}
                      </code>
                      <button
                        onClick={() => setShowCVV(!showCVV)}
                        className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {showCVV ? (
                          <EyeOff className="w-3 h-3 text-white" />
                        ) : (
                          <Eye className="w-3 h-3 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cardholder */}
                <div>
                  <p className="text-gray-400 mb-1">Cardholder</p>
                  <p className="text-white">CARLOS RODRIGUEZ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Frozen Overlay */}
          {isCardFrozen && (
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <Lock className="w-12 h-12 text-white mx-auto mb-2" />
                <p className="text-white">Card Frozen</p>
              </div>
            </div>
          )}
        </div>

        {/* Card Details Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleCopy('4532123456789012', 'number')}
            className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {copied === 'number' ? (
              <>
                <Check className="w-4 h-4 text-success-600 dark:text-success-400" />
                <span className="text-success-600 dark:text-success-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">Copy Number</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleCopy('123', 'cvv')}
            className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {copied === 'cvv' ? (
              <>
                <Check className="w-4 h-4 text-success-600 dark:text-success-400" />
                <span className="text-success-600 dark:text-success-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">Copy CVV</span>
              </>
            )}
          </button>
        </div>

        {/* Digital Wallets */}
        <div className="space-y-3">
          <h3 className="text-gray-900 dark:text-gray-100">Add to Digital Wallet</h3>
          <button className="w-full flex items-center justify-between p-4 bg-black dark:bg-white rounded-xl hover:opacity-90 transition-opacity">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-black rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" className="text-black dark:text-white" />
                </svg>
              </div>
              <span className="text-white dark:text-black">Apple Pay</span>
            </div>
            <svg className="w-5 h-5 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white">G</span>
              </div>
              <span className="text-gray-900 dark:text-gray-100">Google Pay</span>
            </div>
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Card Controls */}
        <div className="space-y-3">
          <h3 className="text-gray-900 dark:text-gray-100">Card Controls</h3>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl divide-y divide-gray-200 dark:divide-gray-800">
            {/* Freeze/Unfreeze */}
            <button
              onClick={() => setIsCardFrozen(!isCardFrozen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isCardFrozen ? (
                  <Unlock className="w-5 h-5 text-success-600 dark:text-success-400" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <div className="text-left">
                  <div className="text-gray-900 dark:text-gray-100">
                    {isCardFrozen ? 'Unfreeze Card' : 'Freeze Card'}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {isCardFrozen ? 'Enable card transactions' : 'Temporarily disable transactions'}
                  </div>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors ${
                isCardFrozen ? 'bg-error-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${
                  isCardFrozen ? 'translate-x-6 ml-1' : 'translate-x-0.5'
                }`}></div>
              </div>
            </button>

            {/* Spending Limits */}
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <div className="text-gray-900 dark:text-gray-100">Spending Limits</div>
                  <div className="text-gray-600 dark:text-gray-400">$500/day, $2,000/week</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Card Status */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <div className="text-gray-900 dark:text-gray-100">Card Status</div>
                  <div className="text-gray-600 dark:text-gray-400">Virtual card active</div>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </div>

        {/* Request Physical Card */}
        <Button variant="primary" size="lg" className="w-full">
          <CreditCard className="w-5 h-5" />
          Request Physical Card
        </Button>

        {/* Recent Card Transactions */}
        <div className="space-y-3">
          <h3 className="text-gray-900 dark:text-gray-100">Recent Card Transactions</h3>
          <div className="bg-white dark:bg-gray-900 rounded-xl divide-y divide-gray-200 dark:divide-gray-800">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <span>🛒</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-900 dark:text-gray-100 mb-0.5">Amazon</div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>Online</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-900 dark:text-gray-100 mb-0.5">-$45.99</div>
                <span className="text-gray-600 dark:text-gray-400">Yesterday</span>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <span>☕</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-900 dark:text-gray-100 mb-0.5">Starbucks</div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>New York, NY</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-900 dark:text-gray-100 mb-0.5">-$6.50</div>
                <span className="text-gray-600 dark:text-gray-400">2 days ago</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 text-primary-600 dark:text-primary-400">
            <div className="w-6 h-6 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <span>Card</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
