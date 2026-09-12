import type { ReactNode } from 'react';
import { Link, type To } from 'react-router-dom';
import {
  type ButtonSize,
  type ButtonVariant,
  getButtonClassNames,
} from './Button';

export interface LinkButtonProps {
  to: To;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
  ariaLabel?: string;
}

/**
 * Router-aware button that renders a React Router <Link> so internal
 * navigation stays client-side (no full-page reloads).
 */
export function LinkButton({
  to,
  variant,
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ariaLabel,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={getButtonClassNames({ variant, size, fullWidth, className })}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}

export default LinkButton;