import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
import { ALLOWED_DOMAIN } from '@/lib/domain';
import { LoginButton } from './LoginButton';

export const metadata = { title: 'Buat Twibbon' };

const googleConfigured = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const error = searchParams.error;

  async function doLogin() {
    'use server';
    await signIn('google', { redirectTo: '/dashboard' });
  }

  return (
    <main
      className="page-pad stack gap-6"
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
    >
      <div className="stack gap-4" style={{ alignItems: 'center', maxWidth: 360 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-twibbon.png"
          alt="Twibbon Al Akhyar"
          style={{ width: '100%', maxWidth: 240, height: 'auto' }}
        />
        <div>
          <h1 style={{ fontSize: 22, margin: 0, color: 'var(--text-heading)' }}>Buat Twibbon</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Masuk dengan email sekolah{' '}
            <strong style={{ color: 'var(--brand)' }}>@{ALLOWED_DOMAIN}</strong> (termasuk
            subdomain jenjang) untuk membuat &amp; mengelola twibbon.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              width: '100%',
              background: 'var(--state-danger-bg)',
              color: 'var(--color-coral-600)',
              border: '1px solid var(--color-coral-100)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            {error === 'AccessDenied'
              ? `Email Anda bukan domain @${ALLOWED_DOMAIN}. Gunakan email sekolah Al Akhyar.`
              : 'Login gagal. Silakan coba lagi.'}
          </div>
        )}

        {googleConfigured ? (
          <form action={doLogin} style={{ width: '100%' }}>
            <LoginButton />
          </form>
        ) : (
          <div
            style={{
              width: '100%',
              background: 'var(--state-warning-bg)',
              color: '#8a6410',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            Google OAuth belum dikonfigurasi. Set <code>AUTH_GOOGLE_ID</code> &amp;{' '}
            <code>AUTH_GOOGLE_SECRET</code> di <code>.env</code> untuk mengaktifkan login.
          </div>
        )}

        <Link href="/" style={{ fontSize: 13, color: 'var(--text-link)', fontWeight: 600 }}>
          ← Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
