import { prisma } from '@/lib/db';
import { isPubliclyVisible, serializeTwibbon } from '@/lib/twibbon';
import { SiteHeader } from '@/components/SiteHeader';
import { TwibbonCard } from '@/components/TwibbonCard';

// Home is dynamic so the active list always reflects current toggles/schedule.
export const dynamic = 'force-dynamic';

async function getActiveTwibbons() {
  const rows = await prisma.twibbon.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const now = new Date();
  return rows.filter((t) => isPubliclyVisible(t, now)).map((t) => serializeTwibbon(t));
}

function EmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--space-10) var(--space-4)',
        color: 'var(--text-muted)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/siswa-sd-belajar.png"
        alt=""
        style={{ width: 160, height: 'auto', margin: '0 auto var(--space-4)', borderRadius: 'var(--radius-lg)' }}
      />
      <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-heading)', fontWeight: 700 }}>
        Belum Ada Twibbon Aktif
      </h2>
      <p style={{ margin: '8px auto 0', maxWidth: 320, fontSize: 14 }}>
        Saat ada event Al Akhyar, twibbonnya akan tampil di sini. Sampai jumpa
        di campaign berikutnya, insya Allah.
      </p>
    </div>
  );
}

export default async function HomePage() {
  const twibbons = await getActiveTwibbons();

  return (
    <>
      <SiteHeader />
      <main className="page-pad stack gap-4" style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>
            Twibbon Aktif
          </h2>
          {twibbons.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {twibbons.length} tersedia
            </span>
          )}
        </div>

        {twibbons.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="twibbon-grid">
            {twibbons.map((t) => (
              <TwibbonCard key={t.id} twibbon={t} />
            ))}
          </div>
        )}

        <footer
          style={{
            marginTop: 'auto',
            paddingTop: 'var(--space-8)',
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          © {new Date().getFullYear()} Yayasan Al Akhyar · Unggul &amp; Berakhlak
        </footer>
      </main>
    </>
  );
}
