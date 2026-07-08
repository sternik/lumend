import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'rounded-lg font-medium transition-all duration-150 focus-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'primary' && 'bg-[var(--tv-accent)] text-white hover:bg-blue-500',
          variant === 'secondary' && 'bg-[var(--tv-surface)] text-[var(--tv-text)] hover:bg-[var(--tv-surface-highlight)]',
          variant === 'danger' && 'bg-[var(--tv-danger)] text-white hover:bg-red-600',
          size === 'sm' && 'px-4 py-2 text-base',
          size === 'md' && 'px-6 py-3 text-lg',
          size === 'lg' && 'px-8 py-4 text-xl',
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    )
  },
)

Button.displayName = 'Button'
