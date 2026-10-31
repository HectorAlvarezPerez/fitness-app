import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,8,15,0.62)] p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-[1.5rem] border border-[rgba(73,133,214,0.16)] bg-[rgba(9,18,31,0.98)] p-6 shadow-xl animate-in duration-300 fade-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start gap-4">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
              isDanger ? 'bg-red-500/12 text-red-300' : 'bg-[rgba(47,140,255,0.14)] text-[#4ea0ff]'
            }`}
          >
            <span className="material-symbols-outlined">{isDanger ? 'warning' : 'help'}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-[1rem] border border-[rgba(73,133,214,0.16)] bg-[rgba(16,30,47,0.78)] px-4 py-3 font-semibold text-slate-300"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-[1rem] px-4 py-3 font-bold ${
              isDanger
                ? 'bg-red-600 text-white'
                : 'bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] text-white shadow-lg shadow-[#2f8cff]/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
