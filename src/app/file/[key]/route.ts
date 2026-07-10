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
  // Wrap the Node Buffer in a Uint8Array — a valid BodyInit that satisfies the
  // Web Response type (newer @types/node no longer treats Buffer as BodyInit).
  const body = new Uint8Array(file.buffer);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(file.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
