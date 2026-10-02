import { api } from './client';

export function uploadRequestImage(id, file) {
  const form = new FormData();
  form.append('file', file);
  return api(`/requests/${id}/image`, { method: 'POST', form });
}

// Uploads one by one. Returns how many succeeded and the last error message.
export async function uploadRequestImages(id, files) {
  let done = 0;
  let error = '';
  for (const f of files) {
    try {
      await uploadRequestImage(id, f);
      done += 1;
    } catch (err) {
      error = err.message;
    }
  }
  return { done, error };
}