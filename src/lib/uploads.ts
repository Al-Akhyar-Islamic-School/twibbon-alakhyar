import { MAX_FILE_BYTES } from './limits';
import { validateTwibbonBuffer } from './validateTwibbon';
import { deleteFile, isPendingKey, promotePending, readObject, statObject } from './storage';

export type AcceptedUpload =
  | { ok: true; imageKey: string; width: number; height: number; size: number }
  | { ok: false; status: number; error: string };

/**
 * Validates a browser upload sitting at `pending/<uuid>.png` and promotes it to
 * its final key. Rejected uploads are deleted immediately. The checks are the
 * same as before the migration (real PNG bytes, size, dimensions, alpha).
 */
export async function acceptPendingUpload(pendingKey: unknown): Promise<AcceptedUpload> {
  if (typeof pendingKey !== 'string' || !isPendingKey(pendingKey)) {
    return { ok: false, status: 400, error: 'Upload tidak valid. Silakan pilih file lagi.' };
  }

  const size = await statObject(pendingKey);
  if (size == null) {
    return {
      ok: false,
      status: 400,
      error: 'File upload tidak ditemukan atau sudah kedaluwarsa. Silakan pilih file lagi.',
    };
  }
  if (size > MAX_FILE_BYTES) {
    await deleteFile(pendingKey);
    return {
      ok: false,
      status: 400,
      error: `Ukuran file melebihi batas ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB.`,
    };
  }

  const buffer = await readObject(pendingKey);
  if (!buffer) {
    return { ok: false, status: 400, error: 'File upload tidak dapat dibaca. Silakan coba lagi.' };
  }

  const check = await validateTwibbonBuffer(buffer);
  if (!check.ok) {
    await deleteFile(pendingKey);
    return { ok: false, status: 400, error: check.error };
  }

  const imageKey = await promotePending(pendingKey);
  return { ok: true, imageKey, width: check.width, height: check.height, size: check.size };
}
