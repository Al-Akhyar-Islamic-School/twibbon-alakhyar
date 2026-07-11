import sharp from 'sharp';

// Server-side validation of an uploaded twibbon file (FR-11, NFR security).
// We sniff the real bytes with sharp instead of trusting the file extension
// or the client-provided MIME type.

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_DIMENSION = 400; // px — below this the composite looks poor

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type TwibbonValidation =
  | { ok: true; width: number; height: number; size: number }
  | { ok: false; error: string };

export async function validateTwibbonBuffer(
  buffer: Buffer
): Promise<TwibbonValidation> {
  const size = buffer.length;

  if (size === 0) return { ok: false, error: 'File kosong.' };
  if (size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `Ukuran file melebihi batas ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB.`,
    };
  }

  // Real magic-byte check — must be a PNG regardless of filename/MIME.
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ok: false, error: 'File harus berformat PNG.' };
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    return { ok: false, error: 'File PNG tidak dapat dibaca / rusak.' };
  }

  if (meta.format !== 'png') {
    return { ok: false, error: 'File harus berformat PNG.' };
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    return { ok: false, error: 'Dimensi gambar tidak terbaca.' };
  }
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return {
      ok: false,
      error: `Resolusi minimal ${MIN_DIMENSION}×${MIN_DIMENSION}px. Ukuran Anda ${width}×${height}px.`,
    };
  }

  // Must carry real transparency. `hasAlpha` only means an alpha channel
  // exists; we also confirm it isn't fully opaque by inspecting the min alpha.
  if (!meta.hasAlpha) {
    return {
      ok: false,
      error: 'Twibbon harus PNG dengan latar transparan (alpha channel).',
    };
  }
  try {
    const stats = await sharp(buffer).stats();
    const alpha = stats.channels[stats.channels.length - 1];
    // If the alpha channel's minimum equals its max at full opacity, there is
    // no actual transparency anywhere in the image.
    if (alpha && alpha.min >= 255) {
      return {
        ok: false,
        error: 'PNG tidak memiliki area transparan — foto pengguna tak akan terlihat.',
      };
    }
  } catch {
    // If stats fail we still passed hasAlpha; allow it.
  }

  return { ok: true, width, height, size };
}
