import React, { useState, useEffect } from 'react';
import {
  Plus, Search, BarChart3, CheckCircle2, XCircle, Award,
  ArrowRight, ShieldCheck, FileCheck, ShoppingCart, MessageSquare
} from 'lucide-react';
import { db } from '../../lib/db';
import { QuotationComparison, RequestForQuotation, VendorQuotation, Vendor, Item, Project } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ApprovalActionModal } from '../../components/common/ApprovalActionModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const QuotationComparisonPage: React.FC = () => {
  const { user, currentRole, hasPermission } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [comparisons, setComparisons] = useState<QuotationComparison[]>([]);
  const [rfqs, setRfqs] = useState<RequestForQuotation[]>([]);
  const [quotes, setQuotes] = useState<VendorQuotation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');

  // Active view / creation
  const [activeComparison, setActiveComparison] = useState<QuotationComparison | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  const loadData = async () => {
    const [cList, rfqList, qList, vendList] = await Promise.all([
      db.getComparisons(),
      db.getRFQs(),
      db.getQuotations(),
      db.getVendors(),
    ]);
    setComparisons(cList);
    setRfqs(rfqList);
    setQuotes(qList);
    setVendors(vendList);
    if (cList.length > 0 && !activeComparison) {
      setActiveComparison(cList[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'RETURN', comments: string) => {
    if (!activeComparison) return;
    await db.processApproval(
      'COMPARISON',
      activeComparison.id,
      activeComparison.comparison_number,
      activeComparison.current_approval_level,
      action,
      comments,
      user.id,
      user.full_name,
      currentRole
    );
    setIsApprovalOpen(false);
    loadData();
  };

  const handleGeneratePo = (comp: QuotationComparison) => {
    if (comp.status !== 'APPROVED') {
      showToast('Quotation comparison must be APPROVED by authorized approver before PO generation.', 'error');
      return;
    }
    navigate(`/procurement/purchase-orders?from_comparison=${comp.id}&vendor_id=${comp.selected_vendor_id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Quotation Comparative Statement (CS)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side commercial bid evaluation with L1/L2/L3 rank detection and negotiation justification.
          </p>
        </div>
      </div>

      {/* Comparison Selector Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {comparisons.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveComparison(c)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors border ${
              activeComparison?.id === c.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="font-mono">{c.comparison_number}</div>
            <div className={`text-[10px] ${activeComparison?.id === c.id ? 'text-blue-100' : 'text-slate-400'}`}>
              {c.project_name} • {c.status}
            </div>
          </button>
        ))}
      </div>

      {activeComparison ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-6 p-6">
          {/* Header Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {activeComparison.comparison_number}
                </h3>
                <StatusBadge status={activeComparison.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Project: <span className="font-semibold text-slate-800">{activeComparison.project_name}</span> • RFQ Reference:{' '}
                <span className="font-mono font-medium text-blue-600">{activeComparison.rfq_number}</span>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {['PENDING_APPROVAL', 'SUBMITTED'].includes(activeComparison.status) && hasPermission('COMPARISON', 'APPROVE') && (
                <button
                  onClick={() => setIsApprovalOpen(true)}
                  className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Authorize Comparative Statement
                </button>
              )}

              {activeComparison.status === 'APPROVED' && (
                <button
                  onClick={() => handleGeneratePo(activeComparison)}
                  className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  Convert to Purchase Order (PO)
                </button>
              )}
            </div>
          </div>

          {/* Comparative Matrix Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Side-by-Side Commercial Proposal Matrix
              </h4>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" /> L1 Lowest Bidder
                </span>
                <span className="flex items-center text-amber-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" /> L2 Runner-up
                </span>
                <span className="flex items-center text-rose-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1" /> L3
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Evaluation Parameter</th>
                    {activeComparison.vendors?.map(v => (
                      <th
                        key={v.vendor_id}
                        className={`px-4 py-3 text-right ${
                          v.rank === 'L1' ? 'bg-emerald-50/70 border-x border-emerald-200' : ''
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs">{v.vendor_name}</div>
                        <div className="flex items-center justify-end space-x-1 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              v.rank === 'L1'
                                ? 'bg-emerald-600 text-white'
                                : v.rank === 'L2'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {v.rank}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Basic Rate (₹)</td>
                    {activeComparison.vendors?.map(v => (
                      <td key={v.vendor_id} className="px-4 py-2.5 text-right font-mono">
                        {formatCurrency(v.basic_rate)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500">Discount Applied</td>
                    {activeComparison.vendors?.map(v => (
                      <td key={v.vendor_id} className="px-4 py-2.5 text-right font-mono text-slate-600">
                        {v.discount_percent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500">Freight & Cartage</td>
                    {activeComparison.vendors?.map(v => (
                      <td key={v.vendor_id} className="px-4 py-2.5 text-right font-mono text-slate-600">
                        {formatCurrency(v.freight_amount)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500">GST Tax Rate</td>
                    {activeComparison.vendors?.map(v => (
                      <td key={v.vendor_id} className="px-4 py-2.5 text-right font-mono text-slate-600">
                        {v.gst_percent}%
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/50 font-semibold text-slate-900 border-y border-slate-200">
                    <td className="px-4 py-2.5">Effective Landed Cost / Unit</td>
                    {activeComparison.vendors?.map(v => (
                      <td
                        key={v.vendor_id}
                        className={`px-4 py-2.5 text-right font-mono text-sm ${
                          v.rank === 'L1' ? 'text-emerald-700 font-bold bg-emerald-50/80' : ''
                        }`}
                      >
                        {formatCurrency(v.landed_rate)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">Total Commercial Value</td>
                    {activeComparison.vendors?.map(v => (
                      <td
                        key={v.vendor_id}
                        className={`px-4 py-2.5 text-right font-mono font-bold text-sm ${
                          v.rank === 'L1' ? 'text-blue-700' : 'text-slate-800'
                        }`}
                      >
                        {formatCurrency(v.total_amount)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500">Commercial Payment Terms</td>
                    {activeComparison.vendors?.map(v => (
                      <td key={v.vendor_id} className="px-4 py-2.5 text-right text-xs">
                        {v.payment_terms}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500">Delivery Lead Time</td>
                    {activeComparison.vendors?.map(v => (
                      <td key={v.vendor_id} className="px-4 py-2.5 text-right text-xs">
                        {v.delivery_period_days} Days to Site
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500">Vendor Quality Rating</td>
                    {activeComparison.vendors?.map(v => (
                      <td key={v.vendor_id} className="px-4 py-2.5 text-right text-xs font-bold text-amber-600">
                        ★ {v.vendor_rating || 4.5}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">Selection Decision</td>
                    {activeComparison.vendors?.map(v => {
                      const isSelected = activeComparison.selected_vendor_id === v.vendor_id;
                      return (
                        <td key={v.vendor_id} className="px-4 py-3 text-right">
                          {isSelected ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[11px] shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Selected Vendor
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Non-selected</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Justification & Negotiation Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="font-semibold text-slate-800 block mb-1">
                Selection Justification (L1 Compliance)
              </span>
              <p className="text-slate-600 leading-relaxed">
                {activeComparison.justification ||
                  'Selected vendor offers lowest landed cost per unit conforming to project technical specifications, with favorable 30-day credit period and guaranteed site delivery schedule.'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-800 block mb-1">
                Post-Bid Negotiation Notes
              </span>
              <p className="text-slate-600 leading-relaxed">
                {activeComparison.negotiation_notes ||
                  'Negotiated additional 2% bulk prompt payment cash discount and transit insurance covered in supplier scope.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center text-slate-400 text-sm rounded-xl border border-slate-200">
          No comparative statements available.
        </div>
      )}

      {/* Approval Engine Action Modal */}
      {isApprovalOpen && activeComparison && (
        <ApprovalActionModal
          isOpen={isApprovalOpen}
          onClose={() => setIsApprovalOpen(false)}
          documentType="Comparative Statement"
          documentNumber={activeComparison.comparison_number}
          currentLevel={activeComparison.current_approval_level}
          onActionComplete={handleApprovalAction}
        />
      )}
    </div>
  );
};
