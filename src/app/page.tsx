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
      <div
        aria-hidden="true"
        style={{
          width: 96,
          height: 96,
          margin: '0 auto var(--space-4)',
          borderRadius: '50%',
          background: 'var(--brand-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.6" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
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
          © {new Date().getFullYear()} Yayasan Al Akhyar · Unggul &amp; Berakhlak · Made with
          love f/ @azhardz
        </footer>
      </main>
    </>
  );
}
