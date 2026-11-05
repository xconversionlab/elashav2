import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

const variants: Record<Variant, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-700',
  secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300',
  outline: 'border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white',
  ghost: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
