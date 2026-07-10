import { NextRequest } from 'next/server';
import { getFile } from '@/lib/storage';

// Serves twibbon PNGs from the storage driver with long-lived caching so a
// CDN / the service worker can hold them during high-traffic events.
export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } }
) {
  const file = await getFile(params.key);
  if (!file) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(file.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(file.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
