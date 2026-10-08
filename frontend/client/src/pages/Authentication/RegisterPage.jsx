import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { roleHome } from '../../routes/rolehome';
import AuthLayout from '../../components/AuthLayout';

const input = 'mt-1.5 w-full rounded-xl border border-petal bg-blush/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-rosewood focus:bg-white focus:ring-4 focus:ring-petal';
const roles = [['USER', '🙋 I need help'], ['HELPER', '🤝 I want to help']];

export default function RegisterPage() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'USER' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = { ...form };
    if (!body.phone.trim()) delete body.phone;
    try {
      await register(body);
    } catch (err) {
      const d = err.details?.map((x) => x.message).join(', ');
      setError(d || err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout variant="user" title="Create account" subtitle="Join your community in under a minute.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {roles.map(([v, label]) => (
            <button key={v} type="button" onClick={() => setForm({ ...form, role: v })}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${form.role === v ? 'border-rosewood bg-blush text-rosewood' : 'border-petal text-ink-soft hover:border-rosewood/60'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium text-ink">Full name
          <input className={input} autoComplete="name" value={form.name} onChange={set('name')} required />
        </label>
        <label className="block text-sm font-medium text-ink">Email
          <input className={input} type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </label>
        <label className="block text-sm font-medium text-ink">Phone <span className="font-normal text-ink-soft">(optional)</span>
          <input className={input} type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        </label>
        <label className="block text-sm font-medium text-ink">Password
          <div className="relative">
            <input className={`${input} pr-16`} type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={72} value={form.password} onChange={set('password')} required />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-4 text-sm font-semibold text-rosewood hover:text-rosewood-dark">{show ? 'Hide' : 'Show'}</button>
          </div>
          <span className="mt-1 block text-xs font-normal text-ink-soft">10-72 characters, with at least one letter and one digit.</span>
        </label>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rosewood py-3 font-semibold text-white shadow-lg shadow-petal transition hover:bg-rosewood-dark disabled:opacity-60">
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">Already registered? <Link to="/login" className="font-semibold text-rosewood hover:underline">Login</Link></p>
    </AuthLayout>
  );
}