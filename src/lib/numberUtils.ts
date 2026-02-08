export const parseLocaleDecimal = (rawValue: string): number | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  // Allow both "12,5" and "12.5" while keeping storage normalized as number.
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

