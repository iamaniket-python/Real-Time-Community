import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { roleHome } from '../../routes/rolehome';
import AuthLayout from '../../components/AuthLayout';

const input = 'w-full rounded-xl border border-petal bg-blush/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-rosewood focus:bg-white focus:ring-4 focus:ring-petal';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (user) {
    const from = location.state?.from?.pathname;
    return <Navigate to={from || roleHome(user.role)} replace />;
  }

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
    <AuthLayout variant="user" title="Welcome back" subtitle="Log in to request or offer help.">
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium text-ink">Email
          <input className={`${input} mt-1.5`} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
        </label>
        <label className="block text-sm font-medium text-ink">Password
          <div className="relative mt-1.5">
            <input className={`${input} pr-16`} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••••" value={form.password} onChange={set('password')} required />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-4 text-sm font-semibold text-rosewood hover:text-rosewood-dark">{show ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rosewood py-3 font-semibold text-white shadow-lg shadow-petal transition hover:bg-rosewood-dark disabled:opacity-60">
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {busy ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">Account nahi hai? <Link to="/register" className="font-semibold text-rosewood hover:underline">Register</Link></p>
      <p className="mt-2 text-center text-xs text-ink-soft">Selling something? <Link to="/seller/login" className="font-semibold text-rosewood hover:underline">Seller login</Link></p>
    </AuthLayout>
  );
}