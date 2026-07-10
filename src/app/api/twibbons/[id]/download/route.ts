import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/twibbons/[id]/download — anonymous usage counter (FR-15).
// Fired client-side when the user taps "Unduh". No personal data, no photo.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const exists = await prisma.twibbon.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.downloadLog.create({ data: { twibbonId: params.id } });
  return NextResponse.json({ ok: true });
}
