import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { acceptPendingUpload } from '@/lib/uploads';
import { deleteFile } from '@/lib/storage';
import { purgeFileCache } from '@/lib/cdn';
import { serializeTwibbon } from '@/lib/twibbon';
import { uploadsFrozen, frozenResponse } from '@/lib/freeze';

// GET /api/twibbons/[id] — public read of a single (non-deleted) twibbon.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = await prisma.twibbon.findFirst({
    where: { id: params.id, deletedAt: null },
  });
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ twibbon: serializeTwibbon(t) });
}

async function ownedOr404(id: string, uid: string) {
  return prisma.twibbon.findFirst({ where: { id, createdById: uid, deletedAt: null } });
}

// PATCH /api/twibbons/[id] — edit metadata, toggle active, optionally replace
// the file. JSON body; only the fields present are changed. To replace the
// file, send the `pendingKey` from POST /api/uploads/sign.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (uploadsFrozen()) return frozenResponse();

  const existing = await ownedOr404(params.id, uid);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const data: Record<string, unknown> = {};

  if (has('title')) {
    const title = str(body.title);
    if (!title) return NextResponse.json({ error: 'Judul wajib diisi.' }, { status: 400 });
    data.title = title;
  }
  if (has('description')) data.description = str(body.description) || null;
  if (has('caption')) data.caption = str(body.caption) || null;
  if (has('isActive')) data.isActive = body.isActive !== false;
  if (has('startDate')) {
    const v = str(body.startDate);
    data.startDate = v ? new Date(v) : null;
  }
  if (has('endDate')) {
    const v = str(body.endDate);
    data.endDate = v ? new Date(v) : null;
  }

  const s = has('startDate') ? (data.startDate as Date | null) : existing.startDate;
  const e = has('endDate') ? (data.endDate as Date | null) : existing.endDate;
  if (s && e && s > e) {
    return NextResponse.json(
      { error: 'Tanggal mulai tidak boleh setelah tanggal berakhir.' },
      { status: 400 }
    );
  }

  let newImageKey: string | null = null;
  if (body.pendingKey) {
    const upload = await acceptPendingUpload(body.pendingKey);
    if (!upload.ok) {
      return NextResponse.json({ error: upload.error }, { status: upload.status });
    }
    newImageKey = upload.imageKey;
    data.imageKey = upload.imageKey;
    data.width = upload.width;
    data.height = upload.height;
    data.fileSize = upload.size;
  }

  let updated;
  try {
    updated = await prisma.twibbon.update({ where: { id: params.id }, data });
  } catch (err) {
    if (newImageKey) await deleteFile(newImageKey);
    throw err;
  }

  // The previous file is no longer referenced — remove it instead of leaving
  // an orphan in storage.
  if (newImageKey && existing.imageKey && existing.imageKey !== newImageKey) {
    await deleteFile(existing.imageKey);
    await purgeFileCache([existing.imageKey]);
  }

  return NextResponse.json({ twibbon: serializeTwibbon(updated) });
}

// DELETE /api/twibbons/[id] — soft delete (PRD FR-13).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (uploadsFrozen()) return frozenResponse();

  const existing = await ownedOr404(params.id, uid);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Free storage immediately; keep the row (soft delete) so download logs stay
  // intact. imageKey is cleared so it's not re-served, and the CDN copy purged.
  await deleteFile(existing.imageKey);
  await prisma.twibbon.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false, imageKey: '' },
  });
  await purgeFileCache([existing.imageKey]);
  return NextResponse.json({ ok: true });
}
