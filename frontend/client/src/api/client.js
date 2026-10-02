const API = import.meta.env.VITE_API_URL;
let accessToken = null;
let refreshing = null;
let onAuthLost = () => {};

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Something went wrong');
    this.status = status;
    this.errorCode = body?.errorCode;
    this.details = body?.details;
  }
}

const parse = (res) => res.json().catch(() => null);

export function refreshToken() {
  refreshing ??= fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      const json = await parse(res);
      if (!res.ok) throw new ApiError(res.status, json);
      accessToken = json.data.accessToken;
      return json.data;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function api(path, { method = 'GET', body, form, retry = true } = {}) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method, headers, credentials: 'include',
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, { message: 'Network error', errorCode: 'NETWORK' });
  }
  const json = await parse(res);
  if (res.status === 401 && json?.errorCode === 'TOKEN_EXPIRED' && retry) {
    try { await refreshToken(); } catch (e) { accessToken = null; onAuthLost(); throw e; }
    return api(path, { method, body, form, retry: false });
  }
  if (!res.ok) throw new ApiError(res.status, json);
  return json.data;
}