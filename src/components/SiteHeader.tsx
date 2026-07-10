import Link from 'next/link';
import { auth } from '@/lib/auth';

// Home header — brand-blue feature header (AppHeader pattern): logo left,
// login / dashboard link right. Server component so it can read the session.
export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header
      style={{
        background: 'var(--feature-header-blue)',
        color: '#fff',
        padding: '18px 18px 26px',
        borderBottomLeftRadius: 'var(--radius-xl)',
        borderBottomRightRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-yayasan-white.png"
            alt="Yayasan Al Akhyar"
            style={{ height: 34, width: 'auto' }}
          />
        </Link>

        {user ? (
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.16)',
              padding: '6px 12px 6px 6px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.image || '/brand/logo-yayasan-alif-mark.png'}
              alt=""
              width={26}
              height={26}
              style={{ borderRadius: '50%', background: '#fff', objectFit: 'cover' }}
            />
            Dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fff',
              color: 'var(--brand)',
              padding: '9px 16px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Login Staff
          </Link>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
          Assalamu&apos;alaikum 👋
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            margin: '4px 0 0',
            letterSpacing: 'var(--ls-tight)',
          }}
        >
          Twibbon Al Akhyar
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9, maxWidth: 460 }}>
          Pilih twibbon aktif, pasang fotomu, lalu unduh. Semua diproses di
          perangkatmu — fotomu tidak pernah diunggah.
        </p>
      </div>
    </header>
  );
}
