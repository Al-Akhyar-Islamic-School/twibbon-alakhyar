import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

// Cloudflare R2 storage driver (S3 API). Twibbon PNGs live at the bucket root
// as `<uuid>.png` — the same keys the app has always used — and are served to
// browsers through the same-origin /file/[key] route, so existing links, OG
// previews and canvas compositing keep working unchanged.
//
// Uploads skip the serverless body limit: the browser PUTs straight to R2 under
// `pending/<uuid>.png` via a short-lived presigned URL, then the API validates
// the object and promotes it to `<uuid>.png` (see src/lib/uploads.ts). A bucket
// lifecycle rule deletes abandoned `pending/` objects after a day.

const KEY_RE = /^[a-zA-Z0-9_-]+\.png$/;
const PENDING_PREFIX = 'pending/';
const UPLOAD_URL_TTL_SECONDS = 300;

let cached: { client: S3Client; bucket: string } | null = null;

function r2() {
  if (cached) return cached;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'R2 belum dikonfigurasi: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.'
    );
  }
  // R2_ENDPOINT is only for local testing against an S3-compatible emulator
  // (e.g. MinIO); production always talks to the account's R2 endpoint.
  const customEndpoint = process.env.R2_ENDPOINT;
  const client = new S3Client({
    region: 'auto',
    endpoint: customEndpoint || `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: !!customEndpoint,
    credentials: { accessKeyId, secretAccessKey },
    // Newer SDKs add CRC32 checksums to every request by default, which bakes a
    // checksum of an unknown body into presigned PUT URLs and breaks browser
    // uploads to R2. Only send checksums when an operation requires them.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  cached = { client, bucket };
  return cached;
}

/** A final, servable key: `<uuid>.png` at the bucket root. */
export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

/** A presigned-upload key: `pending/<uuid>.png`. */
export function isPendingKey(key: string): boolean {
  return key.startsWith(PENDING_PREFIX) && KEY_RE.test(key.slice(PENDING_PREFIX.length));
}

function assertKey(key: string) {
  if (!isValidKey(key) && !isPendingKey(key)) throw new Error('Invalid storage key');
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
}

/**
 * Presigned PUT for a browser upload. Content-Type and Content-Length are part
 * of the signature, so R2 rejects a body of a different type or size; the API
 * still re-checks the stored object's size before accepting it.
 */
export async function createUploadUrl(
  size: number
): Promise<{ uploadUrl: string; pendingKey: string }> {
  const { client, bucket } = r2();
  const pendingKey = `${PENDING_PREFIX}${randomUUID()}.png`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: pendingKey,
      ContentType: 'image/png',
      ContentLength: size,
    }),
    {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(['content-type', 'content-length']),
    }
  );
  return { uploadUrl, pendingKey };
}

/** Object size in bytes, or null when it doesn't exist. */
export async function statObject(key: string): Promise<number | null> {
  assertKey(key);
  const { client, bucket } = r2();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? 0;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** Whole object as a Buffer (used to validate uploads), or null if missing. */
export async function readObject(key: string): Promise<Buffer | null> {
  assertKey(key);
  const { client, bucket } = r2();
  try {
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!obj.Body) return null;
    return Buffer.from(await obj.Body.transformToByteArray());
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** Moves a validated `pending/<uuid>.png` to its final `<uuid>.png` key. */
export async function promotePending(pendingKey: string): Promise<string> {
  if (!isPendingKey(pendingKey)) throw new Error('Invalid pending key');
  const { client, bucket } = r2();
  const finalKey = pendingKey.slice(PENDING_PREFIX.length);
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: finalKey,
      CopySource: `${bucket}/${pendingKey}`,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
      MetadataDirective: 'REPLACE',
    })
  );
  await deleteFile(pendingKey);
  return finalKey;
}

/** Streams a final object for serving, or null when it doesn't exist. */
export async function getFile(
  key: string
): Promise<{ body: ReadableStream; size: number | undefined } | null> {
  if (!isValidKey(key)) return null;
  const { client, bucket } = r2();
  try {
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!obj.Body) return null;
    return { body: obj.Body.transformToWebStream(), size: obj.ContentLength };
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export function publicUrlForKey(key: string): string {
  return `/file/${key}`;
}

// Best-effort delete. Used when a twibbon is removed, replaced or has expired,
// and to discard rejected uploads, so storage never accumulates orphans.
export async function deleteFile(key: string): Promise<void> {
  if (!key || (!isValidKey(key) && !isPendingKey(key))) return;
  try {
    const { client, bucket } = r2();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.warn('deleteFile failed', key, err);
  }
}
