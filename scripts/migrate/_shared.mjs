// Shared helpers for the VPS → Netlify/TiDB/R2 migration scripts.
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export const KEY_RE = /^[a-zA-Z0-9_-]+\.png$/;

export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Env belum di-set: ${missing.join(', ')}`);
    process.exit(1);
  }
  return names.map((n) => process.env[n]);
}

export function r2FromEnv() {
  const [accountId, accessKeyId, secretAccessKey, bucket] = requireEnv(
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET'
  );
  const customEndpoint = process.env.R2_ENDPOINT; // local emulator only
  const client = new S3Client({
    region: 'auto',
    endpoint: customEndpoint || `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: !!customEndpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return { client, bucket };
}

export function prismaFor(url) {
  return new PrismaClient({ datasourceUrl: url });
}

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Parses `sha256sum` output ("<hash>  <path>") into Map<filename, hash>. */
export async function readManifest(path) {
  const map = new Map();
  if (!path) return map;
  const text = await readFile(path, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/);
    if (m) map.set(basename(m[2]), m[1]);
  }
  return map;
}

export async function streamToBuffer(body) {
  return Buffer.from(await body.transformToByteArray());
}

export function isNotFound(err) {
  return err?.name === 'NoSuchKey' || err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404;
}
