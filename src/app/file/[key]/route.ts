import { NextRequest } from 'next/server';
import { getFile } from '@/lib/storage';
import { fileCacheHeaders } from '@/lib/cdn';

// Serves twibbon PNGs from R2 on the app's own origin, so existing /file/<key>
// links, OG previews and canvas compositing (no CORS) keep working. The body is
// streamed rather than buffered, and responses are cached on the CDN for a year
// (keys are immutable), so during busy events the function is rarely invoked.
export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } }
) {
  const file = await getFile(params.key);
  if (!file) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Netlify-CDN-Cache-Control': 'public, max-age=60',
      },
    });
  }
  return new Response(file.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      ...(file.size != null ? { 'Content-Length': String(file.size) } : {}),
      ...fileCacheHeaders(params.key),
    },
  });
}
