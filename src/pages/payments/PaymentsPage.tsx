import React, { useState, useEffect } from 'react';
import {
  Plus, Search, CreditCard, CheckCircle2, Eye, Printer,
  DollarSign, Receipt, Building2, Calendar, FileText, ArrowUpRight
} from 'lucide-react';
import { db } from '../../lib/db';
import { Payment, PurchaseBill, PurchaseOrder, Vendor, Project } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const PaymentsPage: React.FC = () => {
  const { user, hasPermission, selectedProjectId } = useAuth();
  const { showToast } = useNotifications();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // View state
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    payment_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'BILL_PAYMENT' as Payment['payment_type'],
    bill_id: '',
    po_id: '',
    vendor_id: '',
    project_id: '',
    payment_mode: 'RTGS' as Payment['payment_mode'],
    bank_name: 'HDFC Bank - Commercial Escrow Account (A/c: 50200049182)',
    reference_number: `UTR${Date.now().toString().slice(-8)}`,
    amount_paid: 0,
    remarks: 'Disbursed against approved 3-way matched invoice.',
  });

  const loadData = async () => {
    const [payList, bList, poList, vendList, projList] = await Promise.all([
      db.getPayments(),
      db.getBills(),
      db.getPOs(),
      db.getVendors(),
      db.getProjects(),
    ]);
    setPayments(payList);
    setBills(bList);
    setPos(poList);
    setVendors(vendList);
    setProjects(projList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    const nextNumber = `PAY-2026-${(payments.length + 1).toString().padStart(4, '0')}`;
    const approvedBill = bills.find(b => b.status === 'APPROVED') || bills[0];

    setFormData({
      payment_number: nextNumber,
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'BILL_PAYMENT',
      bill_id: approvedBill?.id || '',
      po_id: approvedBill?.po_id || '',
      vendor_id: approvedBill?.vendor_id || vendors[0]?.id || '',
      project_id: approvedBill?.project_id || projects[0]?.id || '',
      payment_mode: 'RTGS',
      bank_name: 'HDFC Bank - BKC Infrastructure A/c 50200088912',
      reference_number: `HDFCR52026${Date.now().toString().slice(-6)}`,
      amount_paid: approvedBill ? approvedBill.net_payable_amount : 100000,
      remarks: 'Settlement processed as per credit terms.',
    });
    setIsCreateOpen(true);
  };

  const handleBillSelect = (billId: string) => {
    const b = bills.find(x => x.id === billId);
    if (!b) return;
    setFormData(prev => ({
      ...prev,
      bill_id: billId,
      po_id: b.po_id,
      vendor_id: b.vendor_id,
      project_id: b.project_id,
      amount_paid: b.net_payable_amount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vend = vendors.find(v => v.id === formData.vendor_id);
    const proj = projects.find(p => p.id === formData.project_id);
    const bill = bills.find(b => b.id === formData.bill_id);

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      payment_number: formData.payment_number,
      payment_date: formData.payment_date,
      payment_type: formData.payment_type,
      bill_id: formData.bill_id || undefined,
      bill_number: bill?.bill_number,
      po_id: formData.po_id || undefined,
      vendor_id: formData.vendor_id,
      vendor_name: vend?.vendor_name,
      project_id: formData.project_id,
      project_name: proj?.project_name,
      payment_mode: formData.payment_mode,
      bank_name: formData.bank_name,
      reference_number: formData.reference_number,
      amount_paid: Number(formData.amount_paid),
      status: 'PROCESSED',
      remarks: formData.remarks,
      created_by_id: user.id,
      created_by_name: user.full_name,
      created_at: new Date().toISOString(),
    };

    await db.savePayment(newPayment);
    showToast(`Payment Advice ${newPayment.payment_number} generated for ${formatCurrency(newPayment.amount_paid)}!`, 'success');
    setIsCreateOpen(false);
    loadData();
  };

  const filteredPayments = payments.filter(p => {
    if (selectedProjectId !== 'ALL' && p.project_id !== selectedProjectId) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.payment_number.toLowerCase().includes(q) ||
        p.vendor_name?.toLowerCase().includes(q) ||
        p.reference_number?.toLowerCase().includes(q) ||
        p.bill_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalDisbursed = filteredPayments.reduce((acc, p) => acc + p.amount_paid, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Payment Processing & Remittance Advice
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Disburse verified vendor bills, mobilization advances, record banking UTRs, and print remittance slips.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500">Total Disbursed:</span>{' '}
            <span className="font-mono font-bold text-emerald-700">{formatCurrency(totalDisbursed)}</span>
          </div>

          {hasPermission('PAYMENT', 'CREATE') && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Process Payment
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search voucher no, vendor, UTR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Disbursements Logged: <span className="font-bold text-slate-800">{filteredPayments.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Voucher Number</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-4 py-3">Supplier / Beneficiary</th>
                <th className="px-4 py-3">Bill / PO Reference</th>
                <th className="px-4 py-3">Mode & Bank</th>
                <th className="px-4 py-3">UTR / Transaction Ref</th>
                <th className="px-4 py-3 text-right">Amount Disbursed</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map(pay => (
                <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{pay.payment_number}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(pay.payment_date)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{pay.vendor_name}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-slate-800">{pay.bill_number || 'Advance PO'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-800">{pay.payment_mode}</span>
                    <div className="text-[10px] text-slate-400 truncate max-w-xs">{pay.bank_name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{pay.reference_number}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(pay.amount_paid)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={pay.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedPayment(pay);
                        setIsDetailOpen(true);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                      title="View Remittance Advice"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Advice / Remittance Slip Modal */}
      {isDetailOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
              <h3 className="text-sm font-bold text-slate-800">
                Payment Remittance Advice: {selectedPayment.payment_number}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Advice
                </button>
                <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">CivProcure Infrastructure Pvt. Ltd.</h4>
                    <p className="text-[11px] text-slate-500">Corporate Accounts & Treasury Division</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-blue-700 text-xs">{selectedPayment.payment_number}</span>
                    <div className="text-[11px] text-slate-400">Date: {formatDate(selectedPayment.payment_date)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Beneficiary Supplier</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedPayment.vendor_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Electronic Transaction UTR / Ref</span>
                    <span className="font-mono font-bold text-slate-900">{selectedPayment.reference_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Disbursing Bank Account</span>
                    <span className="font-medium text-slate-800">{selectedPayment.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Disbursement Mode</span>
                    <span className="font-bold text-emerald-700">{selectedPayment.payment_mode}</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Total Transferred Sum:</span>
                  <span className="text-lg font-mono font-extrabold text-blue-700">
                    {formatCurrency(selectedPayment.amount_paid)}
                  </span>
                </div>
              </div>

              {selectedPayment.remarks && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                  <span className="font-semibold">Voucher Narration:</span> {selectedPayment.remarks}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Payment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Execute Supplier Payment Disbursement
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Voucher Number</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.payment_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Select Purchase Bill to Clear *</label>
                <select
                  required
                  value={formData.bill_id}
                  onChange={e => handleBillSelect(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-blue-600"
                >
                  <option value="">-- Choose Approved Bill --</option>
                  {bills.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bill_number} - {b.vendor_name} (Net Payable: {formatCurrency(b.net_payable_amount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={e => setFormData({ ...formData, payment_mode: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold"
                  >
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="UPI">UPI / IMPS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Amount to Pay (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount_paid}
                    onChange={e => setFormData({ ...formData, amount_paid: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Disbursing Company Bank</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">UTR / Cheque Ref Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.reference_number}
                    onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Payment Narration</label>
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
                  Confirm & Disburse Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
