import { forwardRef, useId } from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className, onKeyDown, onFocus, ...props }, ref) => {
    const generatedId = useId()
    const inputId = props.id || generatedId

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const input = e.currentTarget
      const len = input.value.length
      input.setSelectionRange(len, len)

      const fixCursor = () => {
        if (input.selectionStart === 0 && input.selectionEnd === 0 && input.value.length > 0) {
          input.setSelectionRange(len, len)
        }
      }
      requestAnimationFrame(fixCursor)
      setTimeout(fixCursor, 50)
      setTimeout(fixCursor, 150)

      onFocus?.(e)
    }

    return (
      <div className="flex flex-col gap-2 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[var(--tv-text-muted)] text-base">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full px-4 py-3 rounded-lg bg-[var(--tv-surface)] border border-[var(--tv-border)]',
            'text-[var(--tv-text)] text-lg placeholder:text-[var(--tv-text-muted)]',
            'focus-ring focus:border-[var(--tv-accent)]',
            className,
          )}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          {...props}
        />
      </div>
    )
  },
)

Input.displayName = 'Input'