// Maps the seller DTO from GET /sellers/me to the fields the pages use.
export function normalizeSeller(raw) {
  const o = raw || {};
  return {
    verification: o.verification ?? 'PENDING',
    shopName: o.shopName ?? null,
    description: o.description ?? null,
    address: o.address ?? null,
    lat: o.lat ?? null,
    lng: o.lng ?? null,
    isOpen: o.isOpen ?? true,
    ratingAvg: Number(o.ratingAvg ?? 0),
    ratingCount: Number(o.ratingCount ?? 0),
    gstNumber: o.gstNumber ?? null,
    panMasked: o.panMasked ?? null,
    aadhaarMasked: o.aadhaarMasked ?? null,
    galleryCount: o.galleryCount ?? 0,
    profileComplete: !!o.profileComplete,
    documentsComplete: !!o.documentsComplete,
  };
}

// Signed image links come from the API; prefix them with the API origin when they are relative
const ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL).origin;
  } catch {
    return '';
  }
})();

export const assetUrl = (u) => (!u ? null : /^https?:/i.test(u) ? u : ORIGIN + u);