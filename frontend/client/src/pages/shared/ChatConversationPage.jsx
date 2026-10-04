import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import ChatBox from '../../components/ChatBox';

export default function ChatConversationPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const backTo = user.role === 'ADMIN' ? '/admin/helpers' : '/helper';
  const title = user.role === 'ADMIN' ? 'Chat with helper' : 'Admin support';

  const back = (
    <Link to={backTo} className="text-sm font-medium text-indigo-100 hover:text-white">
      ← Back
    </Link>
  );

  return (
    <PageShell title={title} subtitle="This conversation stays open." action={back} narrow>
      <Card className="!p-3 sm:!p-6 [&_.h-72]:!h-[55vh] sm:[&_.h-72]:!h-96">
        <ChatBox conversationId={conversationId} />
      </Card>
    </PageShell>
  );
}