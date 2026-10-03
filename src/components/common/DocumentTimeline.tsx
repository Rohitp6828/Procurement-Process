import React from 'react';
import {
  FileText, CheckCircle2, Send, MessageSquare, Layers,
  ShoppingBag, Truck, Receipt, CreditCard, ArrowRight,
  Clock, AlertCircle
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

export interface TimelineStep {
  key: string;
  label: string;
  docNumber?: string;
  date?: string;
  status?: string;
  isCurrent?: boolean;
  isComplete?: boolean;
}

interface DocumentTimelineProps {
  steps: TimelineStep[];
  onStepClick?: (step: TimelineStep) => void;
}

export const DocumentTimeline: React.FC<DocumentTimelineProps> = ({ steps, onStepClick }) => {
  const getIcon = (key: string) => {
    switch (key) {
      case 'PR':
        return <FileText className="w-4 h-4" />;
      case 'RFQ':
        return <Send className="w-4 h-4" />;
      case 'QUOTATION':
        return <MessageSquare className="w-4 h-4" />;
      case 'COMPARISON':
        return <Layers className="w-4 h-4" />;
      case 'PO':
        return <ShoppingBag className="w-4 h-4" />;
      case 'ADVANCE':
        return <CreditCard className="w-4 h-4" />;
      case 'GRN':
        return <Truck className="w-4 h-4" />;
      case 'BILL':
        return <Receipt className="w-4 h-4" />;
      case 'POSTING':
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Procurement Document Lifecycle
        </h4>
        <span className="text-xs text-slate-400">Click any step to inspect linked documents</span>
      </div>

      <div className="flex items-center min-w-max space-x-2 py-2">
        {steps.map((step, idx) => {
          const isComplete = step.isComplete || Boolean(step.docNumber && step.status !== 'REJECTED');
          const isCurrent = step.isCurrent;

          return (
            <React.Fragment key={step.key}>
              <div
                onClick={() => onStepClick && onStepClick(step)}
                className={`flex items-center p-2 rounded-lg border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                    : isComplete
                    ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mr-2.5 ${
                    isComplete
                      ? 'bg-emerald-100 text-emerald-700'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {getIcon(step.key)}
                </div>

                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {step.label}
                  </div>
                  {step.docNumber ? (
                    <div className="text-[11px] font-mono text-blue-600 font-medium">
                      {step.docNumber}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400">Not Initiated</div>
                  )}
                  {step.date && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(step.date)}
                    </div>
                  )}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
