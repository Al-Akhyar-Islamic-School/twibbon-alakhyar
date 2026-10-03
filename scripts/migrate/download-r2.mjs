// ROLLBACK helper: downloads every file the new database references into a
// local folder (then scp it into the VPS storage/ directory). Files already
// present with the same SHA-256 are skipped.
//
//   DATABASE_URL='mysql://…tidb…' R2_…=… npm run migrate:download-r2 -- ./rollback-storage
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { KEY_RE, prismaFor, r2FromEnv, requireEnv, sha256, streamToBuffer } from './_shared.mjs';

const [dbUrl] = requireEnv('DATABASE_URL');
const dest = process.argv[2];
if (!dest) {
  console.error('Pakai: npm run migrate:download-r2 -- <folder-tujuan>');
  process.exit(1);
}

const { client, bucket } = r2FromEnv();
const db = prismaFor(dbUrl);
await mkdir(dest, { recursive: true });

let downloaded = 0;
let skipped = 0;
try {
  const rows = await db.twibbon.findMany({
    where: { NOT: { imageKey: '' } },
    select: { imageKey: true },
  });
  for (const { imageKey } of rows) {
    if (!KEY_RE.test(imageKey)) continue;
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: imageKey }));
    const buf = await streamToBuffer(obj.Body);
    const path = join(dest, imageKey);
    try {
      if (sha256(await readFile(path)) === sha256(buf)) {
        skipped++;
        continue;
      }
    } catch {
      /* not present locally */
    }
    await writeFile(path, buf);
    downloaded++;
  }
  console.log(`Selesai: ${downloaded} diunduh, ${skipped} sudah sama → ${dest}`);
} finally {
  await db.$disconnect();
}
