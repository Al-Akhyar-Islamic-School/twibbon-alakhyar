// Housekeeping: free disk by deleting the PNG files of twibbons that are either
// soft-deleted OR past their end date. The DB row is kept (soft delete) with
// imageKey cleared, so download-log stats stay intact but no file lingers.
//
// Run manually:   npm run cleanup
// Schedule (CloudPanel > Cron Jobs), e.g. daily 02:00:
//   cd /home/<site-user>/htdocs/twibbon.alakhyar.sch.id && node scripts/cleanup.mjs
import { PrismaClient } from '@prisma/client';
import { rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const prisma = new PrismaClient();
const STORAGE_DIR = resolve(process.env.STORAGE_DIR || './storage');

function keyToPath(key) {
  if (!/^[a-zA-Z0-9_-]+\.png$/.test(key)) return null; // guard traversal
  const p = resolve(join(STORAGE_DIR, key));
  return p.startsWith(STORAGE_DIR) ? p : null;
}

async function main() {
  const now = new Date();
  const rows = await prisma.twibbon.findMany({
    where: {
      NOT: { imageKey: '' },
      OR: [{ deletedAt: { not: null } }, { endDate: { lt: now } }],
    },
    select: { id: true, title: true, imageKey: true, deletedAt: true },
  });

  if (rows.length === 0) {
    console.log('Cleanup: tidak ada file yang perlu dihapus.');
    return;
  }

  let removed = 0;
  for (const r of rows) {
    const p = keyToPath(r.imageKey);
    if (p) {
      try {
        await rm(p, { force: true });
      } catch (e) {
        console.warn('  gagal hapus file', r.imageKey, e.message);
      }
    }
    await prisma.twibbon.update({
      where: { id: r.id },
      data: { imageKey: '', isActive: false, deletedAt: r.deletedAt ?? now },
    });
    removed++;
    console.log('  dibersihkan:', r.title);
  }
  console.log(`Cleanup selesai — ${removed} twibbon dibersihkan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
