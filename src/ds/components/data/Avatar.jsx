'use client';
import React from 'react';

/**
 * Avatar — circular image or initials. Optional ring for jenjang (TK/SD/SMP/SMA).
 */
export function Avatar({ src = null, name = '', size = 40, ring = null, style = {}, ...rest }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const rings = {
    tk: 'var(--color-magenta-500)', sd: 'var(--brand)',
    smp: 'var(--color-sky-500)', sma: 'var(--color-green-500)',
  };
  const ringColor = ring ? (rings[ring] || ring) : null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: 'var(--color-primary-100)', color: 'var(--brand-strong)',
      fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: size * 0.38,
      overflow: 'hidden', flexShrink: 0,
      boxShadow: ringColor ? `0 0 0 2px var(--surface-card), 0 0 0 4px ${ringColor}` : 'none',
      ...style,
    }} {...rest}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (initials || '?')}
    </span>
  );
}