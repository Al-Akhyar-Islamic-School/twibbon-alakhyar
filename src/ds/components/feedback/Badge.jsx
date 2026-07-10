'use client';
import React from 'react';

/**
 * Pill badge / status chip. Used all over the Dinar app:
 * "Baru", "Segera", "Hari Libur", memorization grades (Mumtaz, Jayyid Jiddan).
 */
export function Badge({ children, tone = 'brand', variant = 'soft', size = 'sm', style = {}, ...rest }) {
  const palette = {
    brand:   { solid: ['var(--brand)', '#fff'],            soft: ['var(--color-primary-50)', 'var(--brand-strong)'] },
    sky:     { solid: ['var(--color-sky-500)', '#fff'],    soft: ['var(--color-sky-100)', 'var(--color-sky-600)'] },
    magenta: { solid: ['var(--color-magenta-500)', '#fff'],soft: ['var(--color-magenta-100)', 'var(--color-magenta-600)'] },
    green:   { solid: ['var(--color-green-500)', '#fff'],  soft: ['var(--color-green-100)', 'var(--color-green-600)'] },
    red:     { solid: ['var(--color-coral-500)', '#fff'],  soft: ['var(--color-coral-100)', 'var(--color-coral-600)'] },
    amber:   { solid: ['var(--color-amber-500)', '#5a3d00'],soft: ['var(--color-amber-100)', '#8a6410'] },
    neutral: { solid: ['var(--color-slate-500)', '#fff'],  soft: ['var(--color-slate-100)', 'var(--color-slate-700)'] },
  };
  const p = (palette[tone] || palette.brand)[variant] || palette.brand.soft;
  const sizes = {
    xs: { fontSize: 10, padding: '2px 7px' },
    sm: { fontSize: 11, padding: '3px 9px' },
    md: { fontSize: 12, padding: '4px 11px' },
  };
  const s = sizes[size] || sizes.sm;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: 'var(--font-sans)', fontWeight: 700, lineHeight: 1.4,
        borderRadius: 'var(--radius-pill)',
        background: p[0], color: p[1],
        ...s, ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}