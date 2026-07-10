import * as React from 'react';

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small eyebrow above the title (day, date, category). */
  meta?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** CSS color for the left accent bar. */
  accent?: string;
  highlighted?: boolean;
}

/** Schedule / agenda list row (roster, agenda, prayer times). */
export function ListRow(props: ListRowProps): JSX.Element;
