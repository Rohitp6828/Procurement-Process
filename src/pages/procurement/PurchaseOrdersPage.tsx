import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, Search, ShoppingCart, CheckCircle2, XCircle, Eye, Printer,
  History, Clock, FileText, AlertTriangle, Layers, Edit3, ArrowRight, Truck, Building
} from 'lucide-react';
import { db } from '../../lib/db';
import { PurchaseOrder, POItem, Project, Site, Vendor, Item, PurchaseRequisition, TermItem } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DocumentTimeline } from '../../components/common/DocumentTimeline';
import { ApprovalActionModal } from '../../components/common/ApprovalActionModal';
import { AuditHistoryModal } from '../../components/common/AuditHistoryModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentRole, hasPermission, selectedProjectId } = useAuth();
  const { showToast } = useNotifications();
  const [searchParams] = useSearchParams();

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);

  // Modals for inline procurement connectivity
  const [isQuickVendorOpen, setIsQuickVendorOpen] = useState(false);
  const [isQuickProjectOpen, setIsQuickProjectOpen] = useState(false);
  const [isQuickSiteOpen, setIsQuickSiteOpen] = useState(false);

  // Quick form states
  const [quickVendor, setQuickVendor] = useState({ vendor_name: '', gst_number: '', mobile: '', city: 'Pune' });
  const [quickProject, setQuickProject] = useState({ project_name: '', client_name: '', location: 'Mumbai' });
  const [quickSite, setQuickSite] = useState({ site_name: '', site_address: '', site_manager: 'Site Store Incharge' });

  // Filter & Search
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isAmendOpen, setIsAmendOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    po_number: '',
    po_date: new Date().toISOString().split('T')[0],
    po_type: 'STANDARD' as PurchaseOrder['po_type'],
    pr_id: '',
    vendor_id: '',
    project_id: '',
    site_id: '',
    billing_address: 'Godrej Properties Ltd, Corporate Tower B, BKC, Mumbai - 400051 (GSTIN: 27AABCG1234F1Z1)',
    delivery_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    payment_terms: '30 Days Net from GRN Approval',
    freight_terms: 'Included in unit rate (FOR Destination)',
    advance_percentage: 0,
    terms_and_conditions: '1. Material must conform strictly to IS:1786 standards.\n2. Manufacturer test certificate must accompany every dispatch batch.\n3. Rejected materials must be lifted from site within 7 days at vendor risk.',
  });

  const [poLineItems, setPoLineItems] = useState<Array<{
    item_id: string;
    item_name: string;
    uom: string;
    quantity: number;
    rate: number;
    discount_percent: number;
    gst_percent: number;
  }>>([]);

  const [amendReason, setAmendReason] = useState('');

  const loadData = async () => {
    const [poList, projList, siteList, vendList, itmList, prList] = await Promise.all([
      db.getPOs(),
      db.getProjects(),
      db.getSites(),
      db.getVendors(),
      db.getItems(),
      db.getPRs(),
    ]);
    setPos(poList);
    setProjects(projList);
    setSites(siteList);
    setVendors(vendList);
    setItems(itmList);
    setPrs(prList.filter(p => ['APPROVED', 'PARTIALLY_ORDERED'].includes(p.status)));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL query parameters if coming from comparison shortlist
  useEffect(() => {
    const vendorParam = searchParams.get('vendor_id');
    if (vendorParam && vendors.length > 0) {
      handleOpenCreate(vendorParam);
    }
  }, [searchParams, vendors]);

  const handleOpenCreate = (prefillVendorId?: string) => {
    const nextNumber = `PO-2026-${(pos.length + 1).toString().padStart(4, '0')}`;
    const defaultProj = projects[0];
    const defaultSite = sites[0];
    const targetVendor = vendors.find(v => v.id === prefillVendorId) || vendors[0];

    setFormData({
      po_number: nextNumber,
      po_date: new Date().toISOString().split('T')[0],
      po_type: 'STANDARD',
      pr_id: prs[0]?.id || '',
      vendor_id: targetVendor?.id || '',
      project_id: defaultProj?.id || '',
      site_id: defaultSite?.id || '',
      billing_address: 'CivProcure Infrastructure Ltd, 12th Floor World Trade Centre, Pune - 411014 (GSTIN: 27AABCC9876K1Z9)',
      delivery_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      payment_terms: targetVendor?.payment_terms || '30 Days Net from GRN',
      freight_terms: 'FOR Site Delivery (Freight Paid by Supplier)',
      advance_percentage: 10,
      terms_and_conditions: '1. Materials must strictly conform to IS standards.\n2. Original GST e-way bill & test certificates must accompany delivery vehicle.\n3. Payment strictly subject to 3-way matching of PO, GRN & Verified Tax Invoice.',
    });

    if (items.length > 0) {
      setPoLineItems([
        {
          item_id: items[0].id,
          item_name: items[0].item_name,
          uom: items[0].uom,
          quantity: 200,
          rate: items[0].standard_rate,
          discount_percent: 2,
          gst_percent: items[0].gst_rate,
        },
      ]);
    }
    setIsCreateOpen(true);
  };

  const handleAddItemRow = () => {
    const it = items[0];
    setPoLineItems([
      ...poLineItems,
      {
        item_id: it?.id || '',
        item_name: it?.item_name || '',
        uom: it?.uom || 'Nos',
        quantity: 100,
        rate: it?.standard_rate || 500,
        discount_percent: 0,
        gst_percent: it?.gst_rate || 18,
      },
    ]);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = items.find(i => i.id === itemId);
    if (!selected) return;

    const copy = [...poLineItems];
    copy[index] = {
      ...copy[index],
      item_id: selected.id,
      item_name: selected.item_name,
      uom: selected.uom,
      rate: selected.standard_rate,
      gst_percent: selected.gst_rate,
    };
    setPoLineItems(copy);
  };

  const handleRemoveItemRow = (index: number) => {
    if (poLineItems.length === 1) {
      showToast('PO must have at least one line item', 'error');
      return;
    }
    setPoLineItems(poLineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    poLineItems.forEach(item => {
      const discountedRate = item.rate * (1 - item.discount_percent / 100);
      const taxable = item.quantity * discountedRate;
      const tax = taxable * (item.gst_percent / 100);
      subtotal += taxable;
      totalTax += tax;
    });

    const grandTotal = subtotal + totalTax;
    return { subtotal, totalTax, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poLineItems.length === 0) {
      showToast('Add at least one line item', 'error');
      return;
    }

    const proj = projects.find(p => p.id === formData.project_id);
    const site = sites.find(s => s.id === formData.site_id);
    const vend = vendors.find(v => v.id === formData.vendor_id);
    const linkedPr = prs.find(p => p.id === formData.pr_id);

    const { subtotal, totalTax, grandTotal } = calculateTotals();
    const poId = `po-${Date.now()}`;

    const formattedItems: POItem[] = poLineItems.map((li, idx) => {
      const discountedRate = li.rate * (1 - li.discount_percent / 100);
      const taxable = li.quantity * discountedRate;
      const taxAmt = taxable * (li.gst_percent / 100);
      const total = taxable + taxAmt;

      return {
        id: `poi-${Date.now()}-${idx}`,
        po_id: poId,
        item_id: li.item_id,
        item_name: li.item_name,
        uom: li.uom,
        quantity: Number(li.quantity),
        rate: Number(li.rate),
        discount_percent: Number(li.discount_percent),
        taxable_value: Number(taxable.toFixed(2)),
        gst_percent: Number(li.gst_percent),
        gst_amount: Number(taxAmt.toFixed(2)),
        total_amount: Number(total.toFixed(2)),
        received_quantity: 0,
        balance_quantity: Number(li.quantity),
      };
    });

    const newPo: PurchaseOrder = {
      id: poId,
      po_number: formData.po_number,
      po_version: 1,
      po_date: formData.po_date,
      po_type: formData.po_type,
      pr_id: formData.pr_id || undefined,
      pr_number: linkedPr?.pr_number,
      vendor_id: formData.vendor_id,
      vendor_name: vend?.vendor_name,
      project_id: formData.project_id,
      project_name: proj?.project_name,
      site_id: formData.site_id,
      site_name: site?.site_name,
      billing_address: formData.billing_address,
      delivery_address: site?.site_address || 'Project Delivery Site',
      delivery_date: formData.delivery_date,
      payment_terms: formData.payment_terms,
      freight_terms: formData.freight_terms,
      advance_percentage: formData.advance_percentage,
      advance_amount: Number((grandTotal * (formData.advance_percentage / 100)).toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount: Number(totalTax.toFixed(2)),
      grand_total: Number(grandTotal.toFixed(2)),
      status: 'PENDING_APPROVAL',
      current_approval_level: 1,
      terms_and_conditions: formData.terms_and_conditions,
      created_by_id: user.id,
      created_by_name: user.full_name,
      items: formattedItems,
      created_at: new Date().toISOString(),
    };

    await db.savePO(newPo);
    showToast(`Purchase Order ${newPo.po_number} created and submitted for multi-tier approval!`, 'success');
    setIsCreateOpen(false);
    loadData();
  };

  const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'RETURN', comments: string) => {
    if (!selectedPo) return;
    await db.processApproval(
      'PO',
      selectedPo.id,
      selectedPo.po_number,
      selectedPo.current_approval_level,
      action,
      comments,
      user.id,
      user.full_name,
      currentRole
    );
    setIsApprovalOpen(false);
    loadData();
  };

  const handleAmendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo || !amendReason.trim()) {
      showToast('Specify a valid amendment justification', 'error');
      return;
    }

    const updatedPo: PurchaseOrder = {
      ...selectedPo,
      po_version: selectedPo.po_version + 1,
      status: 'PENDING_APPROVAL',
      current_approval_level: 1,
      terms_and_conditions: `${selectedPo.terms_and_conditions}\n[Amendment V${selectedPo.po_version + 1}]: ${amendReason}`,
    };

    await db.savePO(updatedPo);
    showToast(`Purchase Order amended to Revision V${updatedPo.po_version}! Submitted for re-approval.`, 'success');
    setIsAmendOpen(false);
    setAmendReason('');
    loadData();
  };

  const handleViewAudit = async (po: PurchaseOrder) => {
    const logs = await db.getAuditLogs('PO', po.id);
    setAuditLogs(logs);
    setSelectedPo(po);
    setIsAuditOpen(true);
  };

  const filteredPos = pos.filter(po => {
    if (selectedProjectId !== 'ALL' && po.project_id !== selectedProjectId) return false;
    if (activeTab === 'PENDING' && !['PENDING_APPROVAL', 'SUBMITTED'].includes(po.status)) return false;
    if (activeTab === 'APPROVED' && !['APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].includes(po.status)) return false;
    if (activeTab === 'CANCELLED' && !['CANCELLED', 'REJECTED'].includes(po.status)) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        po.po_number.toLowerCase().includes(q) ||
        po.vendor_name?.toLowerCase().includes(q) ||
        po.project_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Purchase Orders (PO)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue binding purchase contracts, configure advance terms, process multi-level approvals, and manage amendments.
          </p>
        </div>

        {hasPermission('PO', 'CREATE') && (
          <button
            onClick={() => handleOpenCreate()}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Issue Purchase Order
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {(['ALL', 'PENDING', 'APPROVED', 'CANCELLED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' && `All Orders (${pos.length})`}
              {tab === 'PENDING' && `Pending Authorization (${pos.filter(p => ['PENDING_APPROVAL', 'SUBMITTED'].includes(p.status)).length})`}
              {tab === 'APPROVED' && `Approved Orders (${pos.filter(p => ['APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].includes(p.status)).length})`}
              {tab === 'CANCELLED' && `Cancelled / Rejected`}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PO number, vendor, project..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">PO Number & Rev</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor / Supplier</th>
                <th className="px-4 py-3">Project & Site</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Commitment Value</th>
                <th className="px-4 py-3 text-right">Advance %</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No purchase orders found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredPos.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-blue-600">{po.po_number}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Rev: V{po.po_version}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(po.po_date)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{po.vendor_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{po.project_name}</div>
                      <div className="text-[11px] text-slate-400">{po.site_name}</div>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600">{po.po_type}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 font-mono">
                      {formatCurrency(po.grand_total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {po.advance_percentage}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedPo(po);
                          setIsDetailOpen(true);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        title="View PO & Print Sheet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {['PENDING_APPROVAL', 'SUBMITTED'].includes(po.status) && hasPermission('PO', 'APPROVE') && (
                        <button
                          onClick={() => {
                            setSelectedPo(po);
                            setIsApprovalOpen(true);
                          }}
                          className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Authorize Purchase Order"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}

                      {['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status) && hasPermission('PO', 'EDIT') && (
                        <button
                          onClick={() => {
                            setSelectedPo(po);
                            setIsAmendOpen(true);
                          }}
                          className="p-1 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Amend Purchase Order"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleViewAudit(po)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="Audit Logs"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Detail & Print View Modal (Section 22) */}
      {isDetailOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10 print:hidden">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Purchase Order: {selectedPo.po_number} (Rev V{selectedPo.po_version})
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedPo.project_name} • Supplier: {selectedPo.vendor_name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Official PO
                </button>
                <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Document Lifecycle Flow */}
              <div className="print:hidden">
                <DocumentTimeline
                  steps={[
                    { key: 'PR', label: 'PR Indent', docNumber: selectedPo.pr_number || 'PR-2026-0001', isComplete: true },
                    { key: 'COMPARISON', label: 'Comparison', docNumber: 'CS-2026-0012', isComplete: true },
                    { key: 'PO', label: 'PO Released', docNumber: selectedPo.po_number, date: selectedPo.po_date, isComplete: true },
                    { key: 'ADVANCE', label: 'Advance Payment', docNumber: selectedPo.advance_percentage > 0 ? 'ADV-2026-0004' : undefined, isComplete: selectedPo.advance_percentage > 0 },
                    { key: 'GRN', label: 'GRN Receipt', docNumber: 'Pending', isComplete: false },
                    { key: 'BILL', label: 'Purchase Bill', isComplete: false },
                    { key: 'PAYMENT', label: 'Payment Done', isComplete: false },
                  ]}
                />
              </div>

              {/* Printable PO Sheet Layout (Section 22 Formatted Purchase Order) */}
              <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-2xs space-y-6">
                {/* Header with Company Logo & PO Banner */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      CivProcure Infrastructure Pvt. Ltd.
                    </h2>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Corporate Office: World Trade Centre, 12th Floor, Tower B, Pune - 411014
                      <br />
                      GSTIN: 27AABCC9876K1Z9 | PAN: AABCC9876K
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold uppercase text-blue-700 tracking-wider">
                      Purchase Order
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                      {selectedPo.po_number} (Rev V{selectedPo.po_version})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Date: {formatDate(selectedPo.po_date)}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={selectedPo.status} />
                    </div>
                  </div>
                </div>

                {/* Seller & Consignee Columns */}
                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                      Vendor / Supplier Details:
                    </span>
                    <div className="font-bold text-slate-900 text-sm">{selectedPo.vendor_name}</div>
                    <div className="text-slate-600">Payment Terms: {selectedPo.payment_terms}</div>
                    <div className="text-slate-600">Freight Terms: {selectedPo.freight_terms}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                      Delivery & Consignee Location:
                    </span>
                    <div className="font-bold text-slate-900 text-sm">{selectedPo.project_name}</div>
                    <div className="text-slate-600">{selectedPo.site_name}</div>
                    <div className="text-slate-600">Delivery Target: {formatDate(selectedPo.delivery_date)}</div>
                    <div className="text-slate-500 text-[11px] truncate">
                      Billing: {selectedPo.billing_address}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2">UOM</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2 text-right">Basic Rate</th>
                        <th className="px-3 py-2 text-right">Disc %</th>
                        <th className="px-3 py-2 text-right">Taxable Amt</th>
                        <th className="px-3 py-2 text-right">GST %</th>
                        <th className="px-3 py-2 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedPo.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{it.item_name}</td>
                          <td className="px-3 py-2.5 text-slate-500">{it.uom}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-medium">{it.quantity}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(it.rate)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-500">{it.discount_percent}%</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(it.taxable_value)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{it.gst_percent}%</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(it.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={5} className="px-3 py-1.5 text-right text-slate-500">
                          Subtotal (Taxable Value):
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-800">
                          {formatCurrency(selectedPo.subtotal)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                      <tr>
                        <td colSpan={5} className="px-3 py-1.5 text-right text-slate-500">
                          Total Taxes (GST):
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-800">
                          {formatCurrency(selectedPo.tax_amount)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                      <tr className="border-t border-slate-300 text-sm">
                        <td colSpan={5} className="px-3 py-2 text-right text-slate-900">
                          Grand Total Purchase Value:
                        </td>
                        <td colSpan={3} className="px-3 py-2 text-right font-mono text-blue-700 font-extrabold">
                          {formatCurrency(selectedPo.grand_total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Terms and Signatures */}
                <div className="grid grid-cols-2 gap-6 text-xs pt-4 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Terms & Conditions:
                    </span>
                    <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {selectedPo.terms_and_conditions}
                    </pre>
                  </div>

                  <div className="flex flex-col justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-700 block">Signatures & Authorization</span>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Created by: {selectedPo.created_by_name}
                      </div>
                      {selectedPo.approved_by_name && (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                          Digitally Authorized by: {selectedPo.approved_by_name} ({formatDate(selectedPo.approved_at)})
                        </div>
                      )}
                    </div>
                    <div className="pt-8 border-t border-slate-300 flex justify-between text-[10px] text-slate-500">
                      <span>Vendor Acceptance Signature</span>
                      <span>Authorized Signatory (CivProcure)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Issue New Purchase Order (Contract)
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PO Number</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.po_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PO Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.po_date}
                    onChange={e => setFormData({ ...formData, po_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Order Type</label>
                  <select
                    value={formData.po_type}
                    onChange={e => setFormData({ ...formData, po_type: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-blue-600"
                  >
                    <option value="STANDARD">STANDARD PO</option>
                    <option value="RATE_CONTRACT">RATE CONTRACT</option>
                    <option value="SERVICE">SERVICE ORDER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vendor / Supplier *</label>
                  <select
                    required
                    value={formData.vendor_id}
                    onChange={e => {
                      const v = vendors.find(x => x.id === e.target.value);
                      setFormData({
                        ...formData,
                        vendor_id: e.target.value,
                        payment_terms: v?.payment_terms || formData.payment_terms,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-800"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Project & Site *</label>
                  <select
                    required
                    value={formData.project_id}
                    onChange={e => {
                      const projId = e.target.value;
                      const site = sites.find(s => s.project_id === projId) || sites[0];
                      setFormData({
                        ...formData,
                        project_id: projId,
                        site_id: site?.id || '',
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Contracted Material Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item Row
                  </button>
                </div>

                <div className="space-y-2">
                  {poLineItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 items-center">
                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Item *</label>
                        <select
                          value={item.item_id}
                          onChange={e => handleItemSelect(idx, e.target.value)}
                          className="w-full border border-slate-200 rounded-md p-1 text-xs"
                        >
                          {items.map(it => (
                            <option key={it.id} value={it.id}>
                              {it.item_code} - {it.item_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-400 mb-0.5">UOM</label>
                        <input
                          type="text"
                          readOnly
                          value={item.uom}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1 text-xs text-center"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Quantity *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const copy = [...poLineItems];
                            copy[idx].quantity = Number(e.target.value);
                            setPoLineItems(copy);
                          }}
                          className="w-full border border-slate-200 rounded-md p-1 text-xs text-right font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Rate (₹) *</label>
                        <input
                          type="number"
                          required
                          value={item.rate}
                          onChange={e => {
                            const copy = [...poLineItems];
                            copy[idx].rate = Number(e.target.value);
                            setPoLineItems(copy);
                          }}
                          className="w-full border border-slate-200 rounded-md p-1 text-xs text-right font-mono"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-400 mb-0.5">GST %</label>
                        <input
                          type="number"
                          value={item.gst_percent}
                          onChange={e => {
                            const copy = [...poLineItems];
                            copy[idx].gst_percent = Number(e.target.value);
                            setPoLineItems(copy);
                          }}
                          className="w-full border border-slate-200 rounded-md p-1 text-xs text-right font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Item Total (₹)</label>
                        <div className="p-1 font-mono text-xs font-bold text-slate-900 text-right">
                          {formatCurrency(
                            item.quantity * item.rate * (1 + item.gst_percent / 100)
                          )}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="text-xs text-slate-600">
                    Advance Commitment: <span className="font-bold text-slate-900">{formData.advance_percentage}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 mr-2">Grand Total:</span>
                    <span className="text-base font-bold font-mono text-blue-600">
                      {formatCurrency(calculateTotals().grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Advance Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.advance_percentage}
                    onChange={e => setFormData({ ...formData, advance_percentage: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Target Site Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={formData.delivery_date}
                    onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Freight Terms</label>
                  <input
                    type="text"
                    value={formData.freight_terms}
                    onChange={e => setFormData({ ...formData, freight_terms: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Contractual Clauses & Terms</label>
                <textarea
                  rows={3}
                  value={formData.terms_and_conditions}
                  onChange={e => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg"
                >
                  Create & Submit PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Amendment Modal (Section 21) */}
      {isAmendOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Amend Purchase Order: {selectedPo.po_number}
              </h3>
              <button onClick={() => setIsAmendOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAmendSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <div className="font-bold">Amendment Version Increment:</div>
                <div>
                  Current Version: <span className="font-mono font-semibold">V{selectedPo.po_version}</span> → Target Version:{' '}
                  <span className="font-mono font-bold text-blue-700">V{selectedPo.po_version + 1}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Amendment Justification & Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={amendReason}
                  onChange={e => setAmendReason(e.target.value)}
                  placeholder="e.g. Quantity revised due to structural revision in slab design / rate adjusted per price escalation index..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAmendOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-amber-600 hover:bg-amber-700 font-semibold rounded-lg"
                >
                  Confirm PO Amendment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Engine Action Modal */}
      {isApprovalOpen && selectedPo && (
        <ApprovalActionModal
          isOpen={isApprovalOpen}
          onClose={() => setIsApprovalOpen(false)}
          documentType="Purchase Order"
          documentNumber={selectedPo.po_number}
          documentAmount={selectedPo.grand_total}
          currentLevel={selectedPo.current_approval_level}
          onActionComplete={handleApprovalAction}
        />
      )}

      {/* Audit History Modal */}
      {isAuditOpen && selectedPo && (
        <AuditHistoryModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          recordId={selectedPo.id}
          auditLogs={auditLogs}
        />
      )}
    </div>
  );
};
