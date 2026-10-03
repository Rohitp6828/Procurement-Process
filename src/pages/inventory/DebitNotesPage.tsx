import React, { useState, useEffect } from 'react';
import { Search, AlertOctagon, Printer, CheckCircle2, Eye, ShieldAlert, ArrowDownRight } from 'lucide-react';
import { db } from '../../lib/db';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';

export const DebitNotesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debitNotes, setDebitNotes] = useState([
    {
      id: 'dn-1',
      debit_note_number: 'DN-2026-0012',
      date: '2026-03-22',
      vendor_name: 'Tata Steel Tubes & Pipes Division',
      bill_ref: 'PB-2026-0004',
      reason: 'Rate discrepancy: Invoiced rate ₹68,500/MT vs PO agreed rate ₹65,000/MT',
      taxable_amount: 52500,
      gst_amount: 9450,
      total_amount: 61950,
      status: 'POSTED',
    },
    {
      id: 'dn-2',
      debit_note_number: 'DN-2026-0013',
      date: '2026-03-24',
      vendor_name: 'UltraTech Cement Ltd (RMC Unit)',
      bill_ref: 'PB-2026-0005',
      reason: 'Physical shortage & transit burst: 18 bags rejected during QC inspection',
      taxable_amount: 6300,
      gst_amount: 1764,
      total_amount: 8064,
      status: 'POSTED',
    },
  ]);

  const filtered = debitNotes.filter(
    d =>
      d.debit_note_number.toLowerCase().includes(search.toLowerCase()) ||
      d.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
      d.bill_ref.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Supplier Debit Notes & Variance Adjustments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit adjustments issued against supplier invoices for rejected materials, transit damages, or price variances.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search debit note, supplier, bill..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total Notes: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Debit Note No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Bill Reference</th>
                <th className="px-4 py-3">Reason / Discrepancy</th>
                <th className="px-4 py-3 text-right">Debit Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(dn => (
                <tr key={dn.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-rose-600">{dn.debit_note_number}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(dn.date)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{dn.vendor_name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-blue-600">{dn.bill_ref}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-sm">{dn.reason}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-700 text-sm">
                    {formatCurrency(dn.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {dn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
