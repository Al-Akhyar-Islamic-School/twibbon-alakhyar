import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { deleteFile } from '@/lib/storage';
import { purgeFileCache } from '@/lib/cdn';

// POST /api/cron/cleanup — housekeeping, triggered daily by the Netlify
// scheduled function netlify/functions/cleanup-cron.mts (or `npm run cleanup`).
// Deletes the stored PNG of every twibbon that was deleted by staff, or that
// ended more than EXPIRED_GRACE_DAYS ago. The grace period keeps old share
// links / OG previews working for a while and lets staff re-activate a recently
// ended twibbon by extending its dates. The row is kept (imageKey cleared) so
// download stats stay intact.
export const dynamic = 'force-dynamic';

const EXPIRED_GRACE_DAYS = 90;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never run unauthenticated
  const header = req.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const expiredBefore = new Date(now.getTime() - EXPIRED_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.twibbon.findMany({
    where: {
      NOT: { imageKey: '' },
      OR: [{ deletedAt: { not: null } }, { endDate: { lt: expiredBefore } }],
    },
    select: { id: true, title: true, imageKey: true, deletedAt: true },
  });

  const cleaned: string[] = [];
  for (const r of rows) {
    await deleteFile(r.imageKey);
    await prisma.twibbon.update({
      where: { id: r.id },
      data: { imageKey: '', isActive: false, deletedAt: r.deletedAt ?? now },
    });
    cleaned.push(r.title);
  }
  await purgeFileCache(rows.map((r) => r.imageKey));

  console.log(`cleanup: ${cleaned.length} twibbon dibersihkan`, cleaned);
  return NextResponse.json({ cleaned: cleaned.length, titles: cleaned });
}
