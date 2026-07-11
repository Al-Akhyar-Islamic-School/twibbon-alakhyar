import type { Twibbon } from '@prisma/client';
import { publicUrlForKey } from './storage';

// Whether a twibbon should show on the public Home page right now (FR-01):
// active toggle ON, not soft-deleted, and within its scheduled window if set.
export function isPubliclyVisible(t: Twibbon, now = new Date()): boolean {
  if (t.deletedAt) return false;
  if (!t.isActive) return false;
  if (t.startDate && now < t.startDate) return false;
  if (t.endDate && now > t.endDate) return false;
  return true;
}

export type TwibbonDTO = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  width: number;
  height: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  createdByName: string | null;
  downloadCount?: number;
};

// A Twibbon row that may have its creator relation included in the query.
type TwibbonWithCreator = Twibbon & { createdBy?: { name: string | null } | null };

export function serializeTwibbon(
  t: TwibbonWithCreator,
  extra?: { downloadCount?: number }
): TwibbonDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    imageUrl: publicUrlForKey(t.imageKey),
    width: t.width,
    height: t.height,
    isActive: t.isActive,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    endDate: t.endDate ? t.endDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    createdByName: t.createdBy?.name ?? null,
    ...(extra?.downloadCount != null ? { downloadCount: extra.downloadCount } : {}),
  };
}
