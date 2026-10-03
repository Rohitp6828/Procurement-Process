import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, ArrowDownRight, ArrowUpRight, Layers, Package, Download, MapPin } from 'lucide-react';
import { db } from '../../lib/db';
import { StockLedger, Project, Site, Item } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export const StoreStockPage: React.FC = () => {
  const { selectedProjectId } = useAuth();
  const [stocks, setStocks] = useState<StockLedger[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOW_STOCK' | 'NORMAL'>('ALL');

  useEffect(() => {
    Promise.all([db.getStockLedger(), db.getProjects(), db.getSites()]).then(
      ([sList, pList, stList]) => {
        setStocks(sList);
        setProjects(pList);
        setSites(stList);
      }
    );
  }, []);

  const filtered = stocks.filter(s => {
    if (selectedProjectId !== 'ALL' && s.project_id !== selectedProjectId) return false;
    if (filterType === 'LOW_STOCK' && s.current_quantity > s.reorder_level) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.item_name.toLowerCase().includes(q) ||
        s.item_code.toLowerCase().includes(q) ||
        s.project_name?.toLowerCase().includes(q) ||
        s.site_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalInventoryValue = filtered.reduce((acc, s) => acc + s.total_valuation, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Real-Time Store Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical stock balances across site central yards, reorder threshold triggers, and inventory valuation.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500">Total Active Valuation:</span>{' '}
            <span className="font-mono font-bold text-blue-700">{formatCurrency(totalInventoryValue)}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {(['ALL', 'LOW_STOCK', 'NORMAL'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterType === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' && `All Stock Items (${stocks.length})`}
              {tab === 'LOW_STOCK' && `Low Stock Warning (${stocks.filter(s => s.current_quantity <= s.reorder_level).length})`}
              {tab === 'NORMAL' && `Adequate Stock`}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search material, code, project site..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Item Code & Description</th>
                <th className="px-4 py-3">Project & Storage Yard</th>
                <th className="px-4 py-3">UOM</th>
                <th className="px-4 py-3 text-right">In-Stock Balance</th>
                <th className="px-4 py-3 text-right">Reorder Threshold</th>
                <th className="px-4 py-3 text-right">Unit Rate</th>
                <th className="px-4 py-3 text-right">Total Valuation</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No inventory records match current criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(st => {
                  const isLow = st.current_quantity <= st.reorder_level;
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{st.item_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{st.item_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{st.project_name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{st.site_name}</div>
                        {st.storage_location && (
                          <div className="text-[10px] text-blue-600 font-mono mt-0.5 flex items-center">
                            <MapPin className="w-3 h-3 mr-1 inline shrink-0" />
                            <span>{st.storage_location}</span>
                            {st.bin_rack && <span className="text-slate-400 ml-1">({st.bin_rack})</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{st.uom}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {st.current_quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {st.reorder_level}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(st.average_rate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(st.total_valuation)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Reorder Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            Optimal Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
