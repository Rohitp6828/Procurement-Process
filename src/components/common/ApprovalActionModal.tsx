import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatCurrency } from '../../lib/utils';

interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: string;
  documentNumber: string;
  documentAmount?: number;
  currentLevel?: number;
  onActionComplete: (action: 'APPROVE' | 'REJECT' | 'RETURN', comments: string) => Promise<void>;
}

export const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentNumber,
  documentAmount,
  currentLevel = 1,
  onActionComplete,
}) => {
  const { user, currentRole } = useAuth();
  const { showToast } = useNotifications();
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | 'RETURN'>('APPROVE');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((action === 'REJECT' || action === 'RETURN') && !comments.trim()) {
      showToast('Mandatory comments required for rejection or return.', 'error');
      return;
    }

    try {
      setLoading(true);
      await onActionComplete(action, comments);
      showToast(
        `${documentType} ${documentNumber} ${action === 'APPROVE' ? 'Approved successfully' : action === 'REJECT' ? 'Rejected' : 'Returned for revision'}.`,
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to process approval action.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Workflow Authorization Decision
            </h3>
            <p className="text-xs text-slate-500">
              {documentType} • <span className="font-mono font-medium">{documentNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Approver:</span>{' '}
              <span className="font-medium text-slate-800">{user.full_name}</span>
            </div>
            <div>
              <span className="text-slate-500">Tier Role:</span>{' '}
              <span className="font-mono font-medium text-blue-600">{currentRole}</span>
            </div>
          </div>

          {documentAmount !== undefined && (
            <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
              <span className="text-slate-500">Transaction Value:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(documentAmount)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Select Decision
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction('APPROVE')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  action === 'APPROVE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mb-1 text-emerald-600" />
                Approve
              </button>

              <button
                type="button"
                onClick={() => setAction('RETURN')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  action === 'RETURN'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <RotateCcw className="w-5 h-5 mb-1 text-amber-600" />
                Return
              </button>

              <button
                type="button"
                onClick={() => setAction('REJECT')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  action === 'REJECT'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <XCircle className="w-5 h-5 mb-1 text-rose-600" />
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Approver Remarks & Comments {action !== 'APPROVE' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder={
                action === 'APPROVE'
                  ? 'Optional approval justification / remarks...'
                  : 'Specify reason for rejection or return for modification...'
              }
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors shadow-xs ${
                action === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : action === 'RETURN'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {loading ? 'Processing...' : `Confirm ${action}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
