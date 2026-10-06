import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { roleHome } from '../../routes/rolehome';

const btnPrimary =
  'rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:opacity-90';
const btnGhost =
  'rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-indigo-700 ring-1 ring-slate-200 transition hover:bg-indigo-50';

const steps = [
  { n: '1', title: 'Post a request', text: 'Describe what you need help with and where you are.' },
  { n: '2', title: 'Nearby helpers respond', text: 'Verified helpers close to you get your request in real time.' },
  { n: '3', title: 'Track and chat', text: 'Follow progress live, chat with your helper and rate the help.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;
  const guest = !loading && !user;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-violet-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-extrabold text-indigo-700">
          HelpNow
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn && (
            <Link to={roleHome(user.role)} className={btnPrimary}>
              Open dashboard
            </Link>
          )}
          {guest && (
            <>
              <Link to="/login" className={btnGhost}>
                Login
              </Link>
              <Link to="/register" className={btnPrimary}>
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-12 text-center sm:py-20">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Help is just{' '}
            <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              around the corner
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
            Post what you need and verified helpers nearby respond in real time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/requests/new" className={btnPrimary}>
              Request help
            </Link>
            {guest && (
              <Link to="/register" className={btnGhost}>
                Create account
              </Link>
            )}
          </div>
          {guest && (
            <p className="mt-4 text-xs text-slate-500">You need to log in to post a request.</p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-3xl bg-white p-6 shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="pb-8 text-center text-xs text-slate-400">HelpNow</footer>
    </div>
  );
}