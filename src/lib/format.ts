// Indonesian date helpers for twibbon schedule display.
const FMT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return FMT.format(d);
}

export function formatRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `Mulai ${s}`;
  if (e) return `Sampai ${e}`;
  return null;
}

// Status badge shown on cards (Aktif / Segera / Berakhir).
export function scheduleStatus(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  now = new Date()
): 'active' | 'upcoming' | 'ended' {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s && now < s) return 'upcoming';
  if (e && now > e) return 'ended';
  return 'active';
}
