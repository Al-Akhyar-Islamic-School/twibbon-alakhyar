export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main
      className="page-pad stack gap-4"
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-twibbon.png" alt="Twibbon Al Akhyar" style={{ width: '100%', maxWidth: 200, height: 'auto' }} />
      <h1 style={{ fontSize: 20, color: 'var(--text-heading)', margin: 0 }}>Sedang Offline</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 320 }}>
        Sambungkan kembali ke internet untuk memuat twibbon terbaru. Halaman
        yang pernah dibuka tetap bisa diakses.
      </p>
    </main>
  );
}
