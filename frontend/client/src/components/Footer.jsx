export default function Footer() {
  return (
    <footer className="mt-16 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
        <div className="flex flex-col items-center justify-between gap-2 py-6 text-sm text-slate-500 sm:flex-row">
          <span className="font-semibold text-indigo-600">Community Help</span>
          <span>
            Developed with <span className="text-rose-500">♥</span> by{' '}
            <span className="font-semibold text-slate-700">Aniket Shrivastava</span>
          </span>
          <span>© {new Date().getFullYear()} All rights reserved</span>
        </div>
      </div>
    </footer>
  );
}