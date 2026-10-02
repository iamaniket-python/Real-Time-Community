import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { roleHome } from '../../routes/rolehome';
import AuthLayout from '../../components/AuthLayout';

const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form);
    } catch (err) {
      const d = err.details?.map((x) => x.message).join(', ');
      setError(d || err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to request or offer help.">
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium text-slate-700">Email
          <input className={`${input} mt-1.5`} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Password
          <div className="relative mt-1.5">
            <input className={`${input} pr-16`} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••••" value={form.password} onChange={set('password')} required />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800">{show ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:brightness-110 disabled:opacity-60">
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {busy ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Account nahi hai? <Link to="/register" className="font-semibold text-indigo-600 hover:underline">Register</Link></p>
    </AuthLayout>
  );
}