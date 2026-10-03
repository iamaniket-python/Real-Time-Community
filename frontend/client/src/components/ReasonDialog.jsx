import { useEffect, useRef, useState } from 'react';

function DialogBody({ title, message, label, placeholder, confirmText, tone, required, hideInput, initialValue, rows, onConfirm, onCancel }) {
  const [reason, setReason] = useState(initialValue || '');
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select?.();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const danger = tone === 'danger';
  const disabled = !hideInput && required && !reason.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
            danger ? 'bg-red-50' : 'bg-indigo-50'
          }`}
        >
          {danger ? '⚠️' : '✅'}
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
        {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}

        {!hideInput && (
          <label className="mt-4 block text-sm font-medium text-slate-700">
            {label}
            <textarea
              ref={ref}
              rows={rows}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onConfirm(reason.trim())}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50 ${
              danger
                ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-200'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReasonDialog({
  open,
  title = 'Are you sure?',
  message = '',
  label = 'Reason (optional)',
  placeholder = 'Write a short reason...',
  confirmText = 'Confirm',
  tone = 'primary',
  required = false,
  hideInput = false,
  initialValue = '',
  rows = 3,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <DialogBody
      title={title}
      message={message}
      label={label}
      placeholder={placeholder}
      confirmText={confirmText}
      tone={tone}
      required={required}
      hideInput={hideInput}
      initialValue={initialValue}
      rows={rows}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}