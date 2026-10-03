import { useCallback, useEffect, useState } from 'react';
import { getRequestImageUrl } from '../api/requestMedia';

export default function RequestImage({ requestId }) {
  const [src, setSrc] = useState(null);
  const [retried, setRetried] = useState(false);
  const [gone, setGone] = useState(false);

  const load = useCallback(
    () => getRequestImageUrl(requestId).then(setSrc).catch(() => setGone(true)),
    [requestId],
  );
  useEffect(() => {
    load();
  }, [load]);

  function onError() {
    if (retried) return setGone(true);
    setRetried(true);
    load();
  }

  if (gone || !src) return null;
  return (
    <img
      src={src}
      onError={onError}
      alt="Attached to this request"
      className="max-h-80 w-full rounded-2xl object-cover ring-1 ring-slate-200"
    />
  );
}