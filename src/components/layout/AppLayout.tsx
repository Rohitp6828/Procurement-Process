import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useNotifications } from '../../contexts/NotificationContext';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { toast } = useNotifications();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 antialiased overflow-x-hidden">
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar with mobile toggle state */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        onCloseMobile={() => setIsMobileSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Container shifts dynamically based on sidebar state */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0`}>
        <Header onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-5rem)]">
          <Outlet />
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border bg-white border-slate-200 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600 shrink-0" />}
          <div className="text-xs font-medium text-slate-800 leading-snug">{toast.message}</div>
        </div>
      )}
    </div>
  );
};