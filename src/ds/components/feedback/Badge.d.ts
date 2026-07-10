import * as React from 'react';

/**
 * Props for the status pill / chip.
 * @startingPoint section="Feedback" subtitle="Status pills & grade chips" viewport="700x150"
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color family. @default 'brand' */
  tone?: 'brand' | 'sky' | 'magenta' | 'green' | 'red' | 'amber' | 'neutral';
  /** Fill style. @default 'soft' */
  variant?: 'soft' | 'solid';
  /** @default 'sm' */
  size?: 'xs' | 'sm' | 'md';
  children?: React.ReactNode;
}

/** Status pill / chip. */
export function Badge(props: BadgeProps): JSX.Element;
