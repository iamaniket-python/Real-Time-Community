import { api, setAccessToken } from './client';

const withToken = (data) => {
  setAccessToken(data.accessToken);
  return data;
};

export const registerApi = (body) =>
  api('/auth/register', { method: 'POST', body }).then(withToken);

export const loginApi = (body) =>
  api('/auth/login', { method: 'POST', body }).then(withToken);

export const logoutApi = () =>
  api('/auth/logout', { method: 'POST' }).finally(() => setAccessToken(null));

export const deleteAccountApi = (password) =>
  api('/auth/account', { method: 'DELETE', body: { password } })
    .finally(() => setAccessToken(null));