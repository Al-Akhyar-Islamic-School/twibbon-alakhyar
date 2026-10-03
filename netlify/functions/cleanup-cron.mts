import type { Config } from '@netlify/functions';

// Daily housekeeping at 02:00 WIB (19:00 UTC): removes files of twibbons deleted
// by staff or ended >90 days ago. Delegates to the Next route so
// the Prisma/R2 logic lives in one place; this function only triggers it.
export default async () => {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error('cleanup-cron: URL atau CRON_SECRET belum tersedia, dilewati.');
    return;
  }
  const res = await fetch(`${base}/api/cron/cleanup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log('cleanup-cron:', res.status, await res.text());
};

export const config: Config = {
  schedule: '0 19 * * *',
};
