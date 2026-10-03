// Compares two databases table by table: row counts and a SHA-256 over every
// row (ordered by id, canonical JSON). Use before and after the final sync.
//
//   SRC_DATABASE_URL=mysql://user:pass@127.0.0.1:3307/twibbon-alakhyar \  # VPS via ssh -L 3307:127.0.0.1:3306
//   DST_DATABASE_URL='mysql://<prefix>.root:pass@gateway01....:4000/twibbon?sslaccept=strict' \
//   npm run migrate:verify-db
import { prismaFor, requireEnv, sha256 } from './_shared.mjs';

const [srcUrl, dstUrl] = requireEnv('SRC_DATABASE_URL', 'DST_DATABASE_URL');
const src = prismaFor(srcUrl);
const dst = prismaFor(dstUrl);

const TABLES = ['user', 'twibbon', 'downloadLog'];

async function digest(db, table) {
  const rows = await db[table].findMany({ orderBy: { id: 'asc' } });
  return { count: rows.length, hash: sha256(JSON.stringify(rows)) };
}

let ok = true;
try {
  console.log('Tabel'.padEnd(14), 'Sumber'.padEnd(8), 'Tujuan'.padEnd(8), 'Hash');
  for (const t of TABLES) {
    const [a, b] = await Promise.all([digest(src, t), digest(dst, t)]);
    const same = a.count === b.count && a.hash === b.hash;
    if (!same) ok = false;
    console.log(
      t.padEnd(14),
      String(a.count).padEnd(8),
      String(b.count).padEnd(8),
      same ? 'SAMA' : `BEDA (${a.hash.slice(0, 12)} vs ${b.hash.slice(0, 12)})`
    );
  }

  // TiDB defaults to a case-sensitive collation; flag emails that would only be
  // unique case-sensitively (MySQL treated them as the same user).
  const users = await dst.user.findMany({ select: { email: true } });
  const seen = new Map();
  for (const { email } of users) {
    const k = email.toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const dupes = [...seen].filter(([, n]) => n > 1).map(([e]) => e);
  if (dupes.length) {
    ok = false;
    console.log('Email duplikat (beda kapitalisasi):', dupes);
  }
} finally {
  await Promise.all([src.$disconnect(), dst.$disconnect()]);
}

console.log(ok ? '\nPASS — data identik.' : '\nFAIL — ada perbedaan.');
process.exit(ok ? 0 : 1);
