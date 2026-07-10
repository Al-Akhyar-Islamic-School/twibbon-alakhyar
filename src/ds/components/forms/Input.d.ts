import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  /** Error message; also turns the field red. */
  error?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  /** @default 'md' */
  size?: 'md' | 'lg';
}

/** Labelled text field for Dinar forms and search. */
export function Input(props: InputProps): JSX.Element;
