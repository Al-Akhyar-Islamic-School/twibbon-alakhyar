import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serializeTwibbon } from '@/lib/twibbon';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; email?: string } | undefined;
  if (!user?.id) redirect('/login');

  const rows = await prisma.twibbon.findMany({
    where: { createdById: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { downloads: true } } },
  });
  const twibbons = rows.map((t) => serializeTwibbon(t, { downloadCount: t._count.downloads }));

  async function doSignOut() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <>
      <header
        style={{
          background: 'var(--feature-header-blue)',
          color: '#fff',
          padding: '16px 16px 22px',
          borderBottomLeftRadius: 'var(--radius-xl)',
          borderBottomRightRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Link
            href="/"
            aria-label="Beranda"
            style={{
              background: 'rgba(255,255,255,0.16)',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ‹
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Dashboard Twibbon</div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.name || user.email}
            </div>
          </div>
        </div>
        <form action={doSignOut}>
          <button
            type="submit"
            style={{
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Keluar
          </button>
        </form>
      </header>

      <main className="page-pad" style={{ flex: 1 }}>
        <DashboardClient initialTwibbons={twibbons} />
      </main>
    </>
  );
}
