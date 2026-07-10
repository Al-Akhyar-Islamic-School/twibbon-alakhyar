import * as React from 'react';

/**
 * Props for the metric highlight card.
 * @startingPoint section="Data" subtitle="Metric highlight card" viewport="700x150"
 */
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  caption?: React.ReactNode;
  /** Small trend marker, e.g. "↗". */
  trend?: React.ReactNode;
  /** @default 'green' */
  tone?: 'green' | 'brand' | 'sky' | 'magenta';
  icon?: React.ReactNode;
}

/** Metric highlight card (e.g. the report-average widget). */
export function StatCard(props: StatCardProps): JSX.Element;
