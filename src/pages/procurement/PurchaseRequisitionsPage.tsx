import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, FileText, CheckCircle2, XCircle, RotateCcw,
  Clock, Eye, Printer, History, AlertTriangle, Layers, Send,
  MapPin, Warehouse, Box, Info, Check, Package, ShoppingCart, ArrowRight
} from 'lucide-react';
import { db } from '../../lib/db';
import { PurchaseRequisition, PRItem, Project, Site, Item, CostCode, StockLedger } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DocumentTimeline } from '../../components/common/DocumentTimeline';
import { ApprovalActionModal } from '../../components/common/ApprovalActionModal';
import { AuditHistoryModal } from '../../components/common/AuditHistoryModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export interface PRLineItemForm {
  item_id: string;
  item_name: string;
  uom: string;
  quantity: number;
  estimated_rate: number;
  cost_code_id: string;
  remarks: string;
}

export const PurchaseRequisitionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentRole, hasPermission, selectedProjectId } = useAuth();
  const { showToast } = useNotifications();

  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [stocks, setStocks] = useState<StockLedger[]>([]);

  // View & Filter
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CLOSED'>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PurchaseRequisition | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    pr_number: '',
    pr_date: new Date().toISOString().split('T')[0],
    required_by_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    project_id: '',
    site_id: '',
    department: 'Civil Engineering',
    priority: 'HIGH' as PurchaseRequisition['priority'],
    material_type: 'Cement & Concrete',
    remarks: '',
  });

  const [lineItems, setLineItems] = useState<PRLineItemForm[]>([]);

  const getItemStock = (itemId: string, itemName?: string, projectId?: string, siteId?: string) => {
    const itemObj = items.find(i => i.id === itemId || (itemName && i.item_name.toLowerCase() === itemName.toLowerCase()));
    const normName = itemName?.toLowerCase() || itemObj?.item_name.toLowerCase() || '';

    // 1. Direct match for selected site
    const siteMatch = stocks.find(
      s => (s.item_id === itemId || s.item_name.toLowerCase() === normName) &&
           (!siteId || s.site_id === siteId)
    );

    // 2. Direct match for selected project if site not matched
    const projMatch = stocks.find(
      s => (s.item_id === itemId || s.item_name.toLowerCase() === normName) &&
           (!projectId || s.project_id === projectId)
    );

    // 3. Fallback across all other sites/locations
    const otherSiteMatches = stocks.filter(
      s => (s.item_id === itemId || s.item_name.toLowerCase() === normName) &&
           (!siteId || s.site_id !== siteId) &&
           s.current_quantity > 0
    );

    // 4. Any general match
    const anyMatch = stocks.find(
      s => s.item_id === itemId || s.item_name.toLowerCase() === normName
    );

    const reorderLvl = siteMatch?.reorder_level || projMatch?.reorder_level || anyMatch?.reorder_level || itemObj?.reorder_level || 0;
    
    // If siteId is specified and we have a siteMatch, use its quantity;
    // if siteId is specified but no match exists at that site, site quantity is 0!
    // if siteId is not specified, use anyMatch or project match.
    const currentQty = siteMatch
      ? siteMatch.current_quantity
      : siteId
      ? 0
      : (projMatch?.current_quantity ?? anyMatch?.current_quantity ?? 0);

    const loc = siteMatch?.storage_location || projMatch?.storage_location || anyMatch?.storage_location || 'Central Site Yard';
    const siteName = siteMatch?.site_name || sites.find(s => s.id === siteId)?.site_name || 'Selected Site';

    const otherStockAvailable = otherSiteMatches.length > 0;
    const primaryOtherMatch = otherSiteMatches[0];

    return {
      current_quantity: currentQty,
      reorder_level: reorderLvl,
      storage_location: loc,
      isLow: currentQty <= reorderLvl && currentQty > 0,
      isZero: currentQty === 0,
      isOptimal: currentQty > reorderLvl,
      site_name: siteName,
      has_other_stock: otherStockAvailable,
      other_site_info: primaryOtherMatch ? `${primaryOtherMatch.current_quantity} ${primaryOtherMatch.uom} at ${primaryOtherMatch.site_name} (${primaryOtherMatch.storage_location || 'Yard'})` : null,
      total_company_stock: stocks
        .filter(s => s.item_id === itemId || s.item_name.toLowerCase() === normName)
        .reduce((sum, s) => sum + (s.current_quantity || 0), 0),
    };
  };

  const loadAll = async () => {
    const [prList, projList, siteList, itmList, ccList, stockList] = await Promise.all([
      db.getPRs(),
      db.getProjects(),
      db.getSites(),
      db.getItems(),
      db.getCostCodes(),
      db.getStockLedger(),
    ]);
    setPrs(prList);
    setProjects(projList);
    setSites(siteList);
    setItems(itmList);
    setCostCodes(ccList);
    setStocks(stockList);

    if (projList.length > 0 && !formData.project_id) {
      setFormData(prev => ({
        ...prev,
        project_id: projList[0].id,
        site_id: siteList.find(s => s.project_id === projList[0].id)?.id || siteList[0]?.id || '',
      }));
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleOpenCreate = async () => {
    // Refresh latest stock ledger before opening modal to ensure live remaining stock
    const [latestStocks, latestItems, latestProjects, latestSites] = await Promise.all([
      db.getStockLedger(),
      db.getItems(),
      db.getProjects(),
      db.getSites(),
    ]);
    setStocks(latestStocks);
    setItems(latestItems);
    setProjects(latestProjects);
    setSites(latestSites);

    const nextPrNumber = `PR-2026-${(prs.length + 1).toString().padStart(4, '0')}`;
    const initialProj = latestProjects[0]?.id || '';
    const initialSite = latestSites.find(s => s.project_id === initialProj)?.id || latestSites[0]?.id || '';

    setFormData({
      pr_number: nextPrNumber,
      pr_date: new Date().toISOString().split('T')[0],
      required_by_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      project_id: initialProj,
      site_id: initialSite,
      department: 'Site Execution',
      priority: 'HIGH',
      material_type: 'Reinforcement Steel & Cement',
      remarks: 'Urgent concrete pour requirement for Basement Slab 2.',
    });

    if (latestItems.length > 0) {
      setLineItems([
        {
          item_id: latestItems[0].id,
          item_name: latestItems[0].item_name,
          uom: latestItems[0].unit || latestItems[0].uom || 'Nos',
          quantity: 200,
          estimated_rate: latestItems[0].standard_rate || 350,
          cost_code_id: costCodes[0]?.id || '',
          remarks: latestItems[0].specification || 'Grade 53 OPC',
        },
      ]);
    }
    setIsCreateOpen(true);
  };

  const handleAddItemRow = () => {
    // Find an item that has not yet been added to line items, or pick next in sequence
    const unselected = items.find(it => !lineItems.some(li => li.item_id === it.id));
    const nextItem = unselected || items[lineItems.length % items.length] || items[0];
    if (!nextItem) return;

    setLineItems(prev => [
      ...prev,
      {
        item_id: nextItem.id,
        item_name: nextItem.item_name,
        uom: nextItem.unit || nextItem.uom || 'Nos',
        quantity: nextItem.unit === 'MT' ? 10 : nextItem.unit === 'Bag' ? 100 : nextItem.unit === 'Cum' ? 25 : 50,
        estimated_rate: nextItem.standard_rate || 500,
        cost_code_id: costCodes[0]?.id || '',
        remarks: nextItem.specification || '',
      },
    ]);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = items.find(i => i.id === itemId);
    if (!selected) return;

    const copy = [...lineItems];
    copy[index] = {
      ...copy[index],
      item_id: selected.id,
      item_name: selected.item_name,
      uom: selected.unit || selected.uom || 'Nos',
      estimated_rate: selected.standard_rate || 0,
      remarks: selected.specification || copy[index].remarks,
    };
    setLineItems(copy);
  };

  const handleRemoveItemRow = (index: number) => {
    if (lineItems.length === 1) {
      showToast('Requisition must have at least one line item', 'error');
      return;
    }
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      showToast('Add at least one line item.', 'error');
      return;
    }

    const proj = projects.find(p => p.id === formData.project_id);
    const site = sites.find(s => s.id === formData.site_id);

    const totalEstAmount = lineItems.reduce(
      (acc, item) => acc + item.quantity * item.estimated_rate,
      0
    );

    const prId = `pr-${Date.now()}`;
    const formattedItems: PRItem[] = lineItems.map((li, idx) => {
      const stockInfo = getItemStock(li.item_id, li.item_name, formData.project_id, formData.site_id);
      return {
        id: `pri-${Date.now()}-${idx}`,
        pr_id: prId,
        item_id: li.item_id,
        item_name: li.item_name,
        uom: li.uom,
        unit: li.uom,
        quantity: Number(li.quantity),
        estimated_rate: Number(li.estimated_rate),
        estimated_amount: Number(li.quantity) * Number(li.estimated_rate),
        cost_code: costCodes.find(c => c.id === li.cost_code_id)?.code || 'CC-CIVIL-01',
        cost_code_name: costCodes.find(c => c.id === li.cost_code_id)?.name || 'Civil Works',
        ordered_quantity: 0,
        balance_quantity: Number(li.quantity),
        remarks: li.remarks,
        current_stock: stockInfo.current_quantity,
        remaining_stock: stockInfo.current_quantity,
      };
    });

    const newPr: PurchaseRequisition = {
      id: prId,
      pr_number: formData.pr_number,
      pr_date: formData.pr_date,
      required_by_date: formData.required_by_date,
      project_id: formData.project_id,
      project_name: proj?.project_name,
      site_id: formData.site_id,
      site_name: site?.site_name,
      requested_by_id: user.id,
      requested_by_name: user.full_name,
      department: formData.department,
      priority: formData.priority,
      material_type: formData.material_type,
      total_estimated_amount: totalEstAmount,
      status: 'PENDING_APPROVAL',
      current_approval_level: 1,
      remarks: formData.remarks,
      items: formattedItems,
      created_at: new Date().toISOString(),
    };

    await db.savePR(newPr);
    showToast(`Requisition ${newPr.pr_number} created and submitted for approval!`, 'success');
    setIsCreateOpen(false);
    loadAll();
  };

  const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'RETURN', comments: string) => {
    if (!selectedPr) return;
    await db.processApproval(
      'PR',
      selectedPr.id,
      selectedPr.pr_number,
      selectedPr.current_approval_level,
      action,
      comments,
      user.id,
      user.full_name,
      currentRole
    );
    setIsApprovalOpen(false);
    loadAll();
  };

  const handleViewAudit = async (pr: PurchaseRequisition) => {
    const logs = await db.getAuditLogs('PR', pr.id);
    setAuditLogs(logs);
    setSelectedPr(pr);
    setIsAuditOpen(true);
  };

  // Tab & Search Filtering
  const filteredPrs = prs.filter(pr => {
    if (selectedProjectId !== 'ALL' && pr.project_id !== selectedProjectId) return false;
    if (activeTab === 'PENDING' && !['PENDING_APPROVAL', 'SUBMITTED'].includes(pr.status)) return false;
    if (activeTab === 'APPROVED' && !['APPROVED', 'PARTIALLY_ORDERED'].includes(pr.status)) return false;
    if (activeTab === 'CLOSED' && !['CLOSED', 'REJECTED', 'FULLY_ORDERED'].includes(pr.status)) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        pr.pr_number.toLowerCase().includes(q) ||
        pr.project_name?.toLowerCase().includes(q) ||
        pr.requested_by_name.toLowerCase().includes(q) ||
        pr.material_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Purchase Requisitions (PR)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create site indents, monitor authorization pipeline, and track indent-to-PO conversion.
          </p>
        </div>

        {hasPermission('PR', 'CREATE') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Raise Site Indent (PR)
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {(['ALL', 'PENDING', 'APPROVED', 'CLOSED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' && `All Requisitions (${prs.length})`}
              {tab === 'PENDING' && `Pending Approval (${prs.filter(p => ['PENDING_APPROVAL', 'SUBMITTED'].includes(p.status)).length})`}
              {tab === 'APPROVED' && `Approved Indents (${prs.filter(p => ['APPROVED', 'PARTIALLY_ORDERED'].includes(p.status)).length})`}
              {tab === 'CLOSED' && `Closed / Rejected`}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PR number, project, requestor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* PR Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">PR Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Project & Site</th>
                <th className="px-4 py-3">Material Category</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3 text-center">Priority</th>
                <th className="px-4 py-3 text-right">Est. Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No purchase requisitions found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredPrs.map(pr => (
                  <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                      {pr.pr_number}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(pr.pr_date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{pr.project_name}</div>
                      <div className="text-[11px] text-slate-400">{pr.site_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium">{pr.material_type}</div>
                      <div className="text-[11px] text-slate-400">{pr.items?.length || 0} line items</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{pr.requested_by_name}</div>
                      <div className="text-[10px] text-slate-400">{pr.department}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          pr.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-700'
                            : pr.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pr.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 font-mono">
                      {formatCurrency(pr.total_estimated_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={pr.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedPr(pr);
                          setIsDetailOpen(true);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        title="View Details & Lifecycle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {['PENDING_APPROVAL', 'SUBMITTED'].includes(pr.status) && hasPermission('PR', 'APPROVE') && (
                        <button
                          onClick={() => {
                            setSelectedPr(pr);
                            setIsApprovalOpen(true);
                          }}
                          className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Authorize / Review"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}

                      {['APPROVED', 'PARTIALLY_ORDERED'].includes(pr.status) && (
                        <>
                          <button
                            onClick={() => navigate(`/procurement/rfq?from_pr=${pr.id}`)}
                            className="p-1 rounded-md text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="Create RFQ from this PR"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/procurement/purchase-orders?from_pr=${pr.id}`)}
                            className="p-1 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Issue Direct PO from this PR"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleViewAudit(pr)}
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

      {/* PR Detail Modal with Visual Lifecycle Timeline */}
      {isDetailOpen && selectedPr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Purchase Requisition: {selectedPr.pr_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedPr.project_name} • {selectedPr.site_name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  title="Print Indent"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Document Timeline Component (Section 37) */}
              <DocumentTimeline
                steps={[
                  { key: 'PR', label: 'PR Created', docNumber: selectedPr.pr_number, date: selectedPr.pr_date, isComplete: true },
                  { key: 'PR', label: 'PR Approved', docNumber: selectedPr.pr_number, date: selectedPr.approved_at, isComplete: selectedPr.status === 'APPROVED' },
                  { key: 'RFQ', label: 'RFQ Issued', docNumber: selectedPr.status === 'APPROVED' ? 'RFQ-2026-0041' : undefined, isComplete: selectedPr.status === 'APPROVED' },
                  { key: 'QUOTATION', label: 'Vendor Quotes', isComplete: false },
                  { key: 'COMPARISON', label: 'Comparison', isComplete: false },
                  { key: 'PO', label: 'PO Released', isComplete: false },
                  { key: 'GRN', label: 'GRN Receipt', isComplete: false },
                  { key: 'BILL', label: 'Purchase Bill', isComplete: false },
                  { key: 'PAYMENT', label: 'Payment Done', isComplete: false },
                ]}
              />

              {/* Meta Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Requested By</span>
                  <span className="font-semibold text-slate-800">{selectedPr.requested_by_name}</span>
                  <div className="text-[10px] text-slate-500">{selectedPr.department}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Required By Date</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedPr.required_by_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Priority Level</span>
                  <span className="font-semibold text-slate-800">{selectedPr.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status</span>
                  <StatusBadge status={selectedPr.status} />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Requisition Line Items ({selectedPr.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2">UOM</th>
                        <th className="px-3 py-2 text-right">Site Remaining Stock</th>
                        <th className="px-3 py-2 text-right">Required Qty</th>
                        <th className="px-3 py-2 text-right">Est. Rate</th>
                        <th className="px-3 py-2 text-right">Est. Amount</th>
                        <th className="px-3 py-2">Cost Code</th>
                        <th className="px-3 py-2 text-right">Balance Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPr.items?.map((it, idx) => {
                        const stockInfo = getItemStock(it.item_id || '', it.item_name, selectedPr.project_id, selectedPr.site_id);
                        const displayedStock = it.remaining_stock ?? it.current_stock ?? stockInfo.current_quantity;

                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-slate-800">{it.item_name}</td>
                            <td className="px-3 py-2 text-slate-500">{it.uom}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                displayedStock === 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : displayedStock <= stockInfo.reorder_level
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {displayedStock} {it.uom}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium">{it.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatCurrency(it.estimated_rate)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.estimated_amount)}
                            </td>
                            <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                              {it.cost_code_name || 'Civil Works'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-600 font-medium">
                              {it.balance_quantity ?? it.quantity}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-right text-slate-700">
                          Total Estimated Value:
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-blue-600">
                          {formatCurrency(selectedPr.total_estimated_amount)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedPr.remarks && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-700">Requisition Remarks:</span> {selectedPr.remarks}
                </div>
              )}

              {['APPROVED', 'PARTIALLY_ORDERED'].includes(selectedPr.status) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-blue-950">Next Step: Proceed with Procurement Execution</div>
                    <div className="text-[11px] text-blue-700">
                      This requisition is approved. You can solicit competitive vendor bids (RFQ) or issue a direct Purchase Order.
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        setIsDetailOpen(false);
                        navigate(`/procurement/rfq?from_pr=${selectedPr.id}`);
                      }}
                      className="inline-flex items-center px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Create RFQ (Bidding)
                    </button>
                    <button
                      onClick={() => {
                        setIsDetailOpen(false);
                        navigate(`/procurement/purchase-orders?from_pr=${selectedPr.id}`);
                      }}
                      className="inline-flex items-center px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                      Issue Direct PO
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create PR Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Raise New Purchase Requisition (Site Indent)
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PR Number</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.pr_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PR Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.pr_date}
                    onChange={e => setFormData({ ...formData, pr_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Required By Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.required_by_date}
                    onChange={e => setFormData({ ...formData, required_by_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Project *</label>
                  <select
                    required
                    value={formData.project_id}
                    onChange={e => {
                      const projId = e.target.value;
                      const siteForProj = sites.find(s => s.project_id === projId);
                      setFormData({
                        ...formData,
                        project_id: projId,
                        site_id: siteForProj?.id || sites[0]?.id || '',
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Site / Store Location *</label>
                  <select
                    required
                    value={formData.site_id}
                    onChange={e => setFormData({ ...formData, site_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {sites
                      .filter(s => !formData.project_id || s.project_id === formData.project_id)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.site_name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-blue-600"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Material Classification</label>
                  <input
                    type="text"
                    value={formData.material_type}
                    onChange={e => setFormData({ ...formData, material_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              {/* Line items section with live remaining stock visibility */}
              <div className="border border-slate-200 rounded-lg p-3.5 space-y-3 bg-slate-50/70">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2.5">
                  <div>
                    <span className="font-bold text-slate-800 text-xs flex items-center">
                      <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      Requisition Items & Store Inventory Check
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Live remaining stock balances are retrieved from the site store ledger for each item row immediately as soon as you add it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item Row
                  </button>
                </div>

                <div className="space-y-2.5">
                  {lineItems.map((item, idx) => {
                    const stock = getItemStock(item.item_id, item.item_name, formData.project_id, formData.site_id);
                    const selectedItemObj = items.find(i => i.id === item.item_id);

                    return (
                      <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 transition-all hover:border-slate-300">
                        {/* Row Header: Item Selector & Cost Code */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 flex-1">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="flex-1">
                              <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                                Select Item from Master Catalog *
                              </label>
                              <select
                                value={item.item_id}
                                onChange={e => handleItemSelect(idx, e.target.value)}
                                className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                              >
                                {items.map(it => (
                                  <option key={it.id} value={it.id}>
                                    {it.item_code} - {it.item_name} ({it.unit || it.uom})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 sm:w-64">
                            <div className="flex-1">
                              <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                                Budget Cost Code
                              </label>
                              <select
                                value={item.cost_code_id}
                                onChange={e => {
                                  const copy = [...lineItems];
                                  copy[idx].cost_code_id = e.target.value;
                                  setLineItems(copy);
                                }}
                                className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white font-mono text-slate-700"
                              >
                                {costCodes.map(cc => (
                                  <option key={cc.id} value={cc.id}>
                                    {cc.code} - {cc.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="mt-4 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded text-xs flex items-center transition-colors"
                              title="Remove Line Item"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* LIVE REMAINING STOCK & LOCATION CARD - Prominently visible immediately upon adding row */}
                        <div className={`p-2.5 rounded-lg border text-xs transition-colors ${
                          stock.isZero
                            ? 'bg-rose-50/70 border-rose-200'
                            : stock.isLow
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-emerald-50/70 border-emerald-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            {/* Stock Metric */}
                            <div className="flex items-center space-x-2.5">
                              <div className={`p-1.5 rounded-md ${
                                stock.isZero
                                  ? 'bg-rose-100 text-rose-700'
                                  : stock.isLow
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                <Warehouse className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                    Remaining Stock at Site:
                                  </span>
                                  <span className={`font-mono font-bold text-sm ${
                                    stock.isZero
                                      ? 'text-rose-700'
                                      : stock.isLow
                                      ? 'text-amber-800'
                                      : 'text-emerald-800'
                                  }`}>
                                    {stock.current_quantity} {item.uom}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    stock.isZero
                                      ? 'bg-rose-100 text-rose-800'
                                      : stock.isLow
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-emerald-100 text-emerald-900'
                                  }`}>
                                    {stock.isZero ? 'Out of Stock' : stock.isLow ? 'Low Stock' : 'In Stock'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>Safety Reorder Level: <strong>{stock.reorder_level} {item.uom}</strong></span>
                                  <span>•</span>
                                  <span className="text-slate-600 font-medium">
                                    {stock.isZero
                                      ? '⚠️ Immediate purchase order needed'
                                      : stock.isLow
                                      ? '⚠️ Stock below safety reorder threshold'
                                      : '✓ Adequate store inventory currently on-hand'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Storage Location & Cross-Site Availability */}
                            <div className="text-right sm:border-l sm:border-slate-200/60 sm:pl-3 flex flex-col justify-center">
                              <div className="flex items-center justify-start sm:justify-end text-[11px] font-medium text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-blue-600 mr-1 shrink-0" />
                                <span className="font-semibold text-slate-800">{stock.storage_location}</span>
                              </div>
                              {stock.has_other_stock && stock.other_site_info ? (
                                <div className="text-[10px] text-indigo-700 font-medium mt-0.5 flex items-center justify-start sm:justify-end gap-1">
                                  <span>📦 Other Sites: {stock.other_site_info}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Total Company Stock: {stock.total_company_stock} {item.uom}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Input Row: Quantities, Rate, Calculation & Remarks */}
                        <div className="grid grid-cols-12 gap-2.5 items-center pt-1">
                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                              Required Quantity *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.quantity}
                                onChange={e => {
                                  const copy = [...lineItems];
                                  copy[idx].quantity = Number(e.target.value);
                                  setLineItems(copy);
                                }}
                                className="w-full border border-slate-200 rounded-md p-1.5 text-xs text-right pr-12 font-mono font-medium focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-medium pointer-events-none">
                                {item.uom}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                              Est. Unit Rate (₹) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.estimated_rate}
                              onChange={e => {
                                const copy = [...lineItems];
                                copy[idx].estimated_rate = Number(e.target.value);
                                setLineItems(copy);
                              }}
                              className="w-full border border-slate-200 rounded-md p-1.5 text-xs text-right font-mono focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              Estimated Total
                            </label>
                            <div className="w-full font-mono text-xs font-bold text-slate-800 text-right py-1.5 px-2 bg-slate-50 rounded-md border border-slate-200 truncate">
                              {formatCurrency(item.quantity * item.estimated_rate)}
                            </div>
                          </div>

                          <div className="col-span-6 sm:col-span-4">
                            <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              Line Remarks / Specification
                            </label>
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={e => {
                                const copy = [...lineItems];
                                copy[idx].remarks = e.target.value;
                                setLineItems(copy);
                              }}
                              placeholder={selectedItemObj?.specification || "e.g. Grade 53 OPC / IS certified"}
                              className="w-full border border-slate-200 rounded-md p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Indent Remarks & Justification</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
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
                  Submit for Multi-Tier Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Engine Action Modal */}
      {isApprovalOpen && selectedPr && (
        <ApprovalActionModal
          isOpen={isApprovalOpen}
          onClose={() => setIsApprovalOpen(false)}
          documentType="Purchase Requisition"
          documentNumber={selectedPr.pr_number}
          documentAmount={selectedPr.total_estimated_amount}
          currentLevel={selectedPr.current_approval_level}
          onActionComplete={handleApprovalAction}
        />
      )}

      {/* Audit History Modal */}
      {isAuditOpen && selectedPr && (
        <AuditHistoryModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          recordId={selectedPr.id}
          auditLogs={auditLogs}
        />
      )}
    </div>
  );
};
