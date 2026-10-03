import { purgeCache } from '@netlify/functions';

// Twibbon files are immutable per key, so /file/[key] responses are cached on
// Netlify's CDN (edge + durable cache) for a year and survive deploys. Each
// response is tagged so a single file can be purged when it is deleted.

export function fileCacheTag(key: string): string {
  return `file-${key.replace(/\.png$/, '')}`;
}

export function fileCacheHeaders(key: string): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Netlify-CDN-Cache-Control': 'public, durable, max-age=31536000, immutable',
    // A custom cache ID opts the object out of per-deploy invalidation and
    // doubles as a purge tag.
    'Netlify-Cache-ID': `twibbon-files,${fileCacheTag(key)}`,
  };
}

/**
 * Best-effort CDN purge for deleted/replaced files. No-op outside Netlify
 * (SITE_ID is only present in the Netlify runtime). Netlify normally injects
 * the purge token into functions; NETLIFY_PURGE_TOKEN (a personal access token)
 * is an explicit fallback if the logs ever show the token is missing.
 */
export async function purgeFileCache(keys: string[]): Promise<void> {
  const tags = keys.filter(Boolean).map(fileCacheTag);
  if (tags.length === 0 || !process.env.SITE_ID) return;
  try {
    await purgeCache({
      tags,
      ...(process.env.NETLIFY_PURGE_TOKEN ? { token: process.env.NETLIFY_PURGE_TOKEN } : {}),
    });
  } catch (err) {
    console.warn('purgeFileCache failed', tags, err);
  }
}
