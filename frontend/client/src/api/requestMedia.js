import { api } from './client';

const ORIGIN = new URL(import.meta.env.VITE_API_URL).origin;

export async function getRequestImageUrl(id) {
  const d = await api(`/requests/${id}/image-url`);
  const url = typeof d === 'string' ? d : d?.url || d?.imageUrl;
  if (!url) throw new Error('No image');
  return url.startsWith('http') ? url : ORIGIN + url;
}