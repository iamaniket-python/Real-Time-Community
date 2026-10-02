import { useEffect } from 'react';

export default function ImageLightbox({ urls, index, onChange, onClose }) {
  const last = urls.length - 1;
  const go = (d) => onChange((index + d + urls.length) % urls.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (urls.length > 1 && e.key === 'ArrowLeft') onChange((index + last) % urls.length);
      if (urls.length > 1 && e.key === 'ArrowRight') onChange((index + 1) % urls.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, urls.length, last, onChange, onClose]);

  const arrow = 'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white backdrop-blur transition hover:bg-white/30';

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-lg font-bold text-white backdrop-blur transition hover:bg-white/30">✕</button>
      {urls.length > 1 && <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }} className={`${arrow} left-4`}>‹</button>}
      <img src={urls[index]} alt={`Photo ${index + 1}`} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
      {urls.length > 1 && <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }} className={`${arrow} right-4`}>›</button>}
      <span className="absolute bottom-5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{index + 1} / {urls.length}</span>
    </div>
  );
}