import React from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, X } from 'lucide-react';

export type ConfirmationType = 'deliver' | 'cancel' | 'reset';

interface ConfirmationModalProps {
  isOpen: boolean;
  type: ConfirmationType;
  title: string;
  message: string;
  confirmLabel: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type,
  title,
  message,
  confirmLabel,
  confirmButtonClass,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'deliver':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'cancel':
        return (
          <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'reset':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
        );
    }
  };

  const defaultButtonClass =
    type === 'cancel'
      ? 'bg-rose-500 hover:bg-rose-600 text-white'
      : type === 'deliver'
      ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold'
      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex items-start gap-4">
          {getIcon()}
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Cancel confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Keep As Is
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs rounded-lg transition-colors ${
              confirmButtonClass || defaultButtonClass
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
