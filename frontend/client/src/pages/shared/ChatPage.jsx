import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import PageShell from '../../components/ui/PageShell';
import Card from '../../components/ui/Card';
import ChatBox from '../../components/ChatBox';

export default function ChatPage() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const backTo = user.role === 'HELPER' ? '/helper/jobs' : `/requests/${requestId}`;

  const back = (
    <Link to={backTo} className="text-sm font-medium text-indigo-100 hover:text-white">
      ← Back
    </Link>
  );

  return (
    <PageShell title="Chat" subtitle="Messages are only open while the job is active." action={back} narrow>
      <Card>
        <ChatBox requestId={requestId} />
      </Card>
    </PageShell>
  );
}