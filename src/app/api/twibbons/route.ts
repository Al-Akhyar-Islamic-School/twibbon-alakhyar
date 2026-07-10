import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { validateTwibbonBuffer } from '@/lib/validateTwibbon';
import { putPng } from '@/lib/storage';
import { isPubliclyVisible, serializeTwibbon } from '@/lib/twibbon';

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
  });
  const now = new Date();
  return NextResponse.json({
    twibbons: rows.filter((t) => isPubliclyVisible(t, now)).map((t) => serializeTwibbon(t)),
  });
}

// POST /api/twibbons — upload a new twibbon (multipart/form-data).
export async function POST(req: NextRequest) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const startRaw = String(form.get('startDate') ?? '').trim();
  const endRaw = String(form.get('endDate') ?? '').trim();
  const isActive = String(form.get('isActive') ?? 'true') !== 'false';

  if (!title) {
    return NextResponse.json({ error: 'Judul twibbon wajib diisi.' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File twibbon wajib diunggah.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const check = await validateTwibbonBuffer(buffer);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const startDate = startRaw ? new Date(startRaw) : null;
  const endDate = endRaw ? new Date(endRaw) : null;
  if (startDate && endDate && startDate > endDate) {
    return NextResponse.json(
      { error: 'Tanggal mulai tidak boleh setelah tanggal berakhir.' },
      { status: 400 }
    );
  }

  const imageKey = await putPng(buffer);
  const created = await prisma.twibbon.create({
    data: {
      title,
      description: description || null,
      imageKey,
      width: check.width,
      height: check.height,
      fileSize: check.size,
      isActive,
      startDate,
      endDate,
      createdById: uid,
    },
  });

  return NextResponse.json({ twibbon: serializeTwibbon(created) }, { status: 201 });
}
