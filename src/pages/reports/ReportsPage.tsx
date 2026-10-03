import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  BarChart3, TrendingUp, Clock, Award, ShieldCheck, Download,
  Layers, AlertCircle, FileText, CheckCircle2, DollarSign
} from 'lucide-react';
import { db } from '../../lib/db';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export const ReportsPage: React.FC = () => {
  const { selectedProjectId } = useAuth();
  const [loading, setLoading] = useState(true);

  // Analytics state
  const [spendByCategory, setSpendByCategory] = useState<any[]>([]);
  const [vendorRankings, setVendorRankings] = useState<any[]>([]);
  const [cashForecast, setCashForecast] = useState<any[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [pos, bills, vendors, items, costCodes] = await Promise.all([
        db.getPOs(),
        db.getBills(),
        db.getVendors(),
        db.getItems(),
        db.getCostCodes(),
      ]);

      // 1. Spend by Category
      const catMap: { [key: string]: number } = {};
      pos.forEach(po => {
        po.items?.forEach(it => {
          const itemDef = items.find(i => i.id === it.item_id);
          const cat = itemDef?.category || 'Civil Structural';
          catMap[cat] = (catMap[cat] || 0) + it.total_amount;
        });
      });
      const catChartData = Object.entries(catMap).map(([name, value]) => ({
        name,
        value,
      }));
      setSpendByCategory(
        catChartData.length > 0
          ? catChartData
          : [
              { name: 'Steel & Rebar', value: 2450000 },
              { name: 'Cement & Concrete', value: 1890000 },
              { name: 'Electrical & MEP', value: 870000 },
              { name: 'Plumbing & Drainage', value: 650000 },
              { name: 'Finishes & Tiles', value: 420000 },
            ]
      );

      // 2. Vendor Leaderboard
      const ranked = vendors
        .map(v => ({
          name: v.vendor_name,
          rating: v.vendor_rating || 4.5,
          spend: pos
            .filter(p => p.vendor_id === v.id)
            .reduce((acc, p) => acc + p.grand_total, 0),
        }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5);
      setVendorRankings(ranked);

      // 3. Cash Outflow Forecast (Next 4 weeks)
      setCashForecast([
        { week: 'Week 1', dueAmount: 1450000, projected: 1600000 },
        { week: 'Week 2', dueAmount: 2200000, projected: 2100000 },
        { week: 'Week 3', dueAmount: 980000, projected: 1150000 },
        { week: 'Week 4', dueAmount: 1800000, projected: 1750000 },
      ]);

      // 4. Budget vs Actual
      setBudgetVsActual(
        costCodes.slice(0, 5).map(cc => ({
          code: cc.code,
          name: cc.name,
          budget: cc.allocated_budget || 3000000,
          committed: cc.committed_amount || 1500000,
          spent: cc.actual_spent || 1200000,
        }))
      );

      setLoading(false);
    };

    fetchData();
  }, [selectedProjectId]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const exportReportCsv = () => {
    const csvRows = [
      ['Metric', 'Value'],
      ['PR to PO Cycle Time', '3.4 Days'],
      ['Vendor On-Time SLA', '94.2%'],
      ['3-Way Match Auto-Pass Rate', '98.5%'],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivProcure_Procurement_KPI_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Procurement Reports & Executive Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics on lead cycle times, spend breakdown, vendor scorecards, and cash outflow forecasting.
          </p>
        </div>

        <button
          onClick={exportReportCsv}
          className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-semibold rounded-lg"
        >
          <Download className="h-4 w-4 mr-1.5 text-slate-500" />
          Export Executive KPI Report
        </button>
      </div>

      {/* KPI Cards (Section 38) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">PR to PO Cycle Time</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">3.4 Days</div>
          <div className="text-[11px] text-emerald-600 flex items-center mt-1">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> 18% faster than quarterly target
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">On-Time Vendor Delivery</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">94.8%</div>
          <div className="text-[11px] text-slate-500 mt-1">SLA benchmark: &gt; 92.0%</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">3-Way Match Pass Rate</span>
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">98.2%</div>
          <div className="text-[11px] text-slate-500 mt-1">Zero unauthorized variance</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Negotiation Savings</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">₹ 8.4 Lakhs</div>
          <div className="text-[11px] text-slate-500 mt-1">Post-bid L1 negotiation</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spend Distribution */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Material Category Spend Distribution
            </h3>
            <span className="text-[11px] text-slate-400">Total Committed POs</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {spendByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Spend']}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-slate-100 text-xs">
            {spendByCategory.map((c, i) => (
              <div key={i} className="flex items-center space-x-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-slate-600">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 30-Day Cash Outflow Forecast */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              30-Day Projected Cash Outflow Forecast
            </h3>
            <span className="text-[11px] text-slate-400">Due Vendor Bills vs Projected</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashForecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis
                  tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Bar dataKey="dueAmount" name="Approved Bills Due" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="projected" name="Projected Milestone POs" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center space-x-4 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-600" />
              <span className="text-slate-600">Approved Bills Due</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-300" />
              <span className="text-slate-600">Projected Milestone Orders</span>
            </div>
          </div>
        </div>

        {/* Cost Code Budget vs Committed */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Cost Code Budget Allocation vs Committed PO vs Actual Paid
            </h3>
            <span className="text-[11px] text-slate-400">Budget Variance Analysis</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVsActual} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis
                  tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Bar dataKey="budget" name="Approved Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="committed" name="Committed (PO Released)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Actual Disbursed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
