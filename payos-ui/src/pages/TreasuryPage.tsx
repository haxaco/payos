import { Page } from '../App';
import { AlertTriangle, Sparkles, TrendingDown, DollarSign, ArrowRight, RefreshCw, Send, Zap, CheckCircle, XCircle, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AISparkleButton } from '../components/ui/AISparkleButton';

interface TreasuryPageProps {
  onNavigate: (page: Page) => void;
}

const floatData = [
  { time: 'Now', usdc: 2400, cop: 450, min: 200 },
  { time: '12h', usdc: 2350, cop: 320, min: 200 },
  { time: '24h', usdc: 2300, cop: 250, min: 200 },
  { time: '36h', usdc: 2250, cop: 150, min: 200 },
  { time: '48h', usdc: 2200, cop: 100, min: 200 },
];

export function TreasuryPage({ onNavigate }: TreasuryPageProps) {
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Treasury</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor float and manage rebalancing</p>
      </div>

      {/* Alert */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">⚠️ ACTION NEEDED</h3>
            <p className="text-sm text-red-800 dark:text-red-300 mb-3">
              COP float projected to deplete in 36 hours
            </p>
            <button className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors">
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Float Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">USDC</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">$2.4M</div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-600 rounded-full" style={{ width: '80%' }}></div>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 font-semibold">Healthy</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">ARS</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">$840K</div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-600 rounded-full" style={{ width: '60%' }}></div>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 font-semibold">Adequate</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-lg p-5">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2">
            <span>COP</span>
            <AlertTriangle className="w-3 h-3 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">$45K</div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-red-600 rounded-full" style={{ width: '20%' }}></div>
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 font-semibold">Low</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">MXN</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">$320K</div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-600 rounded-full" style={{ width: '50%' }}></div>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 font-semibold">Adequate</div>
        </div>
      </div>

      {/* Float Projection */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Float Projection</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-md">24H</button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">48H</button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">7D</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={floatData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" vertical={false} />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'currentColor', fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'currentColor', fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              tickFormatter={(value) => `$${value}K`}
            />
            <Tooltip />
            <ReferenceLine y={200} stroke="#dc2626" strokeDasharray="3 3" label="Minimum" />
            <Line type="monotone" dataKey="cop" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI Recommendation */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-900 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">✨ AI Treasury Recommendation</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Based on scheduled payouts and historical card spend:
            </p>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
              <li className="flex gap-2">
                <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                <span><strong>COP:</strong> Convert $20K USDC → COP to maintain 72hr buffer</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                <span><strong>ARS:</strong> Adequate for 5 days at current velocity</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                <span><strong>MXN:</strong> Consider pre-positioning $15K for Dec 15 payroll</span>
              </li>
            </ul>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors">
                Execute COP Rebalance: $20K
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">Confidence: 89%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stablecoin Flow Diagram */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Stablecoin Flow</h3>
          <AISparkleButton context="stablecoin payment flow" />
        </div>
        
        <div className="flex items-center justify-between">
          {/* Step 1: Source */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-3">
              <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">USD Source</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bank / Wire</p>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          
          {/* Step 2: On-Ramp */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-3">
              <span className="text-2xl">🪙</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">USDC Mint</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Circle / Bridge</p>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          
          {/* Step 3: PayOS Treasury */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-3 ring-4 ring-violet-200 dark:ring-violet-800">
              <Wallet className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">PayOS Treasury</p>
            <p className="text-sm text-violet-600 dark:text-violet-400">AI-Managed</p>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          
          {/* Step 4: Conversion */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
              <RefreshCw className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">FX Conversion</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">USDC → Local</p>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          
          {/* Step 5: Off-Ramp */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-3">
              <Send className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">Local Payout</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bank / Wallet</p>
          </div>
        </div>
      </div>

      {/* Rail Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Rail Status</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">Last checked: 2 min ago</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* On-Ramp Providers */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">On-Ramp</h4>
            <div className="space-y-2">
              {[
                { name: 'Circle USDC', status: 'operational', latency: '&lt; 1 min' },
                { name: 'Bridge', status: 'operational', latency: '&lt; 5 min' },
              ].map(rail => (
                <div key={rail.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-900 dark:text-white">{rail.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: rail.latency }} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Off-Ramp / Local Rails */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Off-Ramp (Local Rails)</h4>
            <div className="space-y-2">
              {[
                { name: '🇦🇷 Argentina (CVU)', status: 'operational', latency: 'Instant' },
                { name: '🇧🇷 Brazil (PIX)', status: 'operational', latency: 'Instant' },
                { name: '🇲🇽 Mexico (SPEI)', status: 'operational', latency: '&lt; 30 min' },
                { name: '🇨🇴 Colombia (PSE)', status: 'degraded', latency: '1-2 hours' },
              ].map(rail => (
                <div key={rail.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {rail.status === 'operational' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : rail.status === 'degraded' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-gray-900 dark:text-white">{rail.name}</span>
                  </div>
                  <span className={`text-sm ${
                    rail.status === 'operational' ? 'text-gray-500 dark:text-gray-400' : 'text-amber-600 dark:text-amber-400'
                  }`} dangerouslySetInnerHTML={{ __html: rail.latency }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* X-402 Protocol Status */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">X-402 Protocol</h3>
              <p className="text-white/80 text-sm">
                AI agents can autonomously request and execute payments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-white/60 text-xs">Active Agents</p>
              <p className="text-xl font-semibold">3</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">24h Volume</p>
              <p className="text-xl font-semibold">$127K</p>
            </div>
            <button 
              onClick={() => onNavigate('agents')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Manage Agents →
            </button>
          </div>
        </div>
      </div>

      {/* Money Streams (Beta) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Money Streams</h3>
            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
              Beta
            </span>
          </div>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Manage Streams →
          </button>
        </div>
        
        {/* Netflow Visualization */}
        <div className="flex items-center justify-center gap-8 py-6">
          {/* Inflows */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-2 mx-auto">
              <ArrowDownLeft className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Inflows</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">+$12,960/mo</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">3 active streams</p>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          
          {/* Treasury */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-2 mx-auto ring-4 ring-violet-200 dark:ring-violet-800">
              <Wallet className="w-10 h-10 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Treasury</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">$3.6M</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">Streaming</span>
            </div>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          
          {/* Outflows */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2 mx-auto">
              <ArrowUpRight className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Outflows</p>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">-$7,776/mo</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">18 contractors</p>
          </div>
        </div>
        
        {/* Net Summary */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">Net Flow</p>
              <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                +$5,184/month
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                ≈ $173.12/day • $7.21/hour
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Positive flow
            </div>
          </div>
        </div>
        
        {/* Stream Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>What is Money Streaming?</strong> Continuous per-second payments using real-time protocols. 
            Contractors receive funds as work is completed, and you pay only for actual work time.
          </p>
        </div>
      </div>
    </div>
  );
}