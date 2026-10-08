import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, FileText, Send, MessageSquare, BarChart3,
  CheckCircle, ShoppingCart, Truck, AlertOctagon, CreditCard, Receipt,
  FileCheck, ChevronDown, ChevronRight, ShieldAlert, Archive, ArrowLeftRight,
  HardHat, Percent, PanelLeftClose, PanelLeftOpen, X
} from 'lucide-react';
import logoImage from '../../assets/logo.png';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile, isCollapsed, setIsCollapsed }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    master: true,
    purchase: true,
    inventory: true,
    accounts: true,
    reports: true,
  });

  const toggleSection = (section: string) => {
    if (isCollapsed) return;
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 ease-in-out group ${
      isActive
        ? 'bg-[#af2024] text-white font-bold shadow-md shadow-[#af2024]/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
    }`;

  const iconClass = (isActive: boolean) =>
    `h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
    }`;

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-[#0f172a] border-r border-slate-800 flex flex-col select-none z-40 transition-all duration-300 ${
      isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
    } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}>
      
      {/* Sidebar Header: h-20 with perfectly aligned layout for expanded & collapsed states */}
      <div className={`h-20 border-b border-slate-800/80 flex items-center shrink-0 bg-[#0b1120] ${isCollapsed ? 'px-2 justify-center flex-col py-2' : 'px-4 justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center h-full py-2.5 overflow-hidden pr-2">
            <img src={logoImage} alt="MD INFRA" className="h-full w-auto object-contain" />
          </div>
        )}

        {isCollapsed && (
          <div className="hidden md:flex items-center justify-center h-8 w-8 rounded-full bg-[#af2024] text-white font-black text-[10px] shadow-sm tracking-wider">
            MD
          </div>
        )}
        
        {/* Desktop Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ${
            isCollapsed ? 'mt-1' : ''
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-6 custom-scrollbar-dark">
        {/* Main Dashboard */}
        <div>
          <NavLink to="/" onClick={onCloseMobile} className={linkClass} title="Executive Dashboard">
            {({ isActive }) => (
              <div className="flex items-center w-full">
                <LayoutDashboard className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Executive Dashboard</span>
              </div>
            )}
          </NavLink>
        </div>

        {/* 1. MASTER MODULES */}
        <div>
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('master')}
              className="flex w-full items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Master Data</span>
              {openSections.master ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}

          {(openSections.master || isCollapsed) && (
            <div className="mt-1.5 space-y-1">
              <NavLink to="/masters/items" onClick={onCloseMobile} className={linkClass} title="Item / Material Master">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <Package className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Item / Material Master</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/masters/specifications" onClick={onCloseMobile} className={linkClass} title="Specifications Master">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <FileCheck className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Specifications Master</span>
                  </div>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* 2. PURCHASE PROCESS */}
        <div>
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('purchase')}
              className="flex w-full items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Purchase Process</span>
              {openSections.purchase ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}

          {(openSections.purchase || isCollapsed) && (
            <div className="mt-1.5 space-y-1">
              <NavLink to="/procurement/requisitions" onClick={onCloseMobile} className={linkClass} title="Purchase Requisitions">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <FileText className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Purchase Requisitions</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/procurement/rfq" onClick={onCloseMobile} className={linkClass} title="Request for Quotation">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <Send className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Request for Quotation</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/procurement/quotations" onClick={onCloseMobile} className={linkClass} title="Vendor Quotations">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <MessageSquare className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Vendor Quotations</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/procurement/quotation-comparison" onClick={onCloseMobile} className={linkClass} title="Quotation Comparison">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <BarChart3 className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Quotation Comparison</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/procurement/supplier-shortlist" onClick={onCloseMobile} className={linkClass} title="Shortlisted Suppliers">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <CheckCircle className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Shortlisted Suppliers</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/procurement/purchase-orders" onClick={onCloseMobile} className={linkClass} title="Purchase Orders (PO)">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <ShoppingCart className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Purchase Orders (PO)</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/procurement/vendor-evaluation" onClick={onCloseMobile} className={linkClass} title="Vendor Evaluation">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <Percent className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Vendor Evaluation</span>
                  </div>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* 3. INVENTORY & YARD */}
        <div>
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('inventory')}
              className="flex w-full items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Inventory & Yard</span>
              {openSections.inventory ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}

          {(openSections.inventory || isCollapsed) && (
            <div className="mt-1.5 space-y-1">
              <NavLink to="/inventory/grn" onClick={onCloseMobile} className={linkClass} title="Goods Received Notes">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <Truck className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Goods Received Notes</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/inventory/stock" onClick={onCloseMobile} className={linkClass} title="Store Stock Ledger">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <Archive className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Store Stock Ledger</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/inventory/issues" onClick={onCloseMobile} className={linkClass} title="Material Issue Notes">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <HardHat className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Material Issue Notes</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/inventory/transfers" onClick={onCloseMobile} className={linkClass} title="Inter-Site Transfers">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <ArrowLeftRight className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Inter-Site Transfers</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/inventory/debit-notes" onClick={onCloseMobile} className={linkClass} title="Supplier Debit Notes">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <AlertOctagon className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Supplier Debit Notes</span>
                  </div>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* 4. BILLING & TREASURY */}
        <div>
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('accounts')}
              className="flex w-full items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Billing & Treasury</span>
              {openSections.accounts ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}

          {(openSections.accounts || isCollapsed) && (
            <div className="mt-1.5 space-y-1">
              <NavLink to="/accounts/bills" onClick={onCloseMobile} className={linkClass} title="Purchase Bills (3-Way)">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <Receipt className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Purchase Bills (3-Way)</span>
                  </div>
                )}
              </NavLink>

              <NavLink to="/accounts/payments" onClick={onCloseMobile} className={linkClass} title="Payment Vouchers">
                {({ isActive }) => (
                  <div className="flex items-center w-full">
                    <CreditCard className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Payment Vouchers</span>
                  </div>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* 5. AUDIT */}
        <div className="pt-3 border-t border-slate-800">
          <NavLink to="/admin/audit-logs" onClick={onCloseMobile} className={linkClass} title="Enterprise Audit Logs">
            {({ isActive }) => (
              <div className="flex items-center w-full">
                <ShieldAlert className={`${iconClass(isActive)} ${!isCollapsed ? 'mr-3' : 'mx-auto md:mx-auto'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`${isCollapsed ? 'md:hidden' : ''} truncate`}>Enterprise Audit Logs</span>
              </div>
            )}
          </NavLink>
        </div>
      </div>
    </aside>
  );
};