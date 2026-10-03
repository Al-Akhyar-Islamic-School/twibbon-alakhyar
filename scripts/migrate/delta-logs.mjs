// Copies DownloadLog rows written on the VPS after the final dump (while DNS
// was still propagating) into the new database. Safe to re-run: ids are UUIDs
// and duplicates are skipped (INSERT IGNORE).
//
//   SRC_DATABASE_URL=… (VPS via tunnel) DST_DATABASE_URL=… (TiDB) \
//   SINCE=2026-10-20T10:00:00+07:00 npm run migrate:delta-logs
import { prismaFor, requireEnv } from './_shared.mjs';

const [srcUrl, dstUrl, sinceRaw] = requireEnv('SRC_DATABASE_URL', 'DST_DATABASE_URL', 'SINCE');
const since = new Date(sinceRaw);
if (Number.isNaN(since.getTime())) {
  console.error('SINCE harus tanggal ISO, mis. 2026-10-20T10:00:00+07:00');
  process.exit(1);
}

const src = prismaFor(srcUrl);
const dst = prismaFor(dstUrl);
try {
  const rows = await src.downloadLog.findMany({ where: { createdAt: { gt: since } } });
  if (rows.length === 0) {
    console.log(`Tidak ada DownloadLog baru sejak ${since.toISOString()}.`);
  } else {
    const { count } = await dst.downloadLog.createMany({ data: rows, skipDuplicates: true });
    console.log(`${rows.length} log ditemukan sejak ${since.toISOString()}, ${count} baru disalin.`);
  }
} finally {
  await Promise.all([src.$disconnect(), dst.$disconnect()]);
}
