import React, { useState } from 'react';
import { Bell, Database, Shield, Building2, Menu } from 'lucide-react';
import { CustomDropdown } from '../common/CustomDropdown';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const [selectedProject, setSelectedProject] = useState('All Active Projects (3)');

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

        {/* Project Selector with integrated icon & single border dropdown */}
        <div className="flex items-center space-x-2.5">
          <Building2 className="h-4 w-4 text-[#af2024] shrink-0" />
          <CustomDropdown 
            options={projects}
            value={selectedProject}
            onChange={setSelectedProject}
            className="w-48 sm:w-56"
          />
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden lg:flex flex-1 max-w-xl mx-6 items-center">
        <div className="w-full flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:border-[#af2024] focus-within:ring-4 focus-within:ring-[#af2024]/10 transition-all">
          <input
            type="text"
            placeholder="Search PR, PO, Vendor, GRN, Bill, or Items..."
            className="w-full bg-transparent border-none outline-none text-xs text-slate-800 p-0 focus:ring-0 shadow-none"
          />
          <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-1 rounded-lg font-mono font-medium shrink-0 ml-3">⌘K</span>
        </div>
      </div>

      {/* Right: Badges, Notifications & User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        <div className="hidden xl:flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-2xl text-xs font-medium text-slate-600">
          <Database className="h-3.5 w-3.5 text-emerald-600" />
          <span>PostgreSQL</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 bg-red-50 border border-red-100 px-3.5 py-2 rounded-2xl text-xs font-semibold text-[#af2024]">
          <Shield className="h-3.5 w-3.5" />
          <span>SUPER ADMIN</span>
        </div>

        <button className="relative p-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-[#af2024] rounded-full animate-pulse" />
        </button>

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