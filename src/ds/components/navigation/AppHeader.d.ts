import * as React from 'react';

export interface AppHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Header color; follows the feature. @default 'brand' */
  tone?: 'brand' | 'sky' | 'red' | 'magenta';
  /** Provide a handler to show the back chevron. */
  onBack?: () => void;
  /** Logo node shown at the right (e.g. an <img>). */
  logo?: React.ReactNode;
}

/** Colored, round-bottomed feature-screen header for the Dinar app. */
export function AppHeader(props: AppHeaderProps): JSX.Element;
