import React from 'react';
import { X, History, User, Clock, ArrowRight } from 'lucide-react';
import { AuditLog } from '../../types';
import { formatDateTime } from '../../lib/utils';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId?: string;
  auditLogs: AuditLog[];
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  onClose,
  recordId,
  auditLogs,
}) => {
  if (!isOpen) return null;

  const filteredLogs = recordId
    ? auditLogs.filter(log => log.record_id === recordId)
    : auditLogs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Transaction Audit Trail & History
              </h3>
              {recordId && (
                <p className="text-xs text-slate-500 font-mono">
                  Document Reference: {recordId}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No audit logs recorded for this document yet.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-800">{log.action}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                      {log.module}
                    </span>
                    <span className="font-mono text-blue-600">{log.record_id}</span>
                  </div>
                  <div className="flex items-center text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {formatDateTime(log.timestamp)}
                  </div>
                </div>

                <div className="flex items-center text-xs text-slate-500 mt-1">
                  <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <span>{log.user_name || log.user_email}</span>
                  {log.user_role && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded-sm">
                      {log.user_role}
                    </span>
                  )}
                </div>

                {log.old_value && log.new_value && (
                  <div className="mt-2 text-xs bg-slate-50 p-2 rounded-md border border-slate-200 font-mono text-[11px] overflow-x-auto">
                    <div className="flex items-center text-slate-600">
                      <span className="text-rose-600">
                        {typeof log.old_value === 'object' ? JSON.stringify(log.old_value) : log.old_value}
                      </span>
                      <ArrowRight className="w-3 h-3 mx-2 text-slate-400 shrink-0" />
                      <span className="text-emerald-600">
                        {typeof log.new_value === 'object' ? JSON.stringify(log.new_value) : log.new_value}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
