import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 'md' */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** @default 'default' */
  tone?: 'default' | 'sunken' | 'brand' | 'green';
  /** Adds hover lift. @default false */
  interactive?: boolean;
  children?: React.ReactNode;
}

/** Softly rounded surface container — the Dinar app's base building block. */
export function Card(props: CardProps): JSX.Element;
