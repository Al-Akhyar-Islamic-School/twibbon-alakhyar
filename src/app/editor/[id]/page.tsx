import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { serializeTwibbon } from '@/lib/twibbon';
import { TwibbonEditor } from '@/components/TwibbonEditor';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

async function getTwibbon(id: string) {
  const t = await prisma.twibbon.findFirst({ where: { id, deletedAt: null } });
  return t ? serializeTwibbon(t) : null;
}

// Per-twibbon Open Graph so shared links look good on WhatsApp/social (NFR SEO).
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const t = await getTwibbon(params.id);
  if (!t) return { title: 'Twibbon tidak ditemukan' };
  const image = `${SITE_URL}${t.imageUrl}`;
  return {
    title: t.title,
    description: t.description || `Buat twibbon ${t.title} — Yayasan Al Akhyar.`,
    openGraph: {
      title: t.title,
      description: t.description || `Pasang fotomu di twibbon ${t.title}.`,
      images: [{ url: image, width: t.width, height: t.height }],
    },
  };
}

export default async function EditorPage({ params }: { params: { id: string } }) {
  const twibbon = await getTwibbon(params.id);
  if (!twibbon) notFound();
  return <TwibbonEditor twibbon={twibbon} />;
}
