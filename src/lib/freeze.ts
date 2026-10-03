import { NextResponse } from 'next/server';

// Maintenance switch used during data migration / cutover. When
// UPLOADS_FROZEN=1, every write to twibbons is refused so the database and
// stored files stay unchanged while they are copied elsewhere. Reads (Home,
// editor, file serving, download counting) keep working.
export function uploadsFrozen(): boolean {
  return process.env.UPLOADS_FROZEN === '1' || process.env.UPLOADS_FROZEN === 'true';
}

export function frozenResponse() {
  return NextResponse.json(
    {
      error:
        'Sedang pemeliharaan sistem. Upload, edit, dan hapus twibbon dinonaktifkan sementara. Silakan coba lagi nanti.',
    },
    { status: 503 }
  );
}
