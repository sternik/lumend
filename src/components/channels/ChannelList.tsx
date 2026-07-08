import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { clsx } from 'clsx'
import type { Channel } from '../../types/channel'
import type { EpgEvent } from '../../types/epg'

interface ChannelListProps {
  channels: Channel[]
  epgEvents: EpgEvent[]
  selectedIndex: number
  visible: boolean
  onSelect: (index: number) => void
  onClose: (index?: number) => void
}

export interface ChannelListHandle {
  focus: () => void
  moveUp: () => void
  moveDown: () => void
}

export const ChannelList = forwardRef<ChannelListHandle, ChannelListProps>(
  ({ channels, epgEvents, selectedIndex, visible, onSelect, onClose }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
    const prevSelectedIndex = useRef(selectedIndex)

    useImperativeHandle(ref, () => ({
      focus: () => itemRefs.current[selectedIndex]?.focus(),
      moveUp: () => {
        if (selectedIndex > 0) onSelect(selectedIndex - 1)
      },
      moveDown: () => {
        if (selectedIndex < channels.length - 1) onSelect(selectedIndex + 1)
      },
    }))

    useEffect(() => {
      if (!visible) return
      const el = itemRefs.current[selectedIndex]
      if (el) {
        el.focus({ preventScroll: true })

        const direction = selectedIndex > prevSelectedIndex.current ? 1 : -1
        const targetIndex = Math.max(0, Math.min(channels.length - 1, selectedIndex + direction))
        const targetEl = itemRefs.current[targetIndex]
        targetEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' })

        prevSelectedIndex.current = selectedIndex
      }
    }, [visible, selectedIndex, channels.length])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!visible) return
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          onSelect(selectedIndex > 0 ? selectedIndex - 1 : channels.length - 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          onSelect(selectedIndex < channels.length - 1 ? selectedIndex + 1 : 0)
          break
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          onClose()
          break
      }
    }

    const now = Date.now()
    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }

    return (
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className={clsx(
          'absolute top-0 left-0 h-full w-[560px] z-20 bg-[var(--tv-bg)]/95 backdrop-blur-md',
          'border-r border-white/10 shadow-2xl',
          'transition-transform duration-250 ease-out flex flex-col',
          visible ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 py-3 border-b border-white/10 shrink-0 flex items-baseline gap-3">
          <h2 className="text-xl font-bold">Channels</h2>
          <span className="text-xs text-[var(--tv-text-muted)]">{channels.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto py-1 min-h-0">
          {channels.map((channel, index) => {
            const currentEvent = epgEvents.find(
              (e) => e.channelId === channel.id && e.start <= now && e.stop > now,
            )
            const isSelected = index === selectedIndex
            const progress = currentEvent
              ? Math.min(100, Math.max(0, ((now - currentEvent.start) / (currentEvent.stop - currentEvent.start)) * 100))
              : 0

            return (
              <button
                key={channel.id}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                className={clsx(
                  'w-full flex items-center px-4 py-2 mx-1 rounded-lg text-left transition-all duration-100 relative',
                  'focus:outline-none',
                  isSelected
                    ? 'bg-[var(--tv-accent)]/15'
                    : 'hover:bg-white/5',
                )}
                onClick={() => {
                  onSelect(index)
                  onClose(index)
                }}
              >
                {isSelected && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[var(--tv-accent)]" />
                )}

                <span className={clsx(
                  'w-8 text-center text-base font-bold shrink-0 tabular-nums',
                  isSelected ? 'text-[var(--tv-accent)]' : 'text-white/30',
                )}>
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0 ml-3">
                  <div className={clsx(
                    'truncate text-base',
                    isSelected ? 'text-white font-medium' : 'text-white/80',
                  )}>
                    {channel.name}
                  </div>

                  {currentEvent && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-white/50 truncate">{currentEvent.title}</span>
                    </div>
                  )}
                </div>

                {currentEvent && (
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-white/40 tabular-nums">
                      {formatTime(currentEvent.start)}
                    </span>
                    <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--tv-accent)]/60 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  },
)

ChannelList.displayName = 'ChannelList'
