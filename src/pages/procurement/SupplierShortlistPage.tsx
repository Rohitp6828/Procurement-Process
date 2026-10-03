import React, { useState, useEffect } from 'react';
import { Award, ShoppingCart, CheckCircle2, ArrowRight, Building, Search } from 'lucide-react';
import { db } from '../../lib/db';
import { QuotationComparison } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';

export const SupplierShortlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [comparisons, setComparisons] = useState<QuotationComparison[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    db.getComparisons().then(list => {
      setComparisons(list.filter(c => c.status === 'APPROVED'));
    });
  }, []);

  const filtered = comparisons.filter(
    c =>
      c.selected_vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.comparison_number.toLowerCase().includes(search.toLowerCase()) ||
      c.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Approved Shortlisted Suppliers (Ready for PO)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Suppliers selected through comparative evaluation and approved by authorized signatories.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shortlisted vendor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Approved Bids: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Comparative Statement</th>
                <th className="px-4 py-3">Approved Supplier</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">RFQ Link</th>
                <th className="px-4 py-3">Selection Justification</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No approved shortlisted suppliers at this moment.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">{c.comparison_number}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{c.selected_vendor_name}</td>
                    <td className="px-4 py-3">{c.project_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{c.rfq_number}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{c.justification}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          navigate(
                            `/procurement/purchase-orders?from_comparison=${c.id}&vendor_id=${c.selected_vendor_id}`
                          )
                        }
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                        Issue PO
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
