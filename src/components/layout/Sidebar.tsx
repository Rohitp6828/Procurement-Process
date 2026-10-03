import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FolderGit2, MapPin, Users, FileSpreadsheet, Package,
  FileText, Send, MessageSquare, BarChart3, CheckCircle, ShoppingCart,
  Truck, AlertOctagon, CreditCard, Receipt, BookOpen, FileCheck,
  ChevronDown, ChevronRight, Settings, ShieldAlert, Layers, Percent, Scale,
  Archive, ArrowLeftRight, HardHat
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { hasPermission } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    master: true,
    purchase: true,
    inventory: true,
    accounts: true,
    reports: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
      isActive
        ? 'bg-blue-600 text-white font-semibold shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  const iconClass = (isActive: boolean) =>
    `h-4 w-4 mr-2.5 shrink-0 transition-colors ${
      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
    }`;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none shrink-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {/* Main Dashboard */}
        <div>
          <NavLink to="/" className={linkClass}>
            {({ isActive }) => (
              <>
                <LayoutDashboard className={iconClass(isActive)} />
                <span>Executive Dashboard</span>
              </>
            )}
          </NavLink>
        </div>

          {/* 1. MASTER MODULES (Only Item Master and Specifications) */}
          <div>
            <button
              onClick={() => toggleSection('master')}
              className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
            >
              <span>Master Data</span>
              {openSections.master ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {openSections.master && (
              <div className="mt-1 space-y-0.5">
                <NavLink to="/masters/items" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <Package className={iconClass(isActive)} />
                      <span>Item / Material Master</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/masters/specifications" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <FileCheck className={iconClass(isActive)} />
                      <span>Specifications Master</span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </div>

          {/* 2. PURCHASE PROCESS & PROCUREMENT ENTITIES */}
          <div>
            <button
              onClick={() => toggleSection('purchase')}
              className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
            >
              <span>Purchase Process</span>
              {openSections.purchase ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {openSections.purchase && (
              <div className="mt-1 space-y-0.5">
                <NavLink to="/procurement/requisitions" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <FileText className={iconClass(isActive)} />
                      <span>Purchase Requisitions</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/procurement/rfq" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <Send className={iconClass(isActive)} />
                      <span>Request for Quotation</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/procurement/quotations" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <MessageSquare className={iconClass(isActive)} />
                      <span>Vendor Quotations</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/procurement/quotation-comparison" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <BarChart3 className={iconClass(isActive)} />
                      <span>Quotation Comparison</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/procurement/supplier-shortlist" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <CheckCircle className={iconClass(isActive)} />
                      <span>Shortlisted Suppliers</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/procurement/purchase-orders" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <ShoppingCart className={iconClass(isActive)} />
                      <span>Purchase Orders (PO)</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/procurement/vendor-evaluation" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <Percent className={iconClass(isActive)} />
                      <span>Vendor Evaluation</span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </div>

        {/* 3. INVENTORY / STORES */}
        <div>
          <button
            onClick={() => toggleSection('inventory')}
            className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
          >
            <span>Inventory & Yard</span>
            {openSections.inventory ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {openSections.inventory && (
            <div className="mt-1 space-y-0.5">
              <NavLink to="/inventory/grn" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <Truck className={iconClass(isActive)} />
                    <span>Goods Received Notes</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/inventory/stock" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <Archive className={iconClass(isActive)} />
                    <span>Store Stock Ledger</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/inventory/issues" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <HardHat className={iconClass(isActive)} />
                    <span>Material Issue Notes</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/inventory/transfers" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <ArrowLeftRight className={iconClass(isActive)} />
                    <span>Inter-Site Transfers</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/inventory/debit-notes" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <AlertOctagon className={iconClass(isActive)} />
                    <span>Supplier Debit Notes</span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* 4. BILLING & PAYMENTS */}
        <div>
          <button
            onClick={() => toggleSection('accounts')}
            className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
          >
            <span>Billing & Treasury</span>
            {openSections.accounts ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {openSections.accounts && (
            <div className="mt-1 space-y-0.5">
              <NavLink to="/accounts/bills" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <Receipt className={iconClass(isActive)} />
                    <span>Purchase Bills (3-Way)</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/accounts/payments" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <CreditCard className={iconClass(isActive)} />
                    <span>Payment Vouchers</span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* 5. REPORTS */}
        <div>
          <button
            onClick={() => toggleSection('reports')}
            className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
          >
            <span>Reports & Analytics</span>
            {openSections.reports ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {openSections.reports && (
            <div className="mt-1 space-y-0.5">
              <NavLink to="/reports" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <BarChart3 className={iconClass(isActive)} />
                    <span>Procurement Analytics</span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </div>

        {/* 6. AUDIT */}
        <div className="pt-2 border-t border-slate-100">
          <NavLink to="/admin/audit-logs" className={linkClass}>
            {({ isActive }) => (
              <>
                <ShieldAlert className={iconClass(isActive)} />
                <span>Enterprise Audit Logs</span>
              </>
            )}
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
