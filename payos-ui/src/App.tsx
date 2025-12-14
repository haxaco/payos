import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AIAssistant } from './components/layout/AIAssistant';
import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { AccountDetailPage } from './pages/AccountDetailPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { CompliancePage } from './pages/CompliancePage';
import { ComplianceFlagDetailPage } from './pages/ComplianceFlagDetailPage';
import { TreasuryPage } from './pages/TreasuryPage';
import { CardsPage } from './pages/CardsPage';
import { CardDetailPage } from './pages/CardDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { VerificationTiersPage } from './pages/VerificationTiersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AgentsPage } from './pages/AgentsPage';
import { AgentDetailPage } from './pages/AgentDetailPage';
import { APIKeysPage } from './pages/APIKeysPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { RequestLogsPage } from './pages/RequestLogsPage';
import { AgentVerificationTiersPage } from './pages/AgentVerificationTiersPage';
import { ReportsPage } from './pages/ReportsPage';
import { DisputesPage } from './pages/DisputesPage';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI Assistant - Always accessible */}
      <AIAssistant 
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
      />

      {/* AI Assistant Floating Button */}
      <button
        onClick={() => setAiAssistantOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center z-40"
        aria-label="Open AI Assistant"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout><HomePage /></DashboardLayout>} />
        <Route path="/accounts" element={<DashboardLayout><AccountsPage /></DashboardLayout>} />
        <Route path="/accounts/:id" element={<DashboardLayout><AccountDetailPage /></DashboardLayout>} />
        <Route path="/transactions" element={<DashboardLayout><TransactionsPage /></DashboardLayout>} />
        <Route path="/transactions/:id" element={<DashboardLayout><TransactionDetailPage /></DashboardLayout>} />
        <Route path="/cards" element={<DashboardLayout><CardsPage /></DashboardLayout>} />
        <Route path="/cards/:id" element={<DashboardLayout><CardDetailPage /></DashboardLayout>} />
        <Route path="/compliance" element={<DashboardLayout><CompliancePage /></DashboardLayout>} />
        <Route path="/compliance/:id" element={<DashboardLayout><ComplianceFlagDetailPage /></DashboardLayout>} />
        <Route path="/disputes" element={<DashboardLayout><DisputesPage /></DashboardLayout>} />
        <Route path="/treasury" element={<DashboardLayout><TreasuryPage /></DashboardLayout>} />
        <Route path="/agents" element={<DashboardLayout><AgentsPage /></DashboardLayout>} />
        <Route path="/agents/:id" element={<DashboardLayout><AgentDetailPage /></DashboardLayout>} />
        <Route path="/reports" element={<DashboardLayout><ReportsPage /></DashboardLayout>} />
        <Route path="/api-keys" element={<DashboardLayout><APIKeysPage /></DashboardLayout>} />
        <Route path="/webhooks" element={<DashboardLayout><WebhooksPage /></DashboardLayout>} />
        <Route path="/request-logs" element={<DashboardLayout><RequestLogsPage /></DashboardLayout>} />
        <Route path="/templates" element={<DashboardLayout><TemplatesPage /></DashboardLayout>} />
        <Route path="/verification-tiers" element={<DashboardLayout><VerificationTiersPage /></DashboardLayout>} />
        <Route path="/agent-verification-tiers" element={<DashboardLayout><AgentVerificationTiersPage /></DashboardLayout>} />
        <Route path="/settings" element={<DashboardLayout><SettingsPage /></DashboardLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
