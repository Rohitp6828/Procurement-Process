import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useNotifications } from '../../contexts/NotificationContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { toast } = useNotifications();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-xl border bg-white border-slate-200 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600 shrink-0" />}
          <div className="text-xs font-medium text-slate-800 leading-snug">{toast.message}</div>
        </div>
      )}
    </div>
  );
};
