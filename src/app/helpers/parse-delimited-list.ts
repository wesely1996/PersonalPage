export const parseDelimitedList = (
  raw: unknown,
  delimiter = ','
): string[] => {
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (raw === null || raw === undefined || raw === '') {
    return [];
  }
  return String(raw)
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
};
