import { getUnreadCount, listNotifications } from '../../api/notifications';
import { getSocket } from '../../socket/socket';

const show = (label) => (d) => console.log(label, JSON.stringify(d, null, 2));
const fail = (e) => console.log('ERR', e.status, e.errorCode, e.message);

export default function ProbeNotif() {
  const run = () => {
    getUnreadCount().then(show('COUNT')).catch(fail);
    listNotifications().then(show('LIST')).catch(fail);
    getSocket()?.on('notification:new', show('SOCKET notification:new'));
    getSocket()?.on('notification:count', show('SOCKET notification:count'));
    console.log('Listening for socket events...');
  };
  return (
    <main className="p-6">
      <button onClick={run} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Run notification probe</button>
    </main>
  );
}