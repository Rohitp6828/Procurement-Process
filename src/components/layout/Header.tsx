import React, { useState } from 'react';
import { Bell, Database, Shield, ChevronDown, Check, Building2, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const [selectedProject, setSelectedProject] = useState('All Active Projects (3)');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const projects = [
    'All Active Projects (3)',
    'Mumbai Office Setup',
    'Kolhapur HQ Warehouse'
  ];

  return (
    <header className="sticky top-0 z-30 h-20 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between select-none shadow-xs">
      {/* Left: Mobile Menu Toggle & Project Selector */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="relative">
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold text-slate-800 transition-all cursor-pointer shrink-0"
          >
            <Building2 className="h-4 w-4 text-[#af2024]" />
            <span className="truncate max-w-[120px] sm:max-w-[180px]">{selectedProject}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {projects.map((proj) => (
                <button
                  key={proj}
                  onClick={() => {
                    setSelectedProject(proj);
                    setIsProjectDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-left hover:bg-slate-50 transition-colors ${
                    selectedProject === proj ? 'text-[#af2024] font-bold bg-red-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{proj}</span>
                  {selectedProject === proj && <Check className="h-3.5 w-3.5 text-[#af2024]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Single Clean Input Search Bar */}
      <div className="hidden lg:flex flex-1 max-w-xl mx-6 relative items-center">
        <input
          type="text"
          placeholder="Search PR, PO, Vendor, GRN, Bill, or Items..."
          className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#af2024] focus:ring-4 focus:ring-[#af2024]/10 transition-all pr-12"
        />
        <span className="absolute right-3.5 text-[10px] bg-slate-200/80 text-slate-600 px-2 py-1 rounded-lg font-mono font-medium pointer-events-none">⌘K</span>
      </div>

      {/* Right: Badges, Notifications & User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Database Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-2xl text-xs font-medium text-slate-600">
          <Database className="h-3.5 w-3.5 text-emerald-600" />
          <span>PostgreSQL</span>
        </div>

        {/* Role Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-red-50 border border-red-100 px-3.5 py-2 rounded-2xl text-xs font-semibold text-[#af2024]">
          <Shield className="h-3.5 w-3.5" />
          <span>SUPER ADMIN</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-[#af2024] rounded-full animate-pulse" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-[#af2024] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-[#af2024]/30">
            RO
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-800">Rohit</div>
            <div className="text-[10px] text-slate-500 font-medium">Executive Management</div>
          </div>
        </div>
      </div>
    </header>
  );
};