import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth-context';
import { refreshToken, setAuthLostHandler } from '../api/client';
import { loginApi, registerApi, logoutApi } from '../api/auth';
import { connectSocket, disconnectSocket } from '../socket/socket';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthLostHandler(() => setUser(null));
    refreshToken()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) connectSocket();
    else disconnectSocket();
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (body) => { const d = await loginApi(body); setUser(d.user); return d.user; },
    register: async (body) => { const d = await registerApi(body); setUser(d.user); return d.user; },
    logout: async () => { try { await logoutApi(); } catch { /* token cleared anyway */ } setUser(null); },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}