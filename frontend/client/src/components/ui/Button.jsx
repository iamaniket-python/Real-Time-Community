const VARIANTS = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:from-indigo-500 hover:to-violet-500',
  secondary:
    'bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50',
  danger: 'bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-500',
  ghost: 'text-slate-600 hover:bg-slate-100',
};

export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}