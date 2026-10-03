// Manually trigger the cleanup that normally runs daily on Netlify.
// Deletes stored PNGs of twibbons deleted by staff, or ended more than 90 days ago.
//
//   CRON_SECRET=... npm run cleanup                                  # twibbon.alakhyar.sch.id
//   CLEANUP_URL=https://<site>.netlify.app CRON_SECRET=... npm run cleanup  # before cutover
const base =
  process.env.CLEANUP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://twibbon.alakhyar.sch.id';
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error('Set CRON_SECRET (sama dengan nilai di Netlify).');
  process.exit(1);
}

const res = await fetch(`${base.replace(/\/$/, '')}/api/cron/cleanup`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${secret}` },
});
const text = await res.text();
console.log(res.status, text);
if (!res.ok) process.exit(1);
