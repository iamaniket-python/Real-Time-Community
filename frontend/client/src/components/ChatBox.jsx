import { useEffect, useRef, useState } from 'react';
import useChat from '../hooks/useChat';
import Button from './ui/Button';
import ChatImage, { attachmentUrl } from './ChatImage';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ChatBox({ requestId, conversationId }) {
  const {
    ready, messages, chatOpen, loading, error, typing,
    send, sendFile, refresh, notifyTyping, me,
  } = useChat(requestId, conversationId);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileErr, setFileErr] = useState('');
  const box = useRef(null);
  const pick = useRef(null);

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

  async function onFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    setFileErr('');
    if (!file) return;
    if (!TYPES.includes(file.type)) return setFileErr('Only JPEG, PNG or WebP images.');
    if (file.size > 5 * 1024 * 1024) return setFileErr('Image must be 5 MB or smaller.');
    setBusy(true);
    try {
      await sendFile(file);
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
              <div
                className={`max-w-[75%] break-words rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-100'
                }`}
              >
                <ChatImage message={m} onRefresh={refresh} />
                {m.body && !(attachmentUrl(m) && m.body === m.attachment?.name) && (
                  <p className="whitespace-pre-wrap px-1">{m.body}</p>
                )}
              </div>
            </div>
          );
        })}
        {typing && <p className="text-xs italic text-slate-400">typing…</p>}
      </div>
      {(error || fileErr) && (
        <p className="bg-rose-50 px-4 py-2 text-sm text-rose-700">{error || fileErr}</p>
      )}
      {ready && !chatOpen && (
        <p className="bg-slate-100 px-4 py-3 text-center text-sm text-slate-500">
          Chat is closed for this request.
        </p>
      )}
      {ready && chatOpen && (
        <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 bg-white p-3">
          <input ref={pick} type="file" accept={TYPES.join(',')} onChange={onFile} className="hidden" />
          <Button type="button" variant="secondary" disabled={busy} onClick={() => pick.current.click()} aria-label="Attach image">
            📎
          </Button>
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