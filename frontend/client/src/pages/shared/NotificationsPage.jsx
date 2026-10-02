import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationItem from '../../components/NotificationItem';
import Footer from '../../components/Footer';

const HOME = { ADMIN: '/admin', HELPER: '/helper' };

export default function NotificationsPage() {
  const { user } = useAuth();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { items, loading, error, hasMore, loadMore, read, readAll } = useNotifications(unreadOnly);

  const tab = (on) => `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
    on ? 'bg-white text-indigo-600 shadow' : 'text-indigo-100 hover:bg-white/10'}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-white">
      <header className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 pb-20 pt-8 text-white">
        <div className="mx-auto max-w-2xl">
          <Link to={HOME[user.role] || '/user'} className="text-sm font-semibold text-indigo-100 hover:text-white">← Home</Link>
          <div className="mt-4 flex items-end justify-between gap-4">
            <h1 className="text-3xl font-bold sm:text-4xl">Notifications</h1>
            <button onClick={readAll} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              Mark all read
            </button>
          </div>
          <div className="mt-5 inline-flex gap-1 rounded-full bg-white/15 p-1">
            <button onClick={() => setUnreadOnly(false)} className={tab(!unreadOnly)}>All</button>
            <button onClick={() => setUnreadOnly(true)} className={tab(unreadOnly)}>Unread</button>
          </div>
        </div>
      </header>

      <section className="mx-auto -mt-10 max-w-2xl px-4">
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow-xl shadow-indigo-100/60">Loading...</p>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100">
            <p className="text-4xl">🔔</p>
            <p className="mt-2 font-semibold text-slate-700">{unreadOnly ? "You're all caught up" : 'No notifications yet'}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => <NotificationItem key={n.id} n={n} onOpen={read} onMarkRead={read} />)}
          </ul>
        )}
        {hasMore && !loading && (
          <button onClick={loadMore} className="mt-5 w-full rounded-2xl bg-white py-3 font-semibold text-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-slate-100 transition hover:bg-indigo-50">
            Load more
          </button>
        )}
      </section>
      <Footer />
    </main>
  );
}