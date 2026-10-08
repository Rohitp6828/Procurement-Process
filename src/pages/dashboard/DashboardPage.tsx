import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2, Users, FileText, ShoppingCart, Truck, Receipt,
  CreditCard, TrendingUp, AlertCircle, Filter, Download,
  RefreshCw, CheckCircle2, Clock, Calendar, ArrowRight,
  Package, AlertTriangle, ShieldAlert, Sparkles, Layers,
  ChevronRight, ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { db } from '../../lib/db';
import { formatCurrency, formatNumber, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomSelect } from '../../components/common/CustomSelect';
import {
  Project, Site, Vendor, PurchaseRequisition, PurchaseOrder,
  GoodsReceivedNote, PurchaseBill, StockLedger
} from '../../types';

export const DashboardPage: React.FC = () => {
  const { selectedProjectId } = useAuth();
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [stocks, setStocks] = useState<StockLedger[]>([]);

  // Filter States
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, vendList, prList, poList, grnList, billList, stockList] = await Promise.all([
        db.getProjects(),
        db.getVendors(),
        db.getPRs(),
        db.getPOs(),
        db.getGRNs(),
        db.getBills(),
        db.getStockLedger(),
      ]);
      setProjects(projList);
      setVendors(vendList);
      setPrs(prList);
      setPos(poList);
      setGrns(grnList);
      setBills(billList);
      setStocks(stockList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered dataset calculations
  const filteredData = useMemo(() => {
    let fPrs = [...prs];
    let fPos = [...pos];
    let fGrns = [...grns];
    let fBills = [...bills];

    if (selectedProjectId !== 'ALL') {
      fPrs = fPrs.filter(p => p.project_id === selectedProjectId);
      fPos = fPos.filter(p => p.project_id === selectedProjectId);
      fGrns = fGrns.filter(g => g.project_id === selectedProjectId);
      fBills = fBills.filter(b => b.project_id === selectedProjectId);
    }

    if (selectedVendorId !== 'ALL') {
      fPos = fPos.filter(p => p.vendor_id === selectedVendorId);
      fGrns = fGrns.filter(g => g.vendor_id === selectedVendorId);
      fBills = fBills.filter(b => b.vendor_id === selectedVendorId);
    }

    if (dateFrom) {
      fPos = fPos.filter(p => p.po_date >= dateFrom);
      fBills = fBills.filter(b => b.bill_date >= dateFrom);
    }
    if (dateTo) {
      fPos = fPos.filter(p => p.po_date <= dateTo);
      fBills = fBills.filter(b => b.bill_date <= dateTo);
    }

    return { fPrs, fPos, fGrns, fBills };
  }, [prs, pos, grns, bills, selectedProjectId, selectedVendorId, dateFrom, dateTo]);

  // Critical Procurement KPIs computation
  const criticalKpis = useMemo(() => {
    const pendingRequisitionsList = filteredData.fPrs.filter(p =>
      ['SUBMITTED', 'PENDING_APPROVAL', 'DRAFT'].includes(p.status)
    );
    const pendingPRCount = pendingRequisitionsList.length;
    const pendingPRValue = pendingRequisitionsList.reduce((sum, p) => {
      const est = p.estimated_total || p.subtotal || p.items?.reduce((s, it) => s + (it.estimated_amount || (it.quantity * it.estimated_rate) || 0), 0) || 0;
      return sum + est;
    }, 0);
    const urgentPRCount = pendingRequisitionsList.filter(p => p.priority === 'URGENT' || p.priority === 'HIGH').length;
    const pendingApprovalCount = pendingRequisitionsList.filter(p => p.status === 'PENDING_APPROVAL').length;

    const activePOsList = filteredData.fPos.filter(p =>
      ['APPROVED', 'PARTIALLY_RECEIVED', 'ISSUED', 'IN_DELIVERY'].includes(p.status) ||
      (p.status !== 'CANCELLED' && p.status !== 'CLOSED' && p.status !== 'DRAFT' && p.status !== 'REJECTED')
    );
    const activePOCount = activePOsList.length;
    const activePOValue = activePOsList.reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const awaitingDeliveryCount = activePOsList.filter(p => p.status === 'APPROVED' || p.status === 'PARTIALLY_RECEIVED').length;
    const partiallyDeliveredCount = activePOsList.filter(p => p.status === 'PARTIALLY_RECEIVED').length;

    const siteStocks = stocks.filter(s => {
      if (selectedProjectId !== 'ALL' && s.project_id !== selectedProjectId) return false;
      return true;
    });
    const lowStockItems = siteStocks.filter(s => (s.current_quantity ?? 0) <= (s.reorder_level ?? 0));
    const lowStockCount = lowStockItems.length;
    const outOfStockCount = lowStockItems.filter(s => (s.current_quantity ?? 0) === 0).length;

    return {
      pendingPRCount,
      pendingPRValue,
      urgentPRCount,
      pendingApprovalCount,
      activePOCount,
      activePOValue,
      awaitingDeliveryCount,
      partiallyDeliveredCount,
      lowStockCount,
      outOfStockCount,
      lowStockItems: lowStockItems.slice(0, 3),
    };
  }, [filteredData.fPrs, filteredData.fPos, stocks, selectedProjectId]);

  // Metrics computation
  const metrics = useMemo(() => {
    const { fPrs, fPos, fGrns, fBills } = filteredData;

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
    const totalVendors = vendors.length;

    const pendingPR = fPrs.filter(p => ['SUBMITTED', 'PENDING_APPROVAL'].includes(p.status)).length;
    const approvedPR = fPrs.filter(p => p.status === 'APPROVED').length;

    const pendingPO = fPos.filter(p => ['SUBMITTED', 'PENDING_APPROVAL'].includes(p.status)).length;
    const approvedPO = fPos.filter(p => ['APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].includes(p.status)).length;

    const pendingGRN = fGrns.filter(g => ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL'].includes(g.status)).length;
    const pendingBills = fBills.filter(b => ['SUBMITTED', 'PENDING_APPROVAL'].includes(b.status)).length;

    const totalPurchaseValue = fPos.reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const outstandingPayables = fBills.reduce((sum, b) => sum + (b.outstanding_amount || 0), 0);

    return {
      totalProjects,
      activeProjects,
      totalVendors,
      pendingPR,
      approvedPR,
      pendingPO,
      approvedPO,
      pendingGRN,
      pendingBills,
      totalPurchaseValue,
      outstandingPayables,
    };
  }, [filteredData, projects, vendors]);

  // Chart 1: Project-wise Purchase Value
  const projectChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.fPos.forEach(p => {
      const name = p.project_name?.split(' ')[0] || 'Unknown';
      map[name] = (map[name] || 0) + p.grand_total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData.fPos]);

  // Chart 2: Vendor-wise Purchase Value
  const vendorChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.fPos.forEach(p => {
      const name = p.vendor_name?.split(' ')[0] || 'Vendor';
      map[name] = (map[name] || 0) + p.grand_total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData.fPos]);

  // Chart 3: PO Status Breakdown
  const poStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.fPos.forEach(p => {
      map[p.status] = (map[p.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData.fPos]);

  const monthlyTrendData = [
    { month: 'May 2026', value: 850000 },
    { month: 'Jun 2026', value: 1200000 },
    { month: 'Jul 2026', value: 1650000 },
    { month: 'Aug 2026', value: 2450000 },
    { month: 'Sep 2026', value: 1981500 },
  ];

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

  // Prepare vendor options for CustomSelect
  const vendorOptions = [
    { label: `All Vendors (${vendors.length})`, value: 'ALL' },
    ...vendors.map(v => ({ label: v.vendor_name, value: v.id }))
  ];

  // Prepare workflow status options for CustomSelect
  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pending Authorizations', value: 'PENDING' },
    { label: 'Approved / In Execution', value: 'APPROVED' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Executive Procurement Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time procurement pipeline, approval bottlenecks, commit values, and payables.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-1.5 border border-slate-200 shadow-2xs text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-2.5">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Dashboard Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Filter by Vendor</label>
            <CustomSelect
              options={vendorOptions}
              value={selectedVendorId}
              onChange={setSelectedVendorId}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Workflow Status</label>
            <CustomSelect
              options={statusOptions}
              value={selectedStatus}
              onChange={setSelectedStatus}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Critical Procurement KPIs Summary Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Critical Procurement KPIs & Action Center
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Direct action shortcuts for buyer pipeline, order commitments, and site materials
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Widget 1: Pending Requisitions */}
          <div className="bg-gradient-to-b from-amber-50/70 to-white rounded-xl border border-amber-200/90 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-3 h-3 mr-1 text-amber-600" />
                  Pending Requisitions
                </span>
                {criticalKpis.urgentPRCount > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                    {criticalKpis.urgentPRCount} Urgent
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                    Needs Action
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <div className="text-3xl font-extrabold text-amber-950 tracking-tight">
                  {criticalKpis.pendingPRCount}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">PRs</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-amber-900">
                    {formatCurrency(criticalKpis.pendingPRValue)}
                  </div>
                  <div className="text-[10px] text-amber-700/80">Est. Requisition Value</div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-amber-200/70 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-amber-100/50 rounded-md p-1.5 text-amber-900">
                  <div className="font-semibold">{criticalKpis.pendingApprovalCount} PRs</div>
                  <div className="text-[10px] text-amber-700">In Approval Queue</div>
                </div>
                <div className="bg-amber-100/50 rounded-md p-1.5 text-amber-900">
                  <div className="font-semibold">{metrics.approvedPR} PRs</div>
                  <div className="text-[10px] text-amber-700">Ready for RFQ/PO</div>
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-2">
              <Link
                to="/procurement/requisitions"
                className="inline-flex items-center justify-between w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Review & Approve Requisitions</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>

          {/* Widget 2: Active POs */}
          <div className="bg-gradient-to-b from-blue-50/70 to-white rounded-xl border border-blue-200/90 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                  <ShoppingCart className="w-3 h-3 mr-1 text-blue-600" />
                  Active POs
                </span>
                <span className="text-[10px] font-medium text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                  In Execution
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <div className="text-3xl font-extrabold text-blue-950 tracking-tight">
                  {criticalKpis.activePOCount}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">POs</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-blue-900">
                    {formatCurrency(criticalKpis.activePOValue)}
                  </div>
                  <div className="text-[10px] text-blue-700/80">Active Commitment</div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-blue-200/70 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-blue-100/50 rounded-md p-1.5 text-blue-900">
                  <div className="font-semibold">{criticalKpis.awaitingDeliveryCount} Orders</div>
                  <div className="text-[10px] text-blue-700">Awaiting Site Delivery</div>
                </div>
                <div className="bg-blue-100/50 rounded-md p-1.5 text-blue-900">
                  <div className="font-semibold">{criticalKpis.partiallyDeliveredCount} Orders</div>
                  <div className="text-[10px] text-blue-700">Partial GRN Received</div>
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-2">
              <Link
                to="/procurement/purchase-orders"
                className="inline-flex items-center justify-between w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Track & Manage Active POs</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>

          {/* Widget 3: Low Stock Alerts */}
          <div className={`bg-gradient-to-b ${criticalKpis.lowStockCount > 0 ? 'from-rose-50/80 to-white border-rose-200/90' : 'from-emerald-50/70 to-white border-emerald-200/90'} rounded-xl border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow`}>
            <div className={`absolute top-0 right-0 w-24 h-24 ${criticalKpis.lowStockCount > 0 ? 'bg-rose-100/50' : 'bg-emerald-100/50'} rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none`} />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${criticalKpis.lowStockCount > 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                  {criticalKpis.lowStockCount > 0 ? (
                    <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  )}
                  Low Stock Alerts
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${criticalKpis.lowStockCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {criticalKpis.lowStockCount > 0 ? `${criticalKpis.outOfStockCount} Out of Stock` : 'Stock Nominal'}
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <div className={`text-3xl font-extrabold tracking-tight ${criticalKpis.lowStockCount > 0 ? 'text-rose-950' : 'text-emerald-950'}`}>
                  {criticalKpis.lowStockCount}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">critical items</span>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold ${criticalKpis.lowStockCount > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
                    {criticalKpis.lowStockCount > 0 ? 'Under Minimum Threshold' : 'All Stock Healthy'}
                  </div>
                  <div className="text-[10px] text-slate-500">Site Store Inventory</div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1">
                {criticalKpis.lowStockItems.length > 0 ? (
                  criticalKpis.lowStockItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-[11px] bg-rose-50/70 px-2 py-1 rounded">
                      <span className="font-medium text-slate-800 truncate max-w-[150px]">{item.item_name}</span>
                      <span className="font-mono font-semibold text-rose-700">
                        {item.current_quantity} / {item.reorder_level} {item.uom}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50/70 px-2 py-1.5 rounded flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    All material stocks are above reorder thresholds.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3.5 pt-2">
              <Link
                to="/inventory/stock"
                className={`inline-flex items-center justify-between w-full px-3 py-1.5 ${criticalKpis.lowStockCount > 0 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-lg text-xs font-semibold shadow-xs transition-colors`}
              >
                <span>{criticalKpis.lowStockCount > 0 ? 'Replenish / Open Store Stock' : 'View Store Stock Ledger'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Total Projects</span>
            <FolderGit2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{metrics.totalProjects}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">{metrics.activeProjects} Active Sites</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Total Vendors</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{metrics.totalVendors}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Empanelled Suppliers</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-800">Pending PR</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-900">{metrics.pendingPR}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Awaiting Approvals</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Approved PR</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{metrics.approvedPR}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Ready for RFQ / PO</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-blue-800">Pending PO</span>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-blue-900">{metrics.pendingPO}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">In Approval Queue</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Approved PO</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{metrics.approvedPO}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Committed Orders</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Pending GRN</span>
            <Truck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{metrics.pendingGRN}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Site Receipts</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Pending Bills</span>
            <Receipt className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{metrics.pendingBills}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">3-Way Matching Queue</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Total Purchase Value</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-blue-600">
            {formatCurrency(metrics.totalPurchaseValue)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active Commitments</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-rose-800">Outstanding Payables</span>
            <CreditCard className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-rose-700">
            {formatCurrency(metrics.outstandingPayables)}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">Net Vendor Balance</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Monthly Purchase Trend
              </h3>
              <p className="text-[11px] text-slate-400">Total committed procurement value over time</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(v: any) => [formatCurrency(v), 'Purchase Value']} />
                <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Project-Wise Purchase Value
              </h3>
              <p className="text-[11px] text-slate-400">Distribution of commitments across projects</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(v: any) => [formatCurrency(v), 'Commitment']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Vendor-Wise Spend Share
              </h3>
              <p className="text-[11px] text-slate-400">Vendor order concentration</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vendorChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {vendorChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [formatCurrency(v), 'Value']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Purchase Order Status Pipeline
              </h3>
              <p className="text-[11px] text-slate-400">Current state of active orders</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};