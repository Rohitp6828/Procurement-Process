import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStyle = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'APPROVED':
      case 'ACCEPTED':
      case 'FULLY_RECEIVED':
      case 'MATCHED':
      case 'POSTED':
      case 'ACTIVE':
      case 'PAID':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'PENDING_APPROVAL':
      case 'UNDER_REVIEW':
      case 'REQUESTED':
      case 'SUBMITTED':
      case 'SENT':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'PARTIALLY_RECEIVED':
      case 'PARTIALLY_ORDERED':
      case 'PARTIALLY_PAID':
      case 'PARTIALLY_RESPONDED':
      case 'PARTIALLY_ACCEPTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'REJECTED':
      case 'CANCELLED':
      case 'BLOCKED':
      case 'EXCESS_BILLING':
      case 'QTY_MISMATCH':
      case 'RATE_MISMATCH':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      case 'CLOSED':
      case 'EXPIRED':
      case 'INACTIVE':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const label = status?.replace(/_/g, ' ') || 'UNKNOWN';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyle(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {label}
    </span>
  );
};
