// Verifies storage against the database: every non-empty Twibbon.imageKey must
// exist in R2, and (when a manifest is given) its bytes must match the VPS
// checksum. Unreferenced objects at the bucket root are reported as warnings.
//
//   DATABASE_URL='mysql://…tidb…/twibbon?sslaccept=strict' R2_…=… \
//   npm run migrate:verify-r2 -- ./twibbon-files.sha256
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import {
  isNotFound,
  prismaFor,
  r2FromEnv,
  readManifest,
  requireEnv,
  sha256,
  streamToBuffer,
} from './_shared.mjs';

const [dbUrl] = requireEnv('DATABASE_URL');
const manifestPath = process.argv[2];
const { client, bucket } = r2FromEnv();
const manifest = await readManifest(manifestPath);
const db = prismaFor(dbUrl);

let ok = true;
try {
  const rows = await db.twibbon.findMany({
    where: { NOT: { imageKey: '' } },
    select: { imageKey: true, title: true },
  });
  const referenced = new Set(rows.map((r) => r.imageKey));

  for (const { imageKey, title } of rows) {
    try {
      const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: imageKey }));
      const hash = sha256(await streamToBuffer(obj.Body));
      const expected = manifest.get(imageKey);
      if (expected && expected !== hash) {
        ok = false;
        console.log(`  BEDA     ${imageKey} (${title})`);
      } else {
        console.log(`  OK       ${imageKey}${expected ? '' : '  (tidak ada di manifest)'}`);
      }
    } catch (err) {
      if (!isNotFound(err)) throw err;
      ok = false;
      console.log(`  HILANG   ${imageKey} (${title})`);
    }
  }

  // Root-level objects no twibbon points to (pending/ uploads are excluded).
  let token;
  const orphans = [];
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Delimiter: '/', ContinuationToken: token })
    );
    for (const o of page.Contents ?? []) if (!referenced.has(o.Key)) orphans.push(o.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  if (orphans.length) console.log(`Peringatan: ${orphans.length} objek tidak direferensikan DB:`, orphans);

  console.log(`\n${rows.length} imageKey diperiksa di ${bucket}.`);
} finally {
  await db.$disconnect();
}

console.log(ok ? 'PASS — semua file ada dan cocok.' : 'FAIL — ada file hilang/berbeda.');
process.exit(ok ? 0 : 1);
