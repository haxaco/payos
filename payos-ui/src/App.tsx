import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AIAssistant } from './components/layout/AIAssistant';
import { AuthProvider, ProtectedRoute } from './hooks/useAuth';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
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
import { StreamsPage } from './pages/StreamsPage';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Protected dashboard routes */}
          <Route path="/" element={<ProtectedRoute><DashboardLayout><HomePage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><DashboardLayout><AccountsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/accounts/:id" element={<ProtectedRoute><DashboardLayout><AccountDetailPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><DashboardLayout><TransactionsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/transactions/:id" element={<ProtectedRoute><DashboardLayout><TransactionDetailPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><DashboardLayout><CardsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/cards/:id" element={<ProtectedRoute><DashboardLayout><CardDetailPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/compliance" element={<ProtectedRoute><DashboardLayout><CompliancePage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/compliance/:id" element={<ProtectedRoute><DashboardLayout><ComplianceFlagDetailPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/disputes" element={<ProtectedRoute><DashboardLayout><DisputesPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/streams" element={<ProtectedRoute><DashboardLayout><StreamsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/treasury" element={<ProtectedRoute><DashboardLayout><TreasuryPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute><DashboardLayout><AgentsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/agents/:id" element={<ProtectedRoute><DashboardLayout><AgentDetailPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><DashboardLayout><ReportsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/api-keys" element={<ProtectedRoute><DashboardLayout><APIKeysPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/webhooks" element={<ProtectedRoute><DashboardLayout><WebhooksPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/request-logs" element={<ProtectedRoute><DashboardLayout><RequestLogsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><DashboardLayout><TemplatesPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/verification-tiers" element={<ProtectedRoute><DashboardLayout><VerificationTiersPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/agent-verification-tiers" element={<ProtectedRoute><DashboardLayout><AgentVerificationTiersPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </BrowserRouter>
    </QueryClientProvider>
  );
}
