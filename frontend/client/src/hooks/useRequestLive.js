import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../socket/socket';

const REFRESH = ['request:accepted', 'request:status_changed', 'request:cancelled'];

export default function useRequestLive(requestId, reload) {
  const [helperPos, setHelperPos] = useState(null);
  const reloadRef = useRef(reload);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    const s = getSocket();
    if (!s || !requestId) return;
    const id = String(requestId);
    const join = () => s.emit('request:join', { requestId }, () => {});
    const refresh = (p) => {
      if (!p?.requestId || String(p.requestId) === id) reloadRef.current();
    };
    const onLoc = (p) => {
      if (String(p?.requestId) !== id) return;
      setHelperPos({ lat: Number(p.lat), lng: Number(p.lng), distanceKm: p.distanceKm });
    };
    join();
    s.on('connect', join);
    REFRESH.forEach((ev) => s.on(ev, refresh));
    s.on('helper:location_update', onLoc);
    return () => {
      s.emit('request:leave', { requestId }, () => {});
      s.off('connect', join);
      REFRESH.forEach((ev) => s.off(ev, refresh));
      s.off('helper:location_update', onLoc);
    };
  }, [requestId]);

  return helperPos;
}