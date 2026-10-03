import React, { useState, useEffect } from 'react';
import {
  Plus, Search, CheckCircle2, XCircle, AlertTriangle, Eye, Printer,
  Receipt, DollarSign, Calculator, FileCheck, ShieldAlert, History
} from 'lucide-react';
import { db } from '../../lib/db';
import { PurchaseBill, BillItem, PurchaseOrder, GoodsReceivedNote, Vendor, Project } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DocumentTimeline } from '../../components/common/DocumentTimeline';
import { ApprovalActionModal } from '../../components/common/ApprovalActionModal';
import { AuditHistoryModal } from '../../components/common/AuditHistoryModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const PurchaseBillsPage: React.FC = () => {
  const { user, currentRole, hasPermission, selectedProjectId } = useAuth();
  const { showToast } = useNotifications();

  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'MATCHED' | 'DISCREPANT'>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isDebitNoteOpen, setIsDebitNoteOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    vendor_invoice_number: `INV-VND-${Date.now().toString().slice(-5)}`,
    vendor_invoice_date: new Date().toISOString().split('T')[0],
    po_id: '',
    grn_id: '',
    tds_rate_percent: 0.1, // Sec 194Q
    gst_tds_rate_percent: 2.0,
    retention_percent: 5.0,
    advance_adjusted: 0,
    remarks: 'Original tax invoice matched against gate receipt & QC clearance.',
  });

  const [billItems, setBillItems] = useState<Array<{
    po_item_id: string;
    item_id: string;
    item_name: string;
    uom: string;
    po_quantity: number;
    grn_accepted_quantity: number;
    invoice_quantity: number;
    po_rate: number;
    invoice_rate: number;
    gst_percent: number;
  }>>([]);

  const loadData = async () => {
    const [bList, poList, grnList, vendList, projList] = await Promise.all([
      db.getBills(),
      db.getPOs(),
      db.getGRNs(),
      db.getVendors(),
      db.getProjects(),
    ]);
    setBills(bList);
    setPos(poList);
    setGrns(grnList.filter(g => g.status === 'APPROVED'));
    setVendors(vendList);
    setProjects(projList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    const nextNumber = `PB-2026-${(bills.length + 1).toString().padStart(4, '0')}`;
    const targetGrn = grns[0];
    const linkedPo = pos.find(p => p.id === targetGrn?.po_id) || pos[0];

    setFormData({
      bill_number: nextNumber,
      bill_date: new Date().toISOString().split('T')[0],
      vendor_invoice_number: `INV-GST-${Date.now().toString().slice(-4)}`,
      vendor_invoice_date: new Date().toISOString().split('T')[0],
      po_id: linkedPo?.id || '',
      grn_id: targetGrn?.id || '',
      tds_rate_percent: 0.1,
      gst_tds_rate_percent: 0,
      retention_percent: 0,
      advance_adjusted: linkedPo ? (linkedPo.advance_amount || 0) : 0,
      remarks: 'Verified against e-way bill and physical receipt.',
    });

    if (targetGrn?.items) {
      setBillItems(
        targetGrn.items.map(gi => {
          const poItem = linkedPo?.items?.find(pi => pi.id === gi.po_item_id || pi.item_id === gi.item_id);
          const rate = poItem?.rate || 350;
          return {
            po_item_id: gi.po_item_id,
            item_id: gi.item_id,
            item_name: gi.item_name,
            uom: gi.uom,
            po_quantity: gi.ordered_quantity,
            grn_accepted_quantity: gi.accepted_quantity,
            invoice_quantity: gi.accepted_quantity,
            po_rate: rate,
            invoice_rate: rate,
            gst_percent: poItem?.gst_percent || 18,
          };
        })
      );
    }
    setIsCreateOpen(true);
  };

  const handleGrnSelect = (grnId: string) => {
    const targetGrn = grns.find(g => g.id === grnId);
    if (!targetGrn) return;
    const linkedPo = pos.find(p => p.id === targetGrn.po_id);

    setFormData(prev => ({
      ...prev,
      grn_id: grnId,
      po_id: linkedPo?.id || prev.po_id,
      advance_adjusted: linkedPo ? linkedPo.advance_amount : 0,
    }));

    if (targetGrn.items) {
      setBillItems(
        targetGrn.items.map(gi => {
          const poItem = linkedPo?.items?.find(pi => pi.id === gi.po_item_id || pi.item_id === gi.item_id);
          const rate = poItem?.rate || 350;
          return {
            po_item_id: gi.po_item_id,
            item_id: gi.item_id,
            item_name: gi.item_name,
            uom: gi.uom,
            po_quantity: gi.ordered_quantity,
            grn_accepted_quantity: gi.accepted_quantity,
            invoice_quantity: gi.accepted_quantity,
            po_rate: rate,
            invoice_rate: rate,
            gst_percent: poItem?.gst_percent || 18,
          };
        })
      );
    }
  };

  const calculateMatchingEngine = () => {
    let taxableAmount = 0;
    let taxAmount = 0;
    let hasVariance = false;

    const evaluatedItems: BillItem[] = billItems.map((bi, idx) => {
      const lineTaxable = bi.invoice_quantity * bi.invoice_rate;
      const lineTax = lineTaxable * (bi.gst_percent / 100);
      const lineTotal = lineTaxable + lineTax;

      const qtyVar = bi.invoice_quantity - bi.grn_accepted_quantity;
      const rateVar = bi.invoice_rate - bi.po_rate;

      // Tolerance: Qty 0%, Rate 0%
      const lineDiscrepancy = Math.abs(qtyVar) > 0.001 || Math.abs(rateVar) > 0.01;
      if (lineDiscrepancy) hasVariance = true;

      taxableAmount += lineTaxable;
      taxAmount += lineTax;

      return {
        id: `bi-${Date.now()}-${idx}`,
        bill_id: '',
        po_item_id: bi.po_item_id,
        grn_item_id: '',
        item_id: bi.item_id,
        item_name: bi.item_name,
        uom: bi.uom,
        po_quantity: bi.po_quantity,
        grn_quantity: bi.grn_accepted_quantity,
        invoice_quantity: bi.invoice_quantity,
        po_rate: bi.po_rate,
        invoice_rate: bi.invoice_rate,
        taxable_amount: Number(lineTaxable.toFixed(2)),
        gst_percent: bi.gst_percent,
        gst_amount: Number(lineTax.toFixed(2)),
        total_amount: Number(lineTotal.toFixed(2)),
        quantity_variance: Number(qtyVar.toFixed(2)),
        rate_variance: Number(rateVar.toFixed(2)),
        variance_reason: lineDiscrepancy
          ? `Discrepancy detected: Qty Var: ${qtyVar}, Rate Var: ${rateVar}`
          : undefined,
      };
    });

    const totalBillAmount = taxableAmount + taxAmount;

    // Deductions
    const tdsAmt = taxableAmount * (formData.tds_rate_percent / 100);
    const gstTdsAmt = taxableAmount * (formData.gst_tds_rate_percent / 100);
    const retentionAmt = totalBillAmount * (formData.retention_percent / 100);
    const advAdj = Number(formData.advance_adjusted) || 0;

    const totalDeductions = tdsAmt + gstTdsAmt + retentionAmt + advAdj;
    const netPayable = Math.max(0, totalBillAmount - totalDeductions);

    return {
      evaluatedItems,
      taxableAmount,
      taxAmount,
      totalBillAmount,
      tdsAmt,
      gstTdsAmt,
      retentionAmt,
      totalDeductions,
      netPayable,
      hasVariance,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const po = pos.find(p => p.id === formData.po_id);
    const grn = grns.find(g => g.id === formData.grn_id);
    if (!po || !grn) {
      showToast('Select valid PO and GRN reference', 'error');
      return;
    }

    const {
      evaluatedItems,
      taxableAmount,
      taxAmount,
      totalBillAmount,
      tdsAmt,
      gstTdsAmt,
      retentionAmt,
      netPayable,
      hasVariance,
    } = calculateMatchingEngine();

    const billId = `pb-${Date.now()}`;
    const matchStatus: PurchaseBill['matching_status'] = hasVariance
      ? 'VARIANCE_DETECTED'
      : 'MATCHED';

    const newBill: PurchaseBill = {
      id: billId,
      bill_number: formData.bill_number,
      bill_date: formData.bill_date,
      vendor_invoice_number: formData.vendor_invoice_number,
      vendor_invoice_date: formData.vendor_invoice_date,
      po_id: po.id,
      po_number: po.po_number,
      grn_id: grn.id,
      grn_number: grn.grn_number,
      vendor_id: po.vendor_id,
      vendor_name: po.vendor_name,
      project_id: po.project_id,
      project_name: po.project_name,
      taxable_amount: Number(taxableAmount.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      total_bill_amount: Number(totalBillAmount.toFixed(2)),
      tds_rate_percent: formData.tds_rate_percent,
      tds_amount: Number(tdsAmt.toFixed(2)),
      gst_tds_amount: Number(gstTdsAmt.toFixed(2)),
      retention_amount: Number(retentionAmt.toFixed(2)),
      advance_adjusted: Number(formData.advance_adjusted),
      net_payable_amount: Number(netPayable.toFixed(2)),
      matching_status: matchStatus,
      status: 'VERIFICATION_PENDING',
      current_approval_level: 1,
      remarks: formData.remarks,
      items: evaluatedItems.map(it => ({ ...it, bill_id: billId })),
      created_at: new Date().toISOString(),
    };

    await db.saveBill(newBill);
    showToast(
      `Purchase Bill ${newBill.bill_number} logged! 3-Way Status: ${matchStatus}. Net Payable: ${formatCurrency(netPayable)}`,
      hasVariance ? 'info' : 'success'
    );
    setIsCreateOpen(false);
    loadData();
  };

  const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'RETURN', comments: string) => {
    if (!selectedBill) return;
    await db.processApproval(
      'BILL',
      selectedBill.id,
      selectedBill.bill_number,
      selectedBill.current_approval_level,
      action,
      comments,
      user.id,
      user.full_name,
      currentRole
    );
    setIsApprovalOpen(false);
    loadData();
  };

  const handleViewAudit = async (bill: PurchaseBill) => {
    const logs = await db.getAuditLogs('BILL', bill.id);
    setAuditLogs(logs);
    setSelectedBill(bill);
    setIsAuditOpen(true);
  };

  const filteredBills = bills.filter(b => {
    if (selectedProjectId !== 'ALL' && b.project_id !== selectedProjectId) return false;
    if (activeTab === 'PENDING' && b.status === 'VERIFICATION_PENDING') return true;
    if (activeTab === 'MATCHED' && b.matching_status === 'MATCHED') return true;
    if (activeTab === 'DISCREPANT' && b.matching_status === 'VARIANCE_DETECTED') return true;
    if (activeTab !== 'ALL') return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        b.bill_number.toLowerCase().includes(q) ||
        b.vendor_invoice_number.toLowerCase().includes(q) ||
        b.vendor_name?.toLowerCase().includes(q) ||
        b.po_number.toLowerCase().includes(q)
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
            Purchase Bills & 3-Way Matching Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-audit PO vs GRN vs Vendor Tax Invoice, enforce tolerance parameters, compute statutory deductions (TDS, GST TDS, Retention), and authorize disbursements.
          </p>
        </div>

        {hasPermission('BILL', 'CREATE') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Book Vendor Bill (3-Way Match)
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {(['ALL', 'PENDING', 'MATCHED', 'DISCREPANT'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' && `All Bills (${bills.length})`}
              {tab === 'PENDING' && `Pending Approval (${bills.filter(b => b.status === 'VERIFICATION_PENDING').length})`}
              {tab === 'MATCHED' && `100% 3-Way Matched`}
              {tab === 'DISCREPANT' && `Variance Detected (${bills.filter(b => b.matching_status === 'VARIANCE_DETECTED').length})`}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bill, invoice no, supplier..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Invoice Ref</th>
                <th className="px-4 py-3">PO & GRN Link</th>
                <th className="px-4 py-3">Vendor / Project</th>
                <th className="px-4 py-3 text-right">Invoice Total</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Net Payable</th>
                <th className="px-4 py-3 text-center">3-Way Match</th>
                <th className="px-4 py-3 text-center">Approval</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No vendor purchase bills found.
                  </td>
                </tr>
              ) : (
                filteredBills.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                      {bill.bill_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-800">{bill.vendor_invoice_number}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(bill.vendor_invoice_date)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      <div className="text-slate-800">{bill.po_number}</div>
                      <div className="text-slate-400">{bill.grn_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{bill.vendor_name}</div>
                      <div className="text-[11px] text-slate-400">{bill.project_name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(bill.total_bill_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      -{formatCurrency((bill.tds_amount || 0) + (bill.advance_adjusted || 0) + (bill.retention_amount || 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                      {formatCurrency(bill.net_payable_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={bill.matching_status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={bill.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedBill(bill);
                          setIsDetailOpen(true);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        title="3-Way Match Breakdown & Booking Sheet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {['VERIFICATION_PENDING', 'SUBMITTED'].includes(bill.status) && hasPermission('BILL', 'APPROVE') && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setIsApprovalOpen(true);
                          }}
                          className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Authorize Disbursement"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}

                      {bill.matching_status === 'VARIANCE_DETECTED' && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setIsDebitNoteOpen(true);
                          }}
                          className="p-1 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="Raise Debit Note for Variance"
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleViewAudit(bill)}
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

      {/* Bill Detail & 3-Way Matching Engine Matrix Modal (Section 32, 34) */}
      {isDetailOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10 print:hidden">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  3-Way Matching Audit: {selectedBill.bill_number}
                </h3>
                <p className="text-xs text-slate-500">
                  PO: {selectedBill.po_number} • GRN: {selectedBill.grn_number} • Vendor: {selectedBill.vendor_name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Booking Voucher
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
                    { key: 'PR', label: 'PR Indent', isComplete: true },
                    { key: 'PO', label: 'PO Released', docNumber: selectedBill.po_number, isComplete: true },
                    { key: 'GRN', label: 'GRN Received', docNumber: selectedBill.grn_number, isComplete: true },
                    { key: 'BILL', label: 'Bill Matched', docNumber: selectedBill.bill_number, date: selectedBill.bill_date, isComplete: true },
                    { key: 'BILL', label: 'Bill Approved', isComplete: selectedBill.status === 'APPROVED' },
                    { key: 'PAYMENT', label: 'Payment Released', isComplete: selectedBill.status === 'PAID' },
                  ]}
                />
              </div>

              {/* 3-Way Match Verification Matrix Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tri-Partite Audit: PO Contract vs GRN Inward vs Vendor Invoice
                  </h4>
                  <StatusBadge status={selectedBill.matching_status} />
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2 text-right">PO Qty</th>
                        <th className="px-3 py-2 text-right text-emerald-700 font-bold">GRN Qty</th>
                        <th className="px-3 py-2 text-right font-bold text-blue-700">Inv Qty</th>
                        <th className="px-3 py-2 text-right">PO Rate</th>
                        <th className="px-3 py-2 text-right font-bold text-blue-700">Inv Rate</th>
                        <th className="px-3 py-2 text-right font-bold">Line Total</th>
                        <th className="px-3 py-2 text-center">Variance Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedBill.items?.map((it, idx) => {
                        const qtyDiff = it.invoice_quantity - it.grn_quantity;
                        const rateDiff = it.invoice_rate - it.po_rate;
                        const hasLineVariance = Math.abs(qtyDiff) > 0.001 || Math.abs(rateDiff) > 0.01;

                        return (
                          <tr key={idx} className={hasLineVariance ? 'bg-amber-50/50' : ''}>
                            <td className="px-3 py-2.5 font-medium text-slate-900">{it.item_name}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{it.po_quantity}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                              {it.grn_quantity}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                              {it.invoice_quantity}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(it.po_rate)}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.invoice_rate)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.total_amount)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {hasLineVariance ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3 mr-0.5" /> Qty Diff: {qtyDiff}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3 mr-0.5" /> 100% Match
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statutory Deductions & Net Disbursement Settlement Box (Section 34) */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                    Statutory & Contractual Deductions:
                  </span>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Base Value:</span>
                    <span className="font-mono font-semibold">{formatCurrency(selectedBill.taxable_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (Tax Component):</span>
                    <span className="font-mono font-semibold">{formatCurrency(selectedBill.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 pt-1 border-t border-slate-200">
                    <span>Less: TDS u/s 194Q ({selectedBill.tds_rate_percent}%):</span>
                    <span className="font-mono font-semibold">-{formatCurrency(selectedBill.tds_amount || 0)}</span>
                  </div>
                  {selectedBill.advance_adjusted > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Less: PO Mobilization Advance Adjusted:</span>
                      <span className="font-mono font-semibold">-{formatCurrency(selectedBill.advance_adjusted)}</span>
                    </div>
                  )}
                  {selectedBill.retention_amount > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Less: Contractual Retention Withheld:</span>
                      <span className="font-mono font-semibold">-{formatCurrency(selectedBill.retention_amount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-xs">Gross Invoice Commitment:</span>
                    <div className="text-base font-bold font-mono text-slate-900">
                      {formatCurrency(selectedBill.total_bill_amount)}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-blue-600 font-bold block text-xs">Net Authorizable Disbursement:</span>
                    <div className="text-xl font-extrabold font-mono text-blue-700">
                      {formatCurrency(selectedBill.net_payable_amount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Bill Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Book Vendor Invoice & Execute 3-Way Match
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Bill Reference No.</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.bill_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vendor Invoice No. *</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_invoice_number}
                    onChange={e => setFormData({ ...formData, vendor_invoice_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.vendor_invoice_date}
                    onChange={e => setFormData({ ...formData, vendor_invoice_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Accepted GRN *</label>
                  <select
                    required
                    value={formData.grn_id}
                    onChange={e => handleGrnSelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-blue-600"
                  >
                    <option value="">-- Choose Approved GRN --</option>
                    {grns.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.grn_number} - {g.vendor_name} (PO: {g.po_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PO Reference (Auto)</label>
                  <input
                    type="text"
                    readOnly
                    value={pos.find(p => p.id === formData.po_id)?.po_number || 'Select GRN'}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-600"
                  />
                </div>
              </div>

              {/* Items Matching Row */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <span className="font-bold text-slate-700 block">
                  Verify Line Items: Quantities & Invoiced Rates
                </span>

                <div className="space-y-2">
                  {billItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3 font-semibold text-slate-800">
                        {item.item_name}
                        <div className="text-[10px] text-slate-400 font-normal">
                          PO Qty: {item.po_quantity} | GRN Qty: {item.grn_accepted_quantity}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Invoiced Qty *</label>
                        <input
                          type="number"
                          required
                          value={item.invoice_quantity}
                          onChange={e => {
                            const copy = [...billItems];
                            copy[idx].invoice_quantity = Number(e.target.value);
                            setBillItems(copy);
                          }}
                          className="w-full border border-slate-200 rounded-md p-1 font-mono text-xs text-right font-medium"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">PO Rate (₹)</label>
                        <input
                          type="number"
                          readOnly
                          value={item.po_rate}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1 font-mono text-xs text-right text-slate-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Invoice Rate (₹) *</label>
                        <input
                          type="number"
                          required
                          value={item.invoice_rate}
                          onChange={e => {
                            const copy = [...billItems];
                            copy[idx].invoice_rate = Number(e.target.value);
                            setBillItems(copy);
                          }}
                          className="w-full border border-slate-200 rounded-md p-1 font-mono text-xs text-right font-medium"
                        />
                      </div>

                      <div className="col-span-3 text-right">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Line Total (₹)</label>
                        <div className="p-1 font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(
                            item.invoice_quantity * item.invoice_rate * (1 + item.gst_percent / 100)
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Config */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">TDS u/s 194Q (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tds_rate_percent}
                    onChange={e => setFormData({ ...formData, tds_rate_percent: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">GST TDS (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.gst_tds_rate_percent}
                    onChange={e => setFormData({ ...formData, gst_tds_rate_percent: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Retention (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.retention_percent}
                    onChange={e => setFormData({ ...formData, retention_percent: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Advance Adjusted (₹)</label>
                  <input
                    type="number"
                    value={formData.advance_adjusted}
                    onChange={e => setFormData({ ...formData, advance_adjusted: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
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
                  Execute 3-Way Match & Book Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Engine Action Modal */}
      {isApprovalOpen && selectedBill && (
        <ApprovalActionModal
          isOpen={isApprovalOpen}
          onClose={() => setIsApprovalOpen(false)}
          documentType="Purchase Bill"
          documentNumber={selectedBill.bill_number}
          documentAmount={selectedBill.net_payable_amount}
          currentLevel={selectedBill.current_approval_level}
          onActionComplete={handleApprovalAction}
        />
      )}

      {/* Debit Note Creation Modal (Section 33) */}
      {isDebitNoteOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-800">
                Issue Vendor Debit Note (DN)
              </h3>
              <button onClick={() => setIsDebitNoteOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                A Debit Note will be credited against {selectedBill.vendor_name}'s account ledger to offset invoice price or quantity variance.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono">
                <div>Debit Note Number: DN-2026-0032</div>
                <div>Bill Ref: {selectedBill.bill_number}</div>
                <div>Invoice: {selectedBill.vendor_invoice_number}</div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDebitNoteOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast(`Debit Note DN-2026-0032 posted to vendor ledger!`, 'success');
                    setIsDebitNoteOpen(false);
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold"
                >
                  Confirm Debit Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {isAuditOpen && selectedBill && (
        <AuditHistoryModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          recordId={selectedBill.id}
          auditLogs={auditLogs}
        />
      )}
    </div>
  );
};
