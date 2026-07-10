'use client';
import React from 'react';

/**
 * Statistic / metric card. The report-average highlight on the Dinar home.
 */
export function StatCard({ label, value, unit = null, caption = null, trend = null, tone = 'green', icon = null, style = {}, ...rest }) {
  const tones = {
    green: { bg: 'var(--color-green-100)', ink: 'var(--color-green-600)' },
    brand: { bg: 'var(--color-primary-50)', ink: 'var(--brand-strong)' },
    sky:   { bg: 'var(--color-sky-100)', ink: 'var(--color-sky-600)' },
    magenta:{ bg: 'var(--color-magenta-100)', ink: 'var(--color-magenta-600)' },
  };
  const t = tones[tone] || tones.green;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      background: t.bg, borderRadius: 'var(--radius-lg)', padding: 16,
      fontFamily: 'var(--font-sans)', ...style,
    }} {...rest}>
      <div>
        {label && <div style={{ fontSize: 12, color: t.ink, opacity: 0.85, fontWeight: 500 }}>{label}</div>}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: t.ink, lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ fontSize: 14, fontWeight: 600, color: t.ink }}>{unit}</span>}
          {trend && <span style={{ fontSize: 13, fontWeight: 700, color: t.ink }}>{trend}</span>}
        </div>
        {caption && <div style={{ fontSize: 12, color: t.ink, opacity: 0.8, marginTop: 6 }}>{caption}</div>}
      </div>
      {icon && <div style={{ color: t.ink, opacity: 0.9, flexShrink: 0 }}>{icon}</div>}
    </div>
  );
}