'use client';
import React from 'react';

/**
 * Surface container. The Dinar app's fundamental building block:
 * white, softly rounded, soft cool shadow.
 */
export function Card({ children, padding = 'md', tone = 'default', interactive = false, style = {}, ...rest }) {
  const pads = { none: 0, sm: 12, md: 16, lg: 20 };
  const tones = {
    default: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' },
    sunken:  { background: 'var(--surface-sunken)', border: '1px solid transparent' },
    brand:   { background: 'var(--brand)', border: '1px solid var(--brand)', color: '#fff' },
    green:   { background: 'var(--color-green-100)', border: '1px solid transparent' },
  };
  const t = tones[tone] || tones.default;
  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        boxShadow: tone === 'sunken' ? 'none' : 'var(--shadow-sm)',
        padding: pads[padding] ?? 16,
        transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base)',
        cursor: interactive ? 'pointer' : 'default',
        ...t, ...style,
      }}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)'; } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}