// Money is stored in paise (integer). These helpers avoid floating point math.
export const formatPaise = (paise) =>
  `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// "199.5" -> 19950. Returns null when the text is not an amount with at most 2 decimals.
export function rupeesToPaise(text) {
  const t = String(text).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [rupees, paise = ''] = t.split('.');
  return Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
}

// 19950 -> "199.50"
export const paiseToRupees = (paise) => (Number(paise) / 100).toFixed(2);