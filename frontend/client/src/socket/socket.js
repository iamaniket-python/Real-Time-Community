import { io } from 'socket.io-client';
import { getAccessToken, refreshToken } from '../api/client';

let socket = null;
let retried = false;

export function connectSocket() {
  if (socket) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  socket.on('connect', () => { retried = false; });
  socket.on('connect_error', async (err) => {
    if (err.data?.errorCode !== 'TOKEN_EXPIRED' || retried) return;
    retried = true;
    try {
      await refreshToken();
      socket.connect();
    } catch {
      // refresh failed: the API client already signals the logout
    }
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  retried = false;
}

export const getSocket = () => socket;