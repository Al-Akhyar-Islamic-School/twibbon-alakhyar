// Uploads the VPS twibbon PNGs to R2 with their existing keys (`<uuid>.png`),
// so every stored imageKey, /file/<key> link and OG preview stays valid.
// Idempotent: objects already uploaded with the same SHA-256 are skipped.
//
//   R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=twibbon-alakhyar \
//   npm run migrate:upload-r2 -- ./vps-storage ./twibbon-files.sha256
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { KEY_RE, isNotFound, r2FromEnv, readManifest, sha256 } from './_shared.mjs';

const [dir, manifestPath] = process.argv.slice(2);
if (!dir) {
  console.error('Pakai: npm run migrate:upload-r2 -- <folder-png> [manifest.sha256]');
  process.exit(1);
}

const { client, bucket } = r2FromEnv();
const manifest = await readManifest(manifestPath);
const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();

let uploaded = 0;
let skipped = 0;
for (const name of files) {
  if (!KEY_RE.test(name)) {
    console.error(`Nama file tidak valid sebagai key: ${name}`);
    process.exit(1);
  }
  const buf = await readFile(join(dir, name));
  const hash = sha256(buf);
  if (manifestPath) {
    const expected = manifest.get(name);
    if (!expected) {
      console.error(`${name} tidak ada di manifest — hentikan.`);
      process.exit(1);
    }
    if (expected !== hash) {
      console.error(`${name} checksum tidak cocok dengan manifest VPS — hentikan.`);
      process.exit(1);
    }
  }

  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: name }));
    if (head.Metadata?.sha256 === hash) {
      skipped++;
      continue;
    }
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: name,
      Body: buf,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: { sha256: hash },
    })
  );
  uploaded++;
  console.log(`  diunggah ${name} (${(buf.length / 1024).toFixed(0)} KB)`);
}

console.log(`Selesai: ${uploaded} diunggah, ${skipped} sudah ada, total ${files.length} file → ${bucket}`);
