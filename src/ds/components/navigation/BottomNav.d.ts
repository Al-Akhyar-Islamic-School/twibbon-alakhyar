import * as React from 'react';

export interface BottomNavItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Renders as the raised center action. */
  emphasized?: boolean;
}

export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  items: BottomNavItem[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}

/** Bottom tab bar for the Dinar app (Home, Info SPP, Kartu Digital, Kegiatan, Akun). */
export function BottomNav(props: BottomNavProps): JSX.Element;
