'use client';
import React from 'react';

/**
 * Al Akhyar primary action button.
 * Variants map to the Dinar app's action styles.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { fontSize: 13, padding: '8px 14px', gap: 6, radius: 'var(--radius-sm)' },
    md: { fontSize: 15, padding: '11px 20px', gap: 8, radius: 'var(--radius-md)' },
    lg: { fontSize: 16, padding: '14px 26px', gap: 8, radius: 'var(--radius-md)' },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: 'var(--brand)',
      color: 'var(--text-on-brand)',
      border: '1px solid var(--brand)',
      boxShadow: 'var(--shadow-brand)',
    },
    secondary: {
      background: 'var(--brand-soft)',
      color: 'var(--brand-strong)',
      border: '1px solid transparent',
      boxShadow: 'none',
    },
    outline: {
      background: 'var(--surface-card)',
      color: 'var(--brand)',
      border: '1px solid var(--border-strong)',
      boxShadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--brand)',
      border: '1px solid transparent',
      boxShadow: 'none',
    },
    magenta: {
      background: 'var(--accent-magenta)',
      color: '#fff',
      border: '1px solid var(--accent-magenta)',
      boxShadow: '0 10px 24px rgba(236,42,107,0.22)',
    },
    danger: {
      background: 'var(--state-danger)',
      color: '#fff',
      border: '1px solid var(--state-danger)',
      boxShadow: 'none',
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        width: block ? '100%' : 'auto',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: s.fontSize,
        lineHeight: 1,
        padding: s.padding,
        borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform var(--dur-fast) var(--ease-standard), filter var(--dur-fast) var(--ease-standard)',
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}