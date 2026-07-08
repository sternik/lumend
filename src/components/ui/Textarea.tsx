import { forwardRef, useId } from 'react'
import { clsx } from 'clsx'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className, onKeyDown, onFocus, ...props }, ref) => {
    const generatedId = useId()
    const inputId = props.id || generatedId

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
      }

      if (e.keyCode === 461 || e.key === 'BrowserBack' || e.code === 'BrowserBack') {
        e.preventDefault()
        e.stopPropagation()
        e.currentTarget.blur()
      }

      onKeyDown?.(e)
    }

    return (
      <div className="flex flex-col gap-2 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[var(--tv-text-muted)] text-base">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={1}
          className={clsx(
            'w-full px-4 py-3 rounded-lg bg-[var(--tv-surface)] border border-[var(--tv-border)]',
            'text-[var(--tv-text)] text-lg placeholder:text-[var(--tv-text-muted)]',
            'focus-ring focus:border-[var(--tv-accent)] resize-none overflow-hidden leading-snug',
            className,
          )}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          {...props}
        />
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'