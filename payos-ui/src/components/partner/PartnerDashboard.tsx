import { StatCard } from '../ui/StatCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DollarSign, Building2, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const volumeData = [
  { date: 'Jan', volume: 245000 },
  { date: 'Feb', volume: 312000 },
  { date: 'Mar', volume: 289000 },
  { date: 'Apr', volume: 401000 },
  { date: 'May', volume: 478000 },
  { date: 'Jun', volume: 523000 }
];

const corridorData = [
  { corridor: 'US → MX', volume: 185000 },
  { corridor: 'US → AR', volume: 142000 },
  { corridor: 'US → CO', volume: 98000 },
  { corridor: 'US → BR', volume: 98000 }
];

const recentActivity = [
  { id: 1, type: 'Payout', employer: 'TechCorp Inc', amount: '$12,450', status: 'completed', time: '5 min ago' },
  { id: 2, type: 'KYB Approved', employer: 'StartupXYZ', status: 'success', time: '12 min ago' },
  { id: 3, type: 'Compliance Flag', employer: 'Global Services', status: 'warning', time: '25 min ago' },
  { id: 4, type: 'Payout', employer: 'Innovation Labs', amount: '$8,920', status: 'completed', time: '1 hour ago' },
  { id: 5, type: 'New Employer', employer: 'Finance Plus', status: 'pending', time: '2 hours ago' }
];

export function PartnerDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 dark:text-gray-100 mb-1">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome back, here's what's happening with your platform today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Volume"
          value="$2.1M"
          change={{ value: '+12.5%', direction: 'up' }}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Active Employers"
          value="47"
          change={{ value: '+3', direction: 'up' }}
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          title="Active Contractors"
          value="1,243"
          change={{ value: '+89', direction: 'up' }}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Revenue (MTD)"
          value="$24,580"
          change={{ value: '+18.2%', direction: 'up' }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Alerts */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-warning-50 dark:bg-warning-950 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-warning-600 dark:text-warning-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 dark:text-gray-100 mb-1">3 Compliance Flags Need Review</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">High-risk transactions detected. AI Copilot has prepared recommendations.</p>
            <Button variant="primary" size="sm">
              Review Flags
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <Card>
          <h3 className="text-gray-900 dark:text-gray-100 mb-4">Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="volume" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Corridor Chart */}
        <Card>
          <h3 className="text-gray-900 dark:text-gray-100 mb-4">Payouts by Corridor</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={corridorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="corridor" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="volume" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 dark:text-gray-100">Recent Activity</h3>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'completed' ? 'bg-success-500' :
                  activity.status === 'success' ? 'bg-success-500' :
                  activity.status === 'warning' ? 'bg-warning-500' :
                  'bg-gray-400'
                }`}></div>
                <div>
                  <div className="text-gray-900 dark:text-gray-100">{activity.type}</div>
                  <div className="text-gray-600 dark:text-gray-400">{activity.employer}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {activity.amount && (
                  <span className="text-gray-900 dark:text-gray-100">{activity.amount}</span>
                )}
                {activity.status === 'completed' && <Badge variant="success">Completed</Badge>}
                {activity.status === 'success' && <Badge variant="success">Approved</Badge>}
                {activity.status === 'warning' && <Badge variant="warning">Review</Badge>}
                {activity.status === 'pending' && <Badge variant="default">Pending</Badge>}
                <span className="text-gray-500 dark:text-gray-500 min-w-24 text-right">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
