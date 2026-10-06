// Reads a seller object from the API. Accepts camelCase or snake_case keys,
// and a nested "shop" object, so a small naming difference does not blank the page.
const pick = (o, ...keys) => {
  for (const k of keys) if (o?.[k] !== undefined && o[k] !== null) return o[k];
  return null;
};

export function normalizeSeller(raw) {
  const o = { ...(raw?.shop || {}), ...(raw || {}) };
  return {
    verification: pick(o, 'verificationStatus', 'verification') ?? 'PENDING',
    shopName: pick(o, 'shopName', 'shop_name', 'name'),
    description: pick(o, 'description'),
    address: pick(o, 'address'),
    lat: pick(o, 'lat'),
    lng: pick(o, 'lng'),
    isOpen: pick(o, 'isOpen', 'is_open') ?? true,
    ratingAvg: Number(pick(o, 'ratingAvg', 'rating_avg') ?? 0),
    ratingCount: Number(pick(o, 'ratingCount', 'rating_count') ?? 0),
  };
}