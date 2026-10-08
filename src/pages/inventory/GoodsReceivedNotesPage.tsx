import React, { useState, useEffect } from 'react';
import {
  Plus, Search, PackageCheck, Eye, Printer, CheckCircle2,
  XCircle, Truck, FileCheck, ShieldAlert, History, Calendar,
  MapPin, Warehouse, Layers, Package, AlertTriangle, ArrowRight,
  ArrowUpRight, TrendingUp, Check, Info, Box
} from 'lucide-react';
import { db } from '../../lib/db';
import { GoodsReceivedNote, GRNItem, PurchaseOrder, Project, Site, Vendor, StockLedger } from '../../types';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DocumentTimeline } from '../../components/common/DocumentTimeline';
import { ApprovalActionModal } from '../../components/common/ApprovalActionModal';
import { AuditHistoryModal } from '../../components/common/AuditHistoryModal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export interface GRNFormItem {
  po_item_id: string;
  item_id: string;
  item_name: string;
  item_code?: string;
  specification?: string;
  uom: string;
  ordered_quantity: number;
  previously_received: number;
  remaining_po_quantity: number;
  challan_quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  rejection_reason: string;
  batch_number: string;
  storage_location: string;
  bin_rack?: string;
  current_stock: number;
  reorder_level: number;
  unit_rate?: number;
}

export const COMMON_STORAGE_LOCATIONS = [
  'Central Covered Godown - Bay A1',
  'Open Yard 1 - Heavy Rebar Rack B3',
  'Aggregate Yard - Pit Sand Bay 2',
  'Aggregate Yard - Bunker 4',
  'Batching Plant Silo 1',
  'Electrical Store - Rack E2',
  'Plumbing Yard - Stacking Bin P4',
  'Finishing Store - Pallet Zone F1',
  'Main Yard - Bay 4',
  'Site Store Shed 2',
];

export const GoodsReceivedNotesPage: React.FC = () => {
  const { user, currentRole, hasPermission, selectedProjectId } = useAuth();
  const { showToast } = useNotifications();

  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stocks, setStocks] = useState<StockLedger[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'INSPECTION' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceivedNote | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQcOpen, setIsQcOpen] = useState(false);
  const [isRejectionSlipOpen, setIsRejectionSlipOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    grn_number: '',
    grn_date: new Date().toISOString().split('T')[0],
    po_id: '',
    vendor_challan_number: '',
    vendor_challan_date: new Date().toISOString().split('T')[0],
    vehicle_number: 'MH-12-RN-8821',
    transporter_name: 'Western Heavy Haulage Logistics',
    gate_entry_number: `GE-2026-${Date.now().toString().slice(-4)}`,
    gate_entry_date: new Date().toISOString().split('T')[0],
    store_location: 'Main Yard - Bay 4',
    weighbridge_slip_no: 'WB-99824',
    remarks: 'Gross vehicle weight verified on pit weighbridge before discharge.',
  });

  const [grnItems, setGrnItems] = useState<GRNFormItem[]>([]);

  // QC inspection form
  const [qcData, setQcData] = useState({
    qc_inspector_name: user.full_name,
    inspection_date: new Date().toISOString().split('T')[0],
    visual_inspection_passed: true,
    dimension_check_passed: true,
    test_certificate_verified: true,
    lab_test_report_number: 'LAB-CIV-2026-041',
    remarks: 'Complies with all technical grade and bend requirements.',
  });

  const loadData = async () => {
    const [grnList, poList, projList, siteList, vendList, stockList] = await Promise.all([
      db.getGRNs(),
      db.getPOs(),
      db.getProjects(),
      db.getSites(),
      db.getVendors(),
      db.getStockLedger(),
    ]);
    setGrns(grnList);
    setPos(poList.filter(p => ['APPROVED', 'PARTIALLY_RECEIVED'].includes(p.status)));
    setProjects(projList);
    setSites(siteList);
    setVendors(vendList);
    setStocks(stockList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const populateItemsFromPo = (targetPo: PurchaseOrder, currentStocks: StockLedger[]): GRNFormItem[] => {
    if (!targetPo?.items || targetPo.items.length === 0) return [];

    return targetPo.items.map(it => {
      const targetStock = currentStocks.find(
        s => (s.item_id === it.item_id || s.item_name.toLowerCase() === it.item_name.toLowerCase()) &&
             (s.project_id === targetPo.project_id || s.site_id === targetPo.site_id)
      ) || currentStocks.find(
        s => s.item_id === it.item_id || s.item_name.toLowerCase() === it.item_name.toLowerCase()
      );

      const prevReceived = it.received_quantity || 0;
      const remainingPO = Math.max(0, it.quantity - prevReceived);
      const defaultLoc = targetStock?.storage_location || `${targetPo.site_name || 'Main Yard'} - Bay 4`;
      const defaultBin = targetStock?.bin_rack || 'Bay A - Rack 01';

      return {
        po_item_id: it.id,
        item_id: it.item_id || '',
        item_name: it.item_name,
        item_code: targetStock?.item_code || '',
        specification: it.specification || '',
        uom: it.uom || it.unit || 'Nos',
        ordered_quantity: it.quantity,
        previously_received: prevReceived,
        remaining_po_quantity: remainingPO,
        challan_quantity: remainingPO,
        received_quantity: remainingPO,
        accepted_quantity: remainingPO,
        rejected_quantity: 0,
        rejection_reason: '',
        batch_number: `BATCH-${Date.now().toString().slice(-4)}`,
        storage_location: defaultLoc,
        bin_rack: defaultBin,
        current_stock: targetStock ? targetStock.current_quantity : 0,
        reorder_level: targetStock ? targetStock.reorder_level : 0,
        unit_rate: it.rate || targetStock?.average_rate || 0,
      };
    });
  };

  const handleOpenCreate = () => {
    const nextNumber = `GRN-2026-${(grns.length + 1).toString().padStart(4, '0')}`;
    const targetPo = pos[0];

    const targetStock = targetPo?.items?.[0]
      ? stocks.find(s => s.item_id === targetPo.items[0].item_id || s.item_name === targetPo.items[0].item_name)
      : null;

    setFormData({
      grn_number: nextNumber,
      grn_date: new Date().toISOString().split('T')[0],
      po_id: targetPo?.id || '',
      vendor_challan_number: `DC-VND-${Date.now().toString().slice(-5)}`,
      vendor_challan_date: new Date().toISOString().split('T')[0],
      vehicle_number: 'MH-14-GH-4921',
      transporter_name: 'Apex Freightways Pvt Ltd',
      gate_entry_number: `GE-2026-${(grns.length + 1).toString().padStart(4, '0')}`,
      gate_entry_date: new Date().toISOString().split('T')[0],
      store_location: targetStock?.storage_location || 'Central Storage Yard 1',
      weighbridge_slip_no: `WB-${Math.floor(10000 + Math.random() * 90000)}`,
      remarks: 'Material unloaded under site supervisor observation.',
    });

    if (targetPo) {
      setGrnItems(populateItemsFromPo(targetPo, stocks));
    } else {
      setGrnItems([]);
    }
    setIsCreateOpen(true);
  };

  const handlePoChange = (poId: string) => {
    const targetPo = pos.find(p => p.id === poId);
    setFormData(prev => ({
      ...prev,
      po_id: poId,
      store_location: targetPo?.site_name ? `${targetPo.site_name} - Main Yard` : prev.store_location,
    }));
    if (targetPo) {
      setGrnItems(populateItemsFromPo(targetPo, stocks));
    } else {
      setGrnItems([]);
    }
  };

  const handleQuantityChange = (index: number, received: number, accepted: number) => {
    const copy = [...grnItems];
    const rej = Math.max(0, received - accepted);
    copy[index].received_quantity = received;
    copy[index].accepted_quantity = accepted;
    copy[index].rejected_quantity = rej;
    setGrnItems(copy);
  };

  const handleLocationChange = (index: number, location: string) => {
    const copy = [...grnItems];
    copy[index].storage_location = location;
    setGrnItems(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const po = pos.find(p => p.id === formData.po_id);
    if (!po) {
      showToast('Select a valid PO', 'error');
      return;
    }

    const grnId = `grn-${Date.now()}`;
    const formattedItems: GRNItem[] = grnItems.map((gi, idx) => ({
      id: `grni-${Date.now()}-${idx}`,
      grn_id: grnId,
      po_item_id: gi.po_item_id,
      item_id: gi.item_id,
      item_name: gi.item_name,
      ordered_quantity: gi.ordered_quantity,
      previously_received: gi.previously_received,
      current_received: gi.received_quantity,
      challan_quantity: gi.challan_quantity,
      received_quantity: gi.received_quantity,
      accepted_quantity: gi.accepted_quantity,
      rejected_quantity: gi.rejected_quantity,
      unit: gi.uom,
      uom: gi.uom,
      rate: gi.unit_rate || 0,
      amount: gi.accepted_quantity * (gi.unit_rate || 0),
      rejection_reason: gi.rejection_reason,
      batch_number: gi.batch_number,
      storage_location: gi.storage_location || formData.store_location,
      bin_rack: gi.bin_rack,
      remaining_po_quantity: Math.max(0, gi.remaining_po_quantity - gi.accepted_quantity),
      current_stock: gi.current_stock,
    }));

    const newGrn: GoodsReceivedNote = {
      id: grnId,
      grn_number: formData.grn_number,
      grn_date: formData.grn_date,
      po_id: formData.po_id,
      po_number: po.po_number,
      vendor_id: po.vendor_id,
      vendor_name: po.vendor_name,
      project_id: po.project_id,
      project_name: po.project_name,
      site_id: po.site_id,
      site_name: po.site_name,
      vendor_challan_number: formData.vendor_challan_number,
      vendor_challan_date: formData.vendor_challan_date,
      vehicle_number: formData.vehicle_number,
      transporter_name: formData.transporter_name,
      gate_entry_number: formData.gate_entry_number,
      gate_entry_date: formData.gate_entry_date,
      received_by_id: user.id,
      received_by_name: user.full_name,
      store_location: formData.store_location,
      weighbridge_slip_no: formData.weighbridge_slip_no,
      status: 'INSPECTION_PENDING',
      remarks: formData.remarks,
      items: formattedItems,
      created_at: new Date().toISOString(),
    };

    await db.saveGRN(newGrn);
    showToast(`GRN ${newGrn.grn_number} saved and queued for QC Material Inspection!`, 'success');
    setIsCreateOpen(false);
    loadData();
  };

  const handleQcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrn) return;

    const allPassed =
      qcData.visual_inspection_passed &&
      qcData.dimension_check_passed &&
      qcData.test_certificate_verified;

    const updated: GoodsReceivedNote = {
      ...selectedGrn,
      status: allPassed ? 'APPROVED' : 'REJECTED',
      qc_inspected_by_name: qcData.qc_inspector_name,
      qc_inspection_date: qcData.inspection_date,
      visual_inspection_passed: qcData.visual_inspection_passed,
      dimension_check_passed: qcData.dimension_check_passed,
      test_certificate_verified: qcData.test_certificate_verified,
      lab_test_report_number: qcData.lab_test_report_number,
      remarks: `${selectedGrn.remarks} | QC Note: ${qcData.remarks}`,
    };

    await db.saveGRN(updated);
    showToast(
      `GRN QC Inspection finalized: ${updated.status}! Site stock updated accordingly.`,
      allPassed ? 'success' : 'error'
    );
    setIsQcOpen(false);
    loadData();
  };

  const handleViewAudit = async (grn: GoodsReceivedNote) => {
    const logs = await db.getAuditLogs('GRN', grn.id);
    setAuditLogs(logs);
    setSelectedGrn(grn);
    setIsAuditOpen(true);
  };

  const filteredGrns = grns.filter(grn => {
    if (selectedProjectId !== 'ALL' && grn.project_id !== selectedProjectId) return false;
    if (activeTab === 'INSPECTION' && grn.status === 'INSPECTION_PENDING') return true;
    if (activeTab === 'APPROVED' && grn.status === 'APPROVED') return true;
    if (activeTab === 'REJECTED' && grn.status === 'REJECTED') return true;
    if (activeTab !== 'ALL') return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        grn.grn_number.toLowerCase().includes(q) ||
        grn.po_number.toLowerCase().includes(q) ||
        grn.vendor_name?.toLowerCase().includes(q) ||
        grn.vehicle_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Goods Received Notes (GRN) & Inward Gate Entry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log site inward delivery challans, weighbridge verification, mandatory QA/QC inspection, and material acceptance.
          </p>
        </div>

        {hasPermission('GRN', 'CREATE') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Receive Delivery (GRN)
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {(['ALL', 'INSPECTION', 'APPROVED', 'REJECTED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' && `All Receipts (${grns.length})`}
              {tab === 'INSPECTION' && `Inspection Pending (${grns.filter(g => g.status === 'INSPECTION_PENDING').length})`}
              {tab === 'APPROVED' && `Accepted in Stock (${grns.filter(g => g.status === 'APPROVED').length})`}
              {tab === 'REJECTED' && `Rejected Materials`}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search GRN, PO, vehicle no..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* GRN Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">GRN Number</th>
                <th className="px-4 py-3">Receipt Date</th>
                <th className="px-4 py-3">PO Reference</th>
                <th className="px-4 py-3">Supplier & Challan</th>
                <th className="px-4 py-3">Vehicle & Gate Entry</th>
                <th className="px-4 py-3">Location Yard</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No goods receipts found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredGrns.map(grn => (
                  <tr key={grn.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                      {grn.grn_number}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(grn.grn_date)}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">{grn.po_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{grn.vendor_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Challan: {grn.vendor_challan_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-800">{grn.vehicle_number}</div>
                      <div className="text-[10px] text-slate-400">{grn.gate_entry_number}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{grn.store_location}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={grn.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedGrn(grn);
                          setIsDetailOpen(true);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        title="View GRN Sheet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {grn.status === 'INSPECTION_PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedGrn(grn);
                            setIsQcOpen(true);
                          }}
                          className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Execute QA/QC Inspection"
                        >
                          <PackageCheck className="h-4 w-4" />
                        </button>
                      )}

                      {grn.items?.some(it => it.rejected_quantity > 0) && (
                        <button
                          onClick={() => {
                            setSelectedGrn(grn);
                            setIsRejectionSlipOpen(true);
                          }}
                          className="p-1 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="Generate Material Rejection Slip"
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleViewAudit(grn)}
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

      {/* GRN Detail Modal */}
      {isDetailOpen && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10 print:hidden">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Goods Received Note: {selectedGrn.grn_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedGrn.project_name} • PO: {selectedGrn.po_number}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Official GRN
                </button>
                <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="print:hidden">
                <DocumentTimeline
                  steps={[
                    { key: 'PR', label: 'PR Indent', isComplete: true },
                    { key: 'PO', label: 'PO Released', docNumber: selectedGrn.po_number, isComplete: true },
                    { key: 'GRN', label: 'GRN Delivery', docNumber: selectedGrn.grn_number, date: selectedGrn.grn_date, isComplete: true },
                    { key: 'GRN', label: 'QC Passed', isComplete: selectedGrn.status === 'APPROVED' },
                    { key: 'BILL', label: 'Purchase Bill', isComplete: false },
                    { key: 'PAYMENT', label: 'Payment Done', isComplete: false },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Vendor Challan No.</span>
                  <span className="font-semibold text-slate-900 font-mono">{selectedGrn.vendor_challan_number}</span>
                  <div className="text-[10px] text-slate-500">{formatDate(selectedGrn.vendor_challan_date)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Vehicle & Transporter</span>
                  <span className="font-semibold text-slate-900 font-mono">{selectedGrn.vehicle_number}</span>
                  <div className="text-[10px] text-slate-500">{selectedGrn.transporter_name}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Gate Entry & Weighbridge</span>
                  <span className="font-semibold text-slate-900">{selectedGrn.gate_entry_number}</span>
                  <div className="text-[10px] text-slate-500">Slip: {selectedGrn.weighbridge_slip_no || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Store Location</span>
                  <span className="font-semibold text-slate-900">{selectedGrn.store_location}</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedGrn.status} />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Received Material Inspection, Storage Locations & Quantities
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Showing on-hand stock and remaining PO balance
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Item & Batch</th>
                        <th className="px-3 py-2">Exact Storage Location</th>
                        <th className="px-3 py-2 text-right">Site Stock</th>
                        <th className="px-3 py-2 text-right">PO Ordered</th>
                        <th className="px-3 py-2 text-right">Prev. Received</th>
                        <th className="px-3 py-2 text-right">This Receipt</th>
                        <th className="px-3 py-2 text-right text-emerald-700 font-bold">Accepted</th>
                        <th className="px-3 py-2 text-right text-rose-700 font-bold">Rejected</th>
                        <th className="px-3 py-2 text-right font-bold text-indigo-700">PO Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedGrn.items?.map((it, idx) => {
                        const matchedStock = stocks.find(
                          s => (s.item_id === it.item_id || s.item_name === it.item_name) &&
                               (s.project_id === selectedGrn.project_id || s.site_id === selectedGrn.site_id)
                        ) || stocks.find(s => s.item_id === it.item_id || s.item_name === it.item_name);

                        const loc = it.storage_location || matchedStock?.storage_location || selectedGrn.store_location;
                        const poRemaining = it.remaining_po_quantity !== undefined
                          ? it.remaining_po_quantity
                          : Math.max(0, it.ordered_quantity - (it.previously_received || 0) - it.accepted_quantity);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-900">{it.item_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Batch: {it.batch_number || 'N/A'} • {it.uom || it.unit}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="inline-flex items-center text-xs font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                <MapPin className="w-3 h-3 text-blue-600 mr-1 shrink-0" />
                                <span>{loc}</span>
                              </div>
                              {it.bin_rack && (
                                <div className="text-[10px] text-slate-400 ml-4 font-mono">{it.bin_rack}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-800">
                              {matchedStock ? `${matchedStock.current_quantity} ${matchedStock.uom}` : `${it.current_stock ?? 0} ${it.uom || it.unit}`}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-600">{it.ordered_quantity}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500">{it.previously_received ?? 0}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-medium">{it.received_quantity ?? it.current_received}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 bg-emerald-50/40">
                              {it.accepted_quantity}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600 bg-rose-50/40">
                              {it.rejected_quantity}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                poRemaining === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {poRemaining} {it.uom || it.unit}
                                {poRemaining === 0 && ' (Fulfilled)'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Quality Control Inspection Audit</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    {selectedGrn.visual_inspection_passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>Visual Physical Inspection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedGrn.dimension_check_passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>Dimensional Spec Tolerance</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedGrn.test_certificate_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>Mill / Lab Test Cert (MTC)</span>
                  </div>
                </div>
                {selectedGrn.lab_test_report_number && (
                  <div className="text-[11px] text-slate-500 pt-1">
                    Certified Lab Report Number: <span className="font-mono font-semibold text-slate-800">{selectedGrn.lab_test_report_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QC Inspection Workflow Modal */}
      {isQcOpen && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Execute QA/QC Material Inspection: {selectedGrn.grn_number}
              </h3>
              <button onClick={() => setIsQcOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleQcSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">QC Inspector Name</label>
                  <input
                    type="text"
                    required
                    value={qcData.qc_inspector_name}
                    onChange={e => setQcData({ ...qcData, qc_inspector_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Inspection Date</label>
                  <input
                    type="date"
                    required
                    value={qcData.inspection_date}
                    onChange={e => setQcData({ ...qcData, inspection_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center">
                    <Package className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                    Consignment Items Staged for QC & Stock Put-Away
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PO: {selectedGrn.po_number}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedGrn.items?.map((it, idx) => {
                    const matchedStock = stocks.find(
                      s => (s.item_id === it.item_id || s.item_name === it.item_name) &&
                           (s.project_id === selectedGrn.project_id || s.site_id === selectedGrn.site_id)
                    ) || stocks.find(s => s.item_id === it.item_id || s.item_name === it.item_name);

                    const loc = it.storage_location || matchedStock?.storage_location || selectedGrn.store_location;
                    const poRem = it.remaining_po_quantity !== undefined
                      ? it.remaining_po_quantity
                      : Math.max(0, it.ordered_quantity - (it.previously_received || 0) - it.accepted_quantity);

                    return (
                      <div key={idx} className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between text-[11px]">
                        <div>
                          <div className="font-semibold text-slate-900">{it.item_name}</div>
                          <div className="text-[10px] text-blue-600 flex items-center mt-0.5">
                            <MapPin className="w-3 h-3 mr-0.5" />
                            <span>Location: {loc}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="text-slate-600 font-medium">
                            Store Stock: <span className="font-bold text-slate-900">{matchedStock ? matchedStock.current_quantity : (it.current_stock ?? 0)} {it.uom || it.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Receiving: <span className="font-bold text-emerald-700">{it.accepted_quantity} {it.uom || it.unit}</span> • Remaining PO: <span className="font-bold text-indigo-700">{poRem} {it.uom || it.unit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block">Mandatory Quality Checkpoints:</span>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcData.visual_inspection_passed}
                    onChange={e => setQcData({ ...qcData, visual_inspection_passed: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Visual Condition Pass (No rust, water leakage, or transit damage)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcData.dimension_check_passed}
                    onChange={e => setQcData({ ...qcData, dimension_check_passed: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Dimensional & Gauge Tolerance Pass (per IS Codes)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcData.test_certificate_verified}
                    onChange={e => setQcData({ ...qcData, test_certificate_verified: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Manufacturer Mill Test Certificate (MTC) Verified</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Third Party Lab Report No.</label>
                <input
                  type="text"
                  value={qcData.lab_test_report_number}
                  onChange={e => setQcData({ ...qcData, lab_test_report_number: e.target.value })}
                  placeholder="e.g. NABL-LAB-2026-081"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">QC Remarks & Findings</label>
                <textarea
                  rows={2}
                  value={qcData.remarks}
                  onChange={e => setQcData({ ...qcData, remarks: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQcOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg"
                >
                  Finalize Quality Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Rejection Slip Modal */}
      {isRejectionSlipOpen && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-800">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-bold">Official Material Rejection Memo</h3>
              </div>
              <button onClick={() => setIsRejectionSlipOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                The following consignment items delivered by <span className="font-bold">{selectedGrn.vendor_name}</span> under PO{' '}
                <span className="font-mono font-bold">{selectedGrn.po_number}</span> failed site QA acceptance standards.
              </p>

              <div className="border border-rose-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50 text-[11px] font-semibold text-rose-900 uppercase">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Rejected Qty</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {selectedGrn.items
                      ?.filter(it => it.rejected_quantity > 0)
                      .map((it, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-slate-900">{it.item_name}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-rose-700">
                            {it.rejected_quantity} {it.uom}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {it.rejection_reason || 'Substandard quality / Off-specification dimensions'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                Notice: Supplier is requested to uplift rejected materials from site storage within 7 working days. Rejection debit note will be forwarded to accounts.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Print Rejection Memo
                </button>
                <button
                  onClick={() => setIsRejectionSlipOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inward Delivery Entry Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Record Material Inward Receipt (GRN)
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">GRN Number</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.grn_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.grn_date}
                    onChange={e => setFormData({ ...formData, grn_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Purchase Order *</label>
                  <CustomSelect
                    options={[
                      { label: '-- Choose Approved PO --', value: '' },
                      ...pos.map(p => ({ label: `${p.po_number} - ${p.vendor_name} (${p.project_name})`, value: p.id }))
                    ]}
                    value={formData.po_id}
                    onChange={poId => handlePoChange(poId)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vendor Challan / DC No. *</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_challan_number}
                    onChange={e => setFormData({ ...formData, vendor_challan_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Challan Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.vendor_challan_date}
                    onChange={e => setFormData({ ...formData, vendor_challan_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vehicle Plate Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_number}
                    onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Gate Entry Number</label>
                  <input
                    type="text"
                    value={formData.gate_entry_number}
                    onChange={e => setFormData({ ...formData, gate_entry_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Weighbridge Slip No.</label>
                  <input
                    type="text"
                    value={formData.weighbridge_slip_no}
                    onChange={e => setFormData({ ...formData, weighbridge_slip_no: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Storage Yard / Bay</label>
                  <input
                    type="text"
                    value={formData.store_location}
                    onChange={e => setFormData({ ...formData, store_location: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              {/* Selected PO Summary Bar */}
              {formData.po_id && (
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200 rounded-xl p-3.5 text-xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-800">
                        Purchase Order Items & Site Inventory Synchronization
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                      <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                      <span>Destination Site: <strong className="text-slate-700">{pos.find(p => p.id === formData.po_id)?.site_name || 'Project Site'}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">PO Total Lines</span>
                      <span className="font-bold text-slate-800 text-sm">{grnItems.length} Items</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Total PO Ordered</span>
                      <span className="font-bold text-slate-800 text-sm font-mono">
                        {grnItems.reduce((acc, it) => acc + it.ordered_quantity, 0)} Units
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Prev. Received</span>
                      <span className="font-bold text-slate-600 text-sm font-mono">
                        {grnItems.reduce((acc, it) => acc + it.previously_received, 0)} Units
                      </span>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200 shadow-2xs">
                      <span className="text-[10px] text-indigo-600 block uppercase tracking-wider font-bold">Total Remaining on PO</span>
                      <span className="font-bold text-indigo-700 text-sm font-mono">
                        {grnItems.reduce((acc, it) => acc + it.remaining_po_quantity, 0)} Units
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                    <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    PO Item Verification, Exact Locations & Stock Allocation
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {grnItems.length} {grnItems.length === 1 ? 'Item' : 'Items'} to process
                  </span>
                </div>

                {grnItems.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                    Select an approved Purchase Order above to load item stock, locations, and remaining quantities.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {grnItems.map((item, idx) => {
                      const remainingAfterThis = Math.max(0, item.remaining_po_quantity - item.accepted_quantity);
                      const isFullyReceived = item.accepted_quantity >= item.remaining_po_quantity && item.remaining_po_quantity > 0;
                      const isOverReceived = item.accepted_quantity > item.remaining_po_quantity;
                      const isLowStock = item.current_stock <= item.reorder_level;

                      return (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-3 transition-all hover:border-slate-300">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-start space-x-2">
                              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {item.item_name}
                                </div>
                                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                                  {item.item_code && <span className="font-mono">{item.item_code}</span>}
                                  {item.specification && <span>• {item.specification}</span>}
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium text-[10px]">
                                    UOM: {item.uom}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Batch / Lot:</span>
                              <input
                                type="text"
                                value={item.batch_number}
                                onChange={e => {
                                  const copy = [...grnItems];
                                  copy[idx].batch_number = e.target.value;
                                  setGrnItems(copy);
                                }}
                                placeholder="Batch No..."
                                className="w-28 text-xs font-mono border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div className="bg-blue-50/40 border border-blue-200/80 rounded-lg p-2.5 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-900 flex items-center text-[11px]">
                                  <FileCheck className="w-3.5 h-3.5 text-blue-600 mr-1" />
                                  Purchase Order Fulfillment Tracker
                                </span>
                                <span className="text-[10px] font-mono text-blue-600">
                                  Ordered: {item.ordered_quantity} {item.uom}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 bg-white p-2 rounded-md border border-blue-100 text-center">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">PO Ordered</span>
                                  <span className="font-mono font-bold text-slate-800 text-xs">
                                    {item.ordered_quantity} {item.uom}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Prev. Received</span>
                                  <span className="font-mono font-medium text-slate-600 text-xs">
                                    {item.previously_received} {item.uom}
                                  </span>
                                </div>
                                <div className="bg-indigo-50/70 rounded py-0.5 border border-indigo-100">
                                  <span className="text-[10px] text-indigo-700 block font-bold">Remaining on PO</span>
                                  <span className="font-mono font-bold text-indigo-800 text-xs">
                                    {item.remaining_po_quantity} {item.uom}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-0.5">
                                <span className="text-slate-500">Remaining After This GRN:</span>
                                {isOverReceived ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Excess Supply: +{item.accepted_quantity - item.remaining_po_quantity} {item.uom}
                                  </span>
                                ) : isFullyReceived ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    0 Remaining • 100% PO Line Fulfilled
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-medium text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                                    📦 {remainingAfterThis} {item.uom} Remaining to Receive
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="bg-emerald-50/30 border border-emerald-200/80 rounded-lg p-2.5 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-950 flex items-center text-[11px]">
                                  <Warehouse className="w-3.5 h-3.5 text-emerald-700 mr-1" />
                                  Site Store Inventory & Put-Away Location
                                </span>
                                {isLowStock ? (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                                    Low Stock Alert
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                    Optimal Stock
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-md border border-emerald-100">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Current On-Hand Stock</span>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                      {item.current_stock} {item.uom}
                                    </span>
                                    <span className="text-[10px] text-slate-400">(Min: {item.reorder_level})</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Projected New Stock</span>
                                  <span className="font-mono font-bold text-emerald-700 text-xs">
                                    {item.current_stock} → {item.current_stock + item.accepted_quantity} {item.uom}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-0.5">
                                <span className="text-slate-500 flex items-center">
                                  <MapPin className="w-3 h-3 text-blue-600 mr-1 shrink-0" />
                                  Assigned Storage Location:
                                </span>
                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                  {item.storage_location || 'Main Yard - Bay 4'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 space-y-2.5">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-center">
                              <div>
                                <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                                  Vendor Challan Qty
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.challan_quantity}
                                  onChange={e => {
                                    const copy = [...grnItems];
                                    copy[idx].challan_quantity = Number(e.target.value);
                                    setGrnItems(copy);
                                  }}
                                  className="w-full border border-slate-200 bg-white rounded-md px-2 py-1.5 font-mono text-xs text-right"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                                  Physical Received Qty *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  value={item.received_quantity}
                                  onChange={e => handleQuantityChange(idx, Number(e.target.value), item.accepted_quantity)}
                                  className="w-full border border-slate-300 bg-white rounded-md px-2 py-1.5 font-mono text-xs text-right font-medium"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-emerald-700 font-bold mb-1 flex items-center justify-between">
                                  <span>Accepted Qty *</span>
                                  <span className="text-[9px] text-emerald-600 font-normal">To Store</span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  value={item.accepted_quantity}
                                  onChange={e => handleQuantityChange(idx, item.received_quantity, Number(e.target.value))}
                                  className="w-full border border-emerald-400 bg-emerald-50/60 rounded-md px-2 py-1.5 font-mono text-xs text-right font-bold text-emerald-800 focus:bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-rose-700 font-bold mb-1">
                                  Rejected Qty: {item.rejected_quantity}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.rejected_quantity}
                                  onChange={e => {
                                    const rej = Number(e.target.value);
                                    const copy = [...grnItems];
                                    copy[idx].rejected_quantity = rej;
                                    copy[idx].accepted_quantity = Math.max(0, copy[idx].received_quantity - rej);
                                    setGrnItems(copy);
                                  }}
                                  className={`w-full border rounded-md px-2 py-1.5 font-mono text-xs text-right font-bold ${
                                    item.rejected_quantity > 0
                                      ? 'border-rose-400 bg-rose-50 text-rose-700'
                                      : 'border-slate-200 bg-white text-slate-400'
                                  }`}
                                />
                              </div>

                              <div className="col-span-2 sm:col-span-1">
                                <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                                  Rejection Reason
                                </label>
                                <input
                                  type="text"
                                  placeholder={item.rejected_quantity > 0 ? 'Reason for rejection...' : 'None'}
                                  disabled={item.rejected_quantity === 0}
                                  value={item.rejection_reason}
                                  onChange={e => {
                                    const copy = [...grnItems];
                                    copy[idx].rejection_reason = e.target.value;
                                    setGrnItems(copy);
                                  }}
                                  className="w-full border border-slate-200 bg-white rounded-md px-2 py-1.5 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                                />
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center space-x-1.5 text-slate-600 text-xs">
                                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="font-semibold text-slate-700">Put-Away Storage Location:</span>
                                <input
                                  type="text"
                                  value={item.storage_location}
                                  onChange={e => handleLocationChange(idx, e.target.value)}
                                  placeholder="e.g. Central Covered Godown - Bay A1"
                                  className="border border-slate-200 rounded px-2.5 py-1 text-xs w-64 bg-white text-slate-800 font-medium"
                                />
                              </div>

                              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                <span className="text-slate-400 font-medium">Quick Assign:</span>
                                {COMMON_STORAGE_LOCATIONS.slice(0, 3).map((locPreset, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleLocationChange(idx, locPreset)}
                                    className={`px-1.5 py-0.5 rounded border transition-colors ${
                                      item.storage_location === locPreset
                                        ? 'bg-blue-100 border-blue-300 text-blue-800 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {locPreset.split(' - ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Inward Notes</label>
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
                  Generate GRN & Gate Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {isAuditOpen && selectedGrn && (
        <AuditHistoryModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          recordId={selectedGrn.id}
          auditLogs={auditLogs}
        />
      )}
    </div>
  );
};