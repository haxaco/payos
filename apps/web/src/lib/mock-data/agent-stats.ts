// Mock Agent Statistics Data
// Future: Replace with API call to /v1/agents/stats

export interface AgentStats {
  activeAgents: number;
  totalAgents: number;
  actionsToday: number;
  actionsTrend: number; // vs yesterday percentage
  successRate: number;
  failedActions: number;
  volumeProcessed: number;
  volumeCurrency: string;
  topAgent: {
    id: string;
    name: string;
    actions: number;
    volume: number;
  };
  byType: {
    transfers: number;
    streams: number;
    topUps: number;
  };
}

export const mockAgentStats: AgentStats = {
  activeAgents: 8,
  totalAgents: 14,
  actionsToday: 142,
  actionsTrend: 12, // +12% vs yesterday
  successRate: 99.3,
  failedActions: 1,
  volumeProcessed: 47230,
  volumeCurrency: 'USDC',
  topAgent: {
    id: 'agent-payroll-bot',
    name: 'Payroll Autopilot',
    actions: 67,
    volume: 28500,
  },
  byType: {
    transfers: 89,
    streams: 34,
    topUps: 19,
  },
};

