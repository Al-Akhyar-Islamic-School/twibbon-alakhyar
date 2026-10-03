import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { acceptPendingUpload } from '@/lib/uploads';
import { deleteFile } from '@/lib/storage';
import { isPubliclyVisible, serializeTwibbon } from '@/lib/twibbon';
import { uploadsFrozen, frozenResponse } from '@/lib/freeze';

// GET /api/twibbons
//   ?scope=public (default) → only publicly-visible twibbons (FR-01)
//   ?scope=mine            → caller's own twibbons (auth required)
export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') ?? 'public';

  if (scope === 'mine') {
    const session = await auth();
    const uid = (session?.user as { id?: string } | undefined)?.id;
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rows = await prisma.twibbon.findMany({
      where: { createdById: uid, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { downloads: true } } },
    });
    return NextResponse.json({
      twibbons: rows.map((t) =>
        serializeTwibbon(t, { downloadCount: t._count.downloads })
      ),
    });
  }

  // Public list.
  const rows = await prisma.twibbon.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { downloads: true } },
    },
  });
  const now = new Date();
  return NextResponse.json({
    twibbons: rows
      .filter((t) => isPubliclyVisible(t, now))
      .map((t) => serializeTwibbon(t, { downloadCount: t._count.downloads })),
  });
}

// POST /api/twibbons — create a twibbon. JSON body with metadata and the
// `pendingKey` returned by POST /api/uploads/sign after the browser has PUT the
// PNG to storage (the file itself never passes through this function).
export async function POST(req: NextRequest) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (uploadsFrozen()) return frozenResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const title = str(body.title);
  const description = str(body.description);
  const caption = str(body.caption);
  const startRaw = str(body.startDate);
  const endRaw = str(body.endDate);
  const isActive = body.isActive !== false;

  if (!title) {
    return NextResponse.json({ error: 'Judul twibbon wajib diisi.' }, { status: 400 });
  }
  if (!body.pendingKey) {
    return NextResponse.json({ error: 'File twibbon wajib diunggah.' }, { status: 400 });
  }

  const startDate = startRaw ? new Date(startRaw) : null;
  const endDate = endRaw ? new Date(endRaw) : null;
  if (startDate && endDate && startDate > endDate) {
    return NextResponse.json(
      { error: 'Tanggal mulai tidak boleh setelah tanggal berakhir.' },
      { status: 400 }
    );
  }

  const upload = await acceptPendingUpload(body.pendingKey);
  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: upload.status });
  }

  try {
    const created = await prisma.twibbon.create({
      data: {
        title,
        description: description || null,
        caption: caption || null,
        imageKey: upload.imageKey,
        width: upload.width,
        height: upload.height,
        fileSize: upload.size,
        isActive,
        startDate,
        endDate,
        createdById: uid,
      },
    });
    return NextResponse.json({ twibbon: serializeTwibbon(created) }, { status: 201 });
  } catch (err) {
    // Don't leave an orphaned file behind if the row couldn't be written.
    await deleteFile(upload.imageKey);
    throw err;
  }
}
