import { useAuth } from '../../context/auth-context';
import HomeHeader from '../../components/HomeHeader';
import ActionCard from '../../components/ActionCard';
import Footer from '../../components/Footer';

const CONTENT = {
  USER: {
    subtitle: 'Need a hand? Nearby helpers are ready.',
    cards: [
      { icon: '🆘', title: 'Ask for help', text: 'Post a request and get matched with a nearby helper.', to: '/requests/new' },
      { icon: '📋', title: 'My requests', text: 'Track status, chat and rate your helper.', to: '/requests' },
      { icon: '🔔', title: 'Notifications', text: 'See every update in one place.', to: '/notifications' },
    ],
  },
  HELPER: {
    subtitle: 'Go online and help people around you.',
    cards: [
      { icon: '🟢', title: 'Availability', text: 'Go online and share your live location.', to: '/helper' },
      { icon: '📥', title: 'Incoming requests', text: 'Accept nearby requests that match you.', to: '/helper' },
      { icon: '🧰', title: 'My jobs', text: 'Update progress and review past jobs.', to: '/helper/jobs' },
    ],
  },
  ADMIN: {
    subtitle: 'Keep the community safe and running.',
    cards: [
      { icon: '✅', title: 'Verify helpers', text: 'Review and approve helper applications.', to: '/admin/helpers' },
      { icon: '🚩', title: 'Reports', text: 'Handle user reports and moderation.', to: '/admin/reports' },
      { icon: '📊', title: 'Stats and audit log', text: 'Platform activity at a glance.', to: '/admin/stats' },
    ],
  },
};

export default function HomePage() {
  const { user } = useAuth();
  const { subtitle, cards } = CONTENT[user.role] || CONTENT.USER;

  return (
    <main className="bg-gradient-to-b from-indigo-50 via-slate-50 to-white">
      <HomeHeader subtitle={subtitle} />
      <section className="mx-auto -mt-16 grid max-w-5xl gap-5 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => <ActionCard key={c.title} {...c} />)}
      </section>
      <Footer />
    </main>
  );
}