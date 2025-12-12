'use client';

import { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopBar } from '../../components/layout/TopBar';
import { AIAssistant } from '../../components/layout/AIAssistant';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
