export interface Stream {
  id: string;
  status: 'active' | 'paused' | 'cancelled';
  sender: { id: string; type: 'person' | 'business' | 'agent'; name: string };
  receiver: { id: string; type: 'person' | 'business' | 'agent'; name: string };
  initiatedBy?: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    timestamp: string;
  };
  managedBy?: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    permissions: {
      canModify: boolean;
      canPause: boolean;
      canTerminate: boolean;
    };
  };
  flowRate: { perSecond: number; perMonth: number; currency: string };
  streamed: { total: number; withdrawn: number; available: number };
  funding?: { wrapped: number; buffer: number; runway: { seconds: number; display: string } };
  health: 'healthy' | 'warning' | 'critical';
  description: string;
  category: 'salary' | 'subscription' | 'service' | 'other';
  startedAt: string;
}

// Maria Garcia's streams (Person - receiving salary)
export const mariaStreams: Stream[] = [
  {
    id: 'stream_001',
    status: 'active',
    sender: { id: 'biz_techcorp', type: 'business', name: 'TechCorp Inc' },
    receiver: { id: 'acc_maria', type: 'person', name: 'Maria Garcia' },
    flowRate: { perSecond: 0.000772, perMonth: 2000, currency: 'USDC' },
    streamed: { total: 1847.52, withdrawn: 1200, available: 647.52 },
    health: 'healthy',
    description: 'Monthly salary',
    category: 'salary',
    startedAt: '2025-12-01T00:00:00Z'
  }
];

// TechCorp's streams (Business - paying for services and salaries)
export const techcorpStreams: Stream[] = [
  {
    id: 'stream_002',
    status: 'active',
    sender: { id: 'biz_techcorp', type: 'business', name: 'TechCorp Inc' },
    receiver: { id: 'acc_maria', type: 'person', name: 'Maria Garcia' },
    initiatedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', timestamp: '2025-12-01T00:00:00Z' },
    managedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', permissions: { canModify: true, canPause: true, canTerminate: true } },
    flowRate: { perSecond: 0.000772, perMonth: 2000, currency: 'USDC' },
    streamed: { total: 1847.52, withdrawn: 1200, available: 647.52 },
    funding: { wrapped: 2500, buffer: 6.43, runway: { seconds: 1987200, display: '23 days' } },
    health: 'healthy',
    description: 'Monthly salary',
    category: 'salary',
    startedAt: '2025-12-01T00:00:00Z'
  },
  {
    id: 'stream_003',
    status: 'active',
    sender: { id: 'biz_techcorp', type: 'business', name: 'TechCorp Inc' },
    receiver: { id: 'acc_carlos', type: 'person', name: 'Carlos Martinez' },
    initiatedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', timestamp: '2025-12-01T00:00:00Z' },
    managedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', permissions: { canModify: true, canPause: true, canTerminate: true } },
    flowRate: { perSecond: 0.000694, perMonth: 1800, currency: 'USDC' },
    streamed: { total: 1662.77, withdrawn: 1000, available: 662.77 },
    funding: { wrapped: 900, buffer: 5.79, runway: { seconds: 432000, display: '5 days' } },
    health: 'warning',
    description: 'Monthly salary',
    category: 'salary',
    startedAt: '2025-12-01T00:00:00Z'
  },
  {
    id: 'stream_004',
    status: 'active',
    sender: { id: 'biz_techcorp', type: 'business', name: 'TechCorp Inc' },
    receiver: { id: 'acc_ana', type: 'person', name: 'Ana Rodriguez' },
    initiatedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', timestamp: '2025-12-01T00:00:00Z' },
    managedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', permissions: { canModify: true, canPause: true, canTerminate: true } },
    flowRate: { perSecond: 0.000849, perMonth: 2200, currency: 'USDC' },
    streamed: { total: 2032.27, withdrawn: 1500, available: 532.27 },
    funding: { wrapped: 2700, buffer: 7.07, runway: { seconds: 2592000, display: '30 days' } },
    health: 'healthy',
    description: 'Monthly salary',
    category: 'salary',
    startedAt: '2025-12-01T00:00:00Z'
  },
  {
    id: 'stream_005',
    status: 'paused',
    sender: { id: 'biz_techcorp', type: 'business', name: 'TechCorp Inc' },
    receiver: { id: 'acc_luis', type: 'person', name: 'Luis Fernandez' },
    initiatedBy: { type: 'user', id: 'user_admin', name: 'Admin User', timestamp: '2025-12-01T00:00:00Z' },
    managedBy: { type: 'user', id: 'user_admin', name: 'Admin User', permissions: { canModify: true, canPause: true, canTerminate: true } },
    flowRate: { perSecond: 0.000579, perMonth: 1500, currency: 'USDC' },
    streamed: { total: 1385.63, withdrawn: 1385.63, available: 0 },
    funding: { wrapped: 0, buffer: 0, runway: { seconds: 0, display: 'Paused' } },
    health: 'critical',
    description: 'Monthly salary',
    category: 'salary',
    startedAt: '2025-12-01T00:00:00Z'
  },
  {
    id: 'stream_006',
    status: 'active',
    sender: { id: 'biz_techcorp', type: 'business', name: 'TechCorp Inc' },
    receiver: { id: 'acc_sofia', type: 'person', name: 'Sofia Herrera' },
    initiatedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', timestamp: '2025-12-08T00:00:00Z' },
    managedBy: { type: 'agent', id: 'agent_001', name: 'Payroll Autopilot', permissions: { canModify: true, canPause: true, canTerminate: true } },
    flowRate: { perSecond: 0.000965, perMonth: 2500, currency: 'USDC' },
    streamed: { total: 890.00, withdrawn: 0, available: 890.00 },
    funding: { wrapped: 150, buffer: 8.03, runway: { seconds: 57600, display: '16 hours' } },
    health: 'critical',
    description: 'Monthly salary',
    category: 'salary',
    startedAt: '2025-12-08T00:00:00Z'
  }
];

// Agent streams
export const agentStreams: Stream[] = [
  {
    id: 'stream_agent_001',
    status: 'active',
    sender: { id: 'agent_002', type: 'agent', name: 'Treasury Rebalancer' },
    receiver: { id: 'agent_001', type: 'agent', name: 'Payroll Autopilot' },
    flowRate: { perSecond: 0.00193, perMonth: 5000, currency: 'USDC' },
    streamed: { total: 4627.83, withdrawn: 3000, available: 1627.83 },
    funding: { wrapped: 6000, buffer: 16.08, runway: { seconds: 2592000, display: '30 days' } },
    health: 'healthy',
    description: 'Float replenishment',
    category: 'other',
    startedAt: '2025-11-20T00:00:00Z'
  }
];