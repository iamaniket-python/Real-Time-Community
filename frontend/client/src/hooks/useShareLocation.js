import { useEffect } from 'react';
import { getSocket } from '../socket/socket';

export default function useShareLocation(active) {
  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    let last = 0;
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        if (now - last < 2500) return;
        last = now;
        getSocket()?.emit('helper:location_update', {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);
}