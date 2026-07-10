import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Local-disk storage driver. Files land under STORAGE_DIR and are served by
// the /file/[key] route. To move to GCS/S3 (PRD §8), reimplement these three
// functions against the SDK — nothing else in the app touches the filesystem.

const STORAGE_DIR = resolve(process.env.STORAGE_DIR || './storage');

function safeKeyToPath(key: string): string {
  // Keys we mint are `<uuid>.png`; reject anything with path traversal.
  if (!/^[a-zA-Z0-9_-]+\.png$/.test(key)) {
    throw new Error('Invalid storage key');
  }
  const p = resolve(join(STORAGE_DIR, key));
  if (!p.startsWith(STORAGE_DIR)) throw new Error('Path traversal blocked');
  return p;
}

export async function putPng(buffer: Buffer): Promise<string> {
  await mkdir(STORAGE_DIR, { recursive: true });
  const key = `${randomUUID()}.png`;
  await writeFile(safeKeyToPath(key), buffer);
  return key;
}

export async function getFile(
  key: string
): Promise<{ buffer: Buffer; size: number } | null> {
  try {
    const p = safeKeyToPath(key);
    const [buffer, s] = await Promise.all([readFile(p), stat(p)]);
    return { buffer, size: s.size };
  } catch {
    return null;
  }
}

export function publicUrlForKey(key: string): string {
  return `/file/${key}`;
}
