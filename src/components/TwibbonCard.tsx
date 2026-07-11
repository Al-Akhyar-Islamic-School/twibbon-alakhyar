'use client';
import Link from 'next/link';
import { Card, Badge } from '@/ds';
import { formatRange, scheduleStatus } from '@/lib/format';
import type { TwibbonDTO } from '@/lib/twibbon';

const STATUS_BADGE: Record<string, { label: string; tone: 'green' | 'amber' | 'neutral' }> = {
  active: { label: 'Aktif', tone: 'green' },
  upcoming: { label: 'Segera', tone: 'amber' },
  ended: { label: 'Berakhir', tone: 'neutral' },
};

export function TwibbonCard({ twibbon }: { twibbon: TwibbonDTO }) {
  const status = scheduleStatus(twibbon.startDate, twibbon.endDate);
  const badge = STATUS_BADGE[status];
  const range = formatRange(twibbon.startDate, twibbon.endDate);

  return (
    <Link href={`/editor/${twibbon.id}`} aria-label={`Buat twibbon ${twibbon.title}`}>
      <Card padding="none" interactive style={{ overflow: 'hidden' }}>
        <div className="thumb checker">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={twibbon.imageUrl} alt={twibbon.title} loading="lazy" />
          <span style={{ position: 'absolute', top: 8, left: 8 }}>
            <Badge tone={badge.tone} variant="soft">
              {badge.label}
            </Badge>
          </span>
        </div>
        <div style={{ padding: '10px 12px 12px' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-heading)',
              lineHeight: 1.25,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {twibbon.title}
          </div>
          {range && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {range}
            </div>
          )}
          {twibbon.createdByName && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              dibuat oleh {twibbon.createdByName}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
