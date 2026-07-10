import Link from 'next/link';
import { Button } from '@/ds';

export default function NotFound() {
  return (
    <main
      className="page-pad stack gap-4"
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
    >
      <h1 style={{ fontSize: 20, color: 'var(--text-heading)', margin: 0 }}>
        Twibbon Tidak Ditemukan
      </h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 320 }}>
        Twibbon ini mungkin sudah dinonaktifkan atau dihapus.
      </p>
      <Link href="/">
        <Button>Kembali ke Beranda</Button>
      </Link>
    </main>
  );
}
