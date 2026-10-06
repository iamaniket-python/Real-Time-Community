import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { roleHome } from '../../routes/rolehome';
import AuthLayout from '../../components/AuthLayout';

const input = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100';

export default function SellerRegisterPage() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ ...form, role: 'SELLER' });
    } catch (err) {
      const d = err.details?.map((x) => x.message).join(', ');
      setError(d || err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Open your shop" subtitle="Register as a seller. You add shop details and documents after login.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Your full name
          <input className={input} autoComplete="name" value={form.name} onChange={set('name')} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Email
          <input className={input} type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Phone
          <input className={input} type="tel" autoComplete="tel" placeholder="+919876543210" value={form.phone} onChange={set('phone')} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Password
          <input className={input} type="password" autoComplete="new-password" minLength={10} maxLength={72} value={form.password} onChange={set('password')} required />
          <span className="mt-1 block text-xs font-normal text-slate-400">10-72 characters, with at least one letter and one digit.</span>
        </label>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:brightness-110 disabled:opacity-60">
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {busy ? 'Creating account...' : 'Create seller account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Already a seller? <Link to="/seller/login" className="font-semibold text-indigo-600 hover:underline">Login</Link></p>
    </AuthLayout>
  );
}