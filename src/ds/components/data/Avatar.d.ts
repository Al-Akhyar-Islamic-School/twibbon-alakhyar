import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  /** Used for initials fallback and alt text. */
  name?: string;
  /** Diameter in px. @default 40 */
  size?: number;
  /** Ring color by jenjang keyword ('tk'|'sd'|'smp'|'sma') or any CSS color. */
  ring?: 'tk' | 'sd' | 'smp' | 'sma' | string | null;
}

/** Circular avatar with initials fallback and optional jenjang ring. */
export function Avatar(props: AvatarProps): JSX.Element;
