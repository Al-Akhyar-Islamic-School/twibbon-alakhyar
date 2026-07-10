import * as React from 'react';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** e.g. "Lihat semua". Renders a text link with a trailing arrow. */
  actionLabel?: React.ReactNode;
  onAction?: () => void;
}

/** Bold section title with an optional "see all" action, as in the Dinar home. */
export function SectionHeader(props: SectionHeaderProps): JSX.Element;
