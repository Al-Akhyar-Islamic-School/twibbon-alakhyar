import * as React from 'react';

/**
 * Props for the Al Akhyar action button.
 * @startingPoint section="Forms" subtitle="Action buttons in every variant" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'primary' */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'magenta' | 'danger';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to full container width. @default false */
  block?: boolean;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Primary action button for the Al Akhyar / Dinar interface. */
export function Button(props: ButtonProps): JSX.Element;
