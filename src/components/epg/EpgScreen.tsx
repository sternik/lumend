import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import type { Channel } from '../../types/channel'
import type { EpgEvent } from '../../types/epg'

interface EpgScreenProps {
  channels: Channel[]
  epgEvents: EpgEvent[]
  selectedChannelIndex: number
  visible: boolean
  onChannelSelect: (index: number) => void
  onClose: () => void
}

const VISIBLE_HOURS = 3
const HOUR_MS = 60 * 60 * 1000
const HALF_HOUR_MS = 30 * 60 * 1000
const HALF_HOUR_STEPS = VISIBLE_HOURS * 2
const ROW_HEIGHT_PX = 64

export function EpgScreen({
  channels,
  epgEvents,
  selectedChannelIndex,
  visible,
  onChannelSelect,
  onClose,
}: EpgScreenProps) {
  const [timeOffset, setTimeOffset] = useState(0)
  const [highlightedChannelIndex, setHighlightedChannelIndex] = useState(selectedChannelIndex)
  const [readyToConfirm, setReadyToConfirm] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const containerRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<Array<HTMLDivElement | null>>([])

  const highlightedIndexRef = useRef(highlightedChannelIndex)
  highlightedIndexRef.current = highlightedChannelIndex

  const readyToConfirmRef = useRef(readyToConfirm)
  readyToConfirmRef.current = readyToConfirm

  // Freeze "now" when the guide opens and refresh it once per minute. This avoids
  // recalculating the whole grid on every render while navigating.
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  // Reset highlight to the currently tuned channel whenever the guide is reopened.
  useEffect(() => {
    if (visible) {
      setHighlightedChannelIndex(selectedChannelIndex)
      setTimeOffset(0)
      setReadyToConfirm(false)
    }
  }, [visible, selectedChannelIndex])

  const windowStart = useMemo(() => {
    const base = new Date(now)
    const minutes = base.getMinutes()
    // Snap to the previous half-hour and shift back another half-hour so the
    // current-time indicator appears slightly inside the grid instead of on the edge.
    base.setMinutes(minutes < 30 ? 0 : 30, 0, 0)
    return base.getTime() + timeOffset * HOUR_MS - HALF_HOUR_MS
  }, [now, timeOffset])

  const windowEnd = windowStart + VISIBLE_HOURS * HOUR_MS
  const windowDuration = windowEnd - windowStart

  const highlightedChannel = channels[highlightedChannelIndex]

  const visibleEvents = useMemo(() => {
    return epgEvents
      .filter((e) => e.stop > windowStart && e.start < windowEnd)
      .sort((a, b) => a.start - b.start)
  }, [epgEvents, windowStart, windowEnd])

  // Group events by channel id so each row receives a stable array reference.
  const eventsByChannel = useMemo(() => {
    const map = new Map<string, EpgEvent[]>()
    for (const ev of visibleEvents) {
      const list = map.get(ev.channelId)
      if (list) list.push(ev)
      else map.set(ev.channelId, [ev])
    }
    return map
  }, [visibleEvents])

  // Derive the currently selected event from the highlighted channel and "now"
  // without an extra state update, so navigation no longer triggers a 2nd render.
  const selectedEventId = useMemo(() => {
    if (!highlightedChannel) return null
    const current = visibleEvents.find(
      (e) => e.channelId === highlightedChannel.id && e.start <= now && e.stop > now,
    )
    return current?.id || null
  }, [visibleEvents, highlightedChannel, now])

  const selectedEvent = useMemo(() => {
    if (!selectedEventId || !highlightedChannel) return undefined
    return visibleEvents.find((e) => e.channelId === highlightedChannel.id && e.id === selectedEventId)
  }, [visibleEvents, highlightedChannel, selectedEventId])

  // Keep stable references to the callbacks so the global key listener does not
  // need to be re-attached on every render of the parent.
  const onChannelSelectRef = useRef(onChannelSelect)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onChannelSelectRef.current = onChannelSelect
    onCloseRef.current = onClose
  }, [onChannelSelect, onClose])

  // Stable handler for row clicks: clicking the same row twice confirms the selection.
  const handleRowSelect = useCallback((index: number) => {
    if (index === highlightedIndexRef.current && readyToConfirmRef.current) {
      onChannelSelectRef.current(index)
      onCloseRef.current()
    } else {
      setHighlightedChannelIndex(index)
      setReadyToConfirm(true)
    }
  }, [])

  // Global key listener: the simulator remote buttons can steal focus from the
  // overlay, so listening on window guarantees UP/DOWN/ENTER/BACK still work.
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isArrowUp = e.key === 'ArrowUp' || e.keyCode === 38
      const isArrowDown = e.key === 'ArrowDown' || e.keyCode === 40
      const isArrowLeft = e.key === 'ArrowLeft' || e.keyCode === 37
      const isArrowRight = e.key === 'ArrowRight' || e.keyCode === 39
      const isEnter = e.key === 'Enter' || e.keyCode === 13
      const isBack =
        e.key === 'Backspace' || e.key === 'Escape' || e.key === 'BrowserBack' || e.keyCode === 461

      if (isArrowUp) {
        e.preventDefault()
        setReadyToConfirm(false)
        setHighlightedChannelIndex((idx) => (idx > 0 ? idx - 1 : channels.length - 1))
        return
      }

      if (isArrowDown) {
        e.preventDefault()
        setReadyToConfirm(false)
        setHighlightedChannelIndex((idx) => (idx < channels.length - 1 ? idx + 1 : 0))
        return
      }

      if (isArrowLeft) {
        e.preventDefault()
        setReadyToConfirm(false)
        setTimeOffset((o) => o - 0.5)
        return
      }

      if (isArrowRight) {
        e.preventDefault()
        setReadyToConfirm(false)
        setTimeOffset((o) => o + 0.5)
        return
      }

      if (isEnter) {
        e.preventDefault()
        if (readyToConfirm) {
          onChannelSelectRef.current(highlightedIndexRef.current)
          onCloseRef.current()
        } else {
          setReadyToConfirm(true)
        }
        return
      }

      if (isBack) {
        e.preventDefault()
        onCloseRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, channels.length, readyToConfirm])

  // Scroll the highlighted row into view synchronously before the browser paints.
  // Read absolute position from the DOM so it always matches real layout.
  useLayoutEffect(() => {
    const container = containerRef.current
    const row = rowsRef.current[highlightedChannelIndex]
    if (!container || !row) return

    const clientHeight = container.clientHeight
    if (clientHeight === 0) return

    const rowTop = row.offsetTop
    const rowHeight = row.offsetHeight
    const rowBottom = rowTop + rowHeight
    const viewTop = container.scrollTop
    const viewBottom = viewTop + clientHeight

    if (rowTop < viewTop) {
      container.scrollTop = rowTop
    } else if (rowBottom > viewBottom) {
      const maxScroll = container.scrollHeight - clientHeight
      container.scrollTop = Math.min(rowBottom - clientHeight, maxScroll)
    }
  }, [highlightedChannelIndex, visible])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  if (!visible) return null

  const currentTimeLeft = ((now - windowStart) / windowDuration) * 100

  return (
    <div className="absolute inset-0 z-30 bg-[var(--tv-bg)]/95 backdrop-blur-md flex flex-col">
      {/* Header with selected event details (fixed height so the grid never jumps) */}
      <div className="shrink-0 px-8 py-5 border-b border-white/10 bg-[var(--tv-surface)]/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">TV Guide</h2>
            <span className="text-[var(--tv-text-muted)]">
              {formatDate(windowStart)} {formatTime(windowStart)} - {formatTime(windowEnd)}
            </span>
          </div>
          <button
            onClick={() => setTimeOffset(0)}
            className="px-4 py-2 rounded-lg bg-[var(--tv-surface)] hover:bg-[var(--tv-surface-highlight)] text-sm"
          >
            Now
          </button>
        </div>

        <div className="flex items-start gap-8 overflow-hidden" style={{ height: '7.5rem' }}>
          <div className="flex-1 min-w-0 flex flex-col">
            {selectedEvent && highlightedChannel ? (
              <>
                <div className="text-xl font-semibold truncate">
                  {highlightedChannel.name} — {selectedEvent.title}
                </div>
                {selectedEvent.subtitle && (
                  <div className="text-base text-white/70 truncate">{selectedEvent.subtitle}</div>
                )}
                <div className="text-sm text-[var(--tv-text-muted)] mt-1">
                  {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.stop)}
                  {' · '}
                  {Math.round((selectedEvent.stop - selectedEvent.start) / 60000)} min
                </div>
                {selectedEvent.description && (
                  <div className="text-sm text-white/60 mt-2 line-clamp-4">
                    {selectedEvent.description}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[var(--tv-text-muted)] text-base">No programme information</div>
            )}
          </div>
        </div>
      </div>

      {/* Time axis header */}
      <div className="shrink-0 flex border-b border-white/10">
        <div className="w-64 border-r border-white/10" />
        <div className="flex-1 relative h-12 overflow-hidden">
          {Array.from({ length: HALF_HOUR_STEPS + 1 }).map((_, i) => {
            const time = windowStart + i * HALF_HOUR_MS
            const left = (i / HALF_HOUR_STEPS) * 100
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 flex items-center px-2 text-sm text-[var(--tv-text-muted)] border-l border-white/10"
                style={{ left: `${left}%` }}
              >
                {formatTime(time)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid body */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden [scroll-behavior:auto] [overflow-anchor:none] [overscroll-behavior:contain]"
        >
          <div className="relative" style={{ minHeight: '100%', paddingBottom: '8rem' }}>
            {/* Grid lines and current-time indicator span only the events area */}
            <div className="absolute top-0 right-0 bottom-0 left-64 pointer-events-none">
              {/* Half-hour grid lines */}
              <div className="absolute inset-0">
                {Array.from({ length: HALF_HOUR_STEPS + 1 }).map((_, i) => {
                  const left = (i / HALF_HOUR_STEPS) * 100
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-white/5"
                      style={{ left: `${left}%` }}
                    />
                  )
                })}
              </div>

              {/* Current time indicator */}
              {now >= windowStart && now <= windowEnd && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--tv-danger)] z-20"
                  style={{ left: `${currentTimeLeft}%` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 rounded-full bg-[var(--tv-danger)]" />
                </div>
              )}
            </div>

            {/* Channel rows */}
            {channels.map((channel, index) => (
              <EpgChannelRow
                key={channel.id}
                channel={channel}
                index={index}
                isHighlighted={index === highlightedChannelIndex}
                events={eventsByChannel.get(channel.id) || EMPTY_EVENTS}
                selectedEventId={index === highlightedChannelIndex ? selectedEventId : null}
                windowStart={windowStart}
                windowEnd={windowEnd}
                windowDuration={windowDuration}
                onSelect={handleRowSelect}
                registerRef={(el) => {
                  rowsRef.current[index] = el
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="shrink-0 px-6 py-3 border-t border-white/10 text-sm text-[var(--tv-text-muted)] flex items-center justify-between">
        <span>UP/DOWN: channel · LEFT/RIGHT: time · ENTER: {readyToConfirm ? 'confirm' : 'select'} · BACK: close</span>
      </div>
    </div>
  )
}

const EMPTY_EVENTS: EpgEvent[] = []

interface EpgChannelRowProps {
  channel: Channel
  index: number
  isHighlighted: boolean
  events: EpgEvent[]
  selectedEventId: string | null
  windowStart: number
  windowEnd: number
  windowDuration: number
  onSelect: (index: number, eventId?: string) => void
  registerRef: (el: HTMLDivElement | null) => void
}

const EpgChannelRow = memo(function EpgChannelRow({
  channel,
  index,
  isHighlighted,
  events,
  selectedEventId,
  windowStart,
  windowEnd,
  windowDuration,
  onSelect,
  registerRef,
}: EpgChannelRowProps) {
  return (
    <div
      ref={registerRef}
      style={{ height: ROW_HEIGHT_PX }}
      className="flex border-b border-white/5"
    >
      <div
        className={clsx(
          'w-64 shrink-0 px-4 border-r border-white/10 flex items-center gap-3',
          isHighlighted && 'bg-[var(--tv-accent)]/20',
        )}
      >
        <span className="text-sm font-bold text-white/40 w-8 text-center shrink-0">{index + 1}</span>
        <span className="truncate font-medium text-sm whitespace-nowrap">{channel.name}</span>
      </div>

      <div className={clsx('flex-1 relative min-w-0', isHighlighted && 'bg-white/5')}>
        {events.map((event) => {
          const start = Math.max(event.start, windowStart)
          const end = Math.min(event.stop, windowEnd)
          const left = ((start - windowStart) / windowDuration) * 100
          const width = Math.max(((end - start) / windowDuration) * 100, 0.8)
          const isEventSelected = isHighlighted && selectedEventId === event.id

          return (
            <button
              key={event.id}
              className={clsx(
                'absolute top-1 bottom-1 rounded-lg px-2 py-1 text-left text-sm truncate',
                'border focus:outline-none whitespace-nowrap',
                isEventSelected
                  ? 'bg-[var(--tv-accent)]/30 border-[var(--tv-accent)] text-white'
                  : 'bg-[var(--tv-surface)]/60 border-white/10 text-white/90 hover:bg-[var(--tv-surface-highlight)]',
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
              onClick={() => onSelect(index, event.id)}
              title={event.title}
            >
              {event.title}
            </button>
          )
        })}
      </div>
    </div>
  )
})