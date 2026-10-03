import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MAX_FILE_BYTES } from '@/lib/limits';
import { createUploadUrl } from '@/lib/storage';
import { uploadsFrozen, frozenResponse } from '@/lib/freeze';

// POST /api/uploads/sign — step 1 of an upload. Returns a short-lived presigned
// URL the browser PUTs the PNG to directly (bypassing the serverless body
// limit), plus the pending key to pass to POST/PATCH /api/twibbons afterwards.
export async function POST(req: NextRequest) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (uploadsFrozen()) return frozenResponse();

  let body: { size?: unknown; contentType?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const size = Number(body.size);
  if (!Number.isInteger(size) || size <= 0) {
    return NextResponse.json({ error: 'Ukuran file tidak valid.' }, { status: 400 });
  }
  if (size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Ukuran file melebihi batas ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB.` },
      { status: 400 }
    );
  }
  if (body.contentType !== 'image/png') {
    return NextResponse.json({ error: 'File harus berformat PNG.' }, { status: 400 });
  }

  const { uploadUrl, pendingKey } = await createUploadUrl(size);
  return NextResponse.json({ uploadUrl, pendingKey });
}
