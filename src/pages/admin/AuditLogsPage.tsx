import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, History, Filter, Download, User, Calendar, FileText } from 'lucide-react';
import { db } from '../../lib/db';
import { AuditLog } from '../../types';
import { formatDate } from '../../lib/utils';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    db.getAuditLogs().then(data => setLogs(data));
  }, []);

  const filtered = logs.filter(log => {
    if (filterType !== 'ALL' && log.document_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.document_number.toLowerCase().includes(q) ||
        log.user_name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.comments?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Enterprise Audit Trail & Governance Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, sequential transaction logs for SOX & Statutory compliance across every requisition, purchase order, GRN, bill approval, and disbursement.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
          Total Recorded Actions: <span className="text-slate-900 font-bold">{logs.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search document no, user, action..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Documents</option>
              <option value="PR">Purchase Requisition</option>
              <option value="RFQ">RFQ / Quotation</option>
              <option value="PO">Purchase Order</option>
              <option value="GRN">Goods Received Note</option>
              <option value="BILL">Purchase Bill (3-Way)</option>
              <option value="PAYMENT">Payment Voucher</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Document Type</th>
                <th className="px-4 py-3">Document Number</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User & Authority Role</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Audit Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-sans">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span className="font-sans px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {log.document_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{log.document_number}</td>
                  <td className="px-4 py-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action.includes('APPROVE')
                          ? 'bg-emerald-100 text-emerald-700'
                          : log.action.includes('REJECT')
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <div className="font-semibold text-slate-900">{log.user_name}</div>
                    <div className="text-[10px] text-slate-400">{log.user_role}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    {log.approval_level ? `L${log.approval_level}` : '-'}
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-600 max-w-xs truncate">
                    {log.comments || 'System logged transaction'}
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
