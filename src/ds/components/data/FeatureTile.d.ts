import * as React from 'react';

export interface FeatureTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: React.ReactNode;
  /** Icon node (img / SVG / glyph) shown on the plate. */
  icon?: React.ReactNode;
  /** Plate color family. @default 'brand' */
  tone?: 'brand' | 'sky' | 'magenta' | 'green' | 'amber' | 'red';
  /** Corner badge text, e.g. "Baru". */
  badge?: React.ReactNode;
  /** @default 'magenta' */
  badgeTone?: 'brand' | 'sky' | 'magenta' | 'green' | 'red' | 'amber' | 'neutral';
}

/** Icon tile from the Dinar home feature grid. */
export function FeatureTile(props: FeatureTileProps): JSX.Element;
