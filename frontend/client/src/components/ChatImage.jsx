import { useRef, useState } from 'react';

const ORIGIN = new URL(import.meta.env.VITE_API_URL).origin;

export function attachmentUrl(m) {
  const u =
    m.attachment?.url || m.attachments?.[0]?.url || m.attachmentUrl || m.imageUrl || null;
  if (!u) return null;
  return u.startsWith('http') ? u : ORIGIN + u;
}

export default function ChatImage({ message, onRefresh }) {
  const tried = useRef(false);
  const [bad, setBad] = useState(false);
  const url = attachmentUrl(message);
  if (!url) return null;
  if (bad) return <p className="text-xs italic text-slate-400">Image unavailable</p>;

  async function onError() {
    if (tried.current) return setBad(true);
    tried.current = true;
    try {
      await onRefresh();
    } catch {
      setBad(true);
    }
  }

  return (
    <img
      src={url}
      onError={onError}
      alt="Attachment"
      className="mb-1 max-h-60 rounded-xl object-cover"
    />
  );
}