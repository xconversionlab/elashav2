import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-bone/90">{label}</span>}
      <input
        {...props}
        className={`w-full border border-charcoal-border bg-charcoal px-4 py-3 text-sm text-bone outline-none transition-all duration-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 rounded-sm placeholder:text-bone-muted/40 disabled:opacity-60 disabled:cursor-not-allowed ${className ?? ''}`}
      />
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-400">{error}</span>}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-bone/90">{label}</span>}
      <select
        {...props}
        className={`w-full border border-charcoal-border bg-charcoal px-4 py-3 text-sm text-bone outline-none transition-all duration-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 rounded-sm disabled:opacity-60 disabled:cursor-not-allowed ${className ?? ''}`}
      >
        {children}
      </select>
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-bone/90">{label}</span>}
      <textarea
        {...props}
        className={`w-full border border-charcoal-border bg-charcoal px-4 py-3 text-sm text-bone outline-none transition-all duration-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 rounded-sm placeholder:text-bone-muted/40 disabled:opacity-60 disabled:cursor-not-allowed ${className ?? ''}`}
      />
    </label>
  );
}
