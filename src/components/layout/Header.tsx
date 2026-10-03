import React, { useState, useEffect } from 'react';
import {
  Building2, Search, Bell, User, LogOut, ChevronDown,
  Database, Shield, Layers, Check, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { db } from '../../lib/db';
import { Project, UserRole } from '../../types';
import { SupabaseConfigModal } from '../common/SupabaseConfigModal';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const { user, currentRole, setCurrentRole, roles, selectedProjectId, setSelectedProjectId, logout, isSupabaseLive } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    db.getProjects().then(setProjects);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (onSearch) onSearch(q);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-2xs">
        {/* Left: Brand Identity & Active Project */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-tight text-slate-900 text-base">CivProcure</span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">ERP</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none">Civil Construction Procurement</p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Project Switcher */}
          <div className="hidden lg:flex items-center space-x-2">
            <Layers className="h-4 w-4 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Active Projects ({projects.length})</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.project_code} – {p.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search PR, PO, Vendor, GRN, Bill, or Items..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Right: DB Status, Notifications, RBAC Switcher, Profile */}
        <div className="flex items-center space-x-3">
          {/* Supabase Status Pill */}
          <button
            onClick={() => setShowDbModal(true)}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
            title="Inspect Supabase PostgreSQL Database & Migrations"
          >
            <Database className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[11px]">Database: PostgreSQL</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          </button>

          {/* RBAC Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100/70 text-blue-700 text-xs font-medium transition-colors"
            >
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-semibold">{currentRole.replace(/_/g, ' ')}</span>
              <ChevronDown className="h-3 w-3 text-blue-500" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in-50">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Active RBAC Role
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {roles.map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        setCurrentRole(r);
                        setShowRoleMenu(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs rounded-md transition-colors ${
                        currentRole === r
                          ? 'bg-blue-50 font-semibold text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{r.replace(/_/g, ' ')}</span>
                      {currentRole === r && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in-50">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-800">Workflow Notifications</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} Unread
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                          !n.is_read ? 'bg-blue-50/40 font-medium' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
              AS
            </div>
            <div className="hidden xl:block text-left text-xs">
              <div className="font-semibold text-slate-800">{user.full_name.split(' ')[0]}</div>
              <div className="text-[10px] text-slate-400 leading-none">{user.department || 'Procurement'}</div>
            </div>
          </div>
        </div>
      </header>

      <SupabaseConfigModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </>
  );
};
