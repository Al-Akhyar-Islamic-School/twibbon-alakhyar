import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { validateTwibbonBuffer } from '@/lib/validateTwibbon';
import { putPng, deleteFile } from '@/lib/storage';
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

// PATCH /api/twibbons/[id] — edit metadata, toggle active, optionally replace file.
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

  const form = await req.formData();
  const data: Record<string, unknown> = {};

  if (form.has('title')) {
    const title = String(form.get('title') ?? '').trim();
    if (!title) return NextResponse.json({ error: 'Judul wajib diisi.' }, { status: 400 });
    data.title = title;
  }
  if (form.has('description')) {
    data.description = String(form.get('description') ?? '').trim() || null;
  }
  if (form.has('caption')) {
    data.caption = String(form.get('caption') ?? '').trim() || null;
  }
  if (form.has('isActive')) {
    data.isActive = String(form.get('isActive')) !== 'false';
  }
  if (form.has('startDate')) {
    const v = String(form.get('startDate') ?? '').trim();
    data.startDate = v ? new Date(v) : null;
  }
  if (form.has('endDate')) {
    const v = String(form.get('endDate') ?? '').trim();
    data.endDate = v ? new Date(v) : null;
  }

  const s = (data.startDate as Date | null | undefined) ?? existing.startDate;
  const e = (data.endDate as Date | null | undefined) ?? existing.endDate;
  if (s && e && s > e) {
    return NextResponse.json(
      { error: 'Tanggal mulai tidak boleh setelah tanggal berakhir.' },
      { status: 400 }
    );
  }

  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const check = await validateTwibbonBuffer(buffer);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    data.imageKey = await putPng(buffer);
    data.width = check.width;
    data.height = check.height;
    data.fileSize = check.size;
  }

  const updated = await prisma.twibbon.update({ where: { id: params.id }, data });
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

  // Free the disk immediately; keep the row (soft delete) so download logs and
  // any cached links degrade gracefully. imageKey is cleared so it's not re-served.
  await deleteFile(existing.imageKey);
  await prisma.twibbon.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false, imageKey: '' },
  });
  return NextResponse.json({ ok: true });
}
