import { useEffect, useRef, useState } from 'react';
import useChat from '../hooks/useChat';
import Button from './ui/Button';

export default function ChatBox({ requestId }) {
  const { ready, messages, chatOpen, loading, error, typing, send, notifyTyping, me } =
    useChat(requestId);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length, typing]);

  async function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await send(body);
      setText('');
    } catch {
      /* the error is shown below */
    }
    setBusy(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
      <div ref={box} className="h-72 space-y-2 overflow-y-auto bg-slate-50 p-4">
        {loading && <p className="text-center text-sm text-slate-400">Loading chat…</p>}
        {ready && !messages.length && (
          <p className="text-center text-sm text-slate-400">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === me;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-100'
                }`}
              >
                {m.body}
              </p>
            </div>
          );
        })}
        {typing && <p className="text-xs italic text-slate-400">typing…</p>}
      </div>
      {error && <p className="bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {ready && !chatOpen && (
        <p className="bg-slate-100 px-4 py-3 text-center text-sm text-slate-500">
          Chat is closed for this request.
        </p>
      )}
      {ready && chatOpen && (
        <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 bg-white p-3">
          <input
            value={text}
            maxLength={2000}
            placeholder="Type a message…"
            onChange={(e) => {
              setText(e.target.value);
              notifyTyping();
            }}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />
          <Button type="submit" loading={busy}>Send</Button>
        </form>
      )}
    </div>
  );
}