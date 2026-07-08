import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChannels } from '../hooks/useChannels'
import { useEpg } from '../hooks/useEpg'
import { ChannelList, type ChannelListHandle } from './channels/ChannelList'
import { EpgScreen } from './epg/EpgScreen'
import { Player } from './player/Player'
import { Button } from './ui/Button'

type ViewState = 'player' | 'channelList' | 'epg'

const WEBOS_KEYS = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  BACK: 461,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  CHANNEL_UP: 403,
  CHANNEL_DOWN: 404,
}

function isBackKey(e: KeyboardEvent): boolean {
  return e.key === 'Backspace' || e.key === 'Escape' || e.keyCode === WEBOS_KEYS.BACK
}

function isKey(e: KeyboardEvent, name: keyof typeof WEBOS_KEYS): boolean {
  const code = WEBOS_KEYS[name]
  if (e.keyCode === code) return true
  switch (name) {
    case 'LEFT':
      return e.key === 'ArrowLeft'
    case 'UP':
      return e.key === 'ArrowUp'
    case 'RIGHT':
      return e.key === 'ArrowRight'
    case 'DOWN':
      return e.key === 'ArrowDown'
    case 'ENTER':
      return e.key === 'Enter'
    case 'PAGE_UP':
      // Simulator fallback: '+' key for channel up
      return e.key === 'PageUp' || e.key === '+'
    case 'PAGE_DOWN':
      // Simulator fallback: '-' key for channel down
      return e.key === 'PageDown' || e.key === '-'
    case 'CHANNEL_UP':
      return e.key === 'ChannelUp'
    case 'CHANNEL_DOWN':
      return e.key === 'ChannelDown'
    default:
      return false
  }
}

export function MainScreen() {
  const { data: channels = [], isLoading: channelsLoading, error: channelsError } = useChannels()
  const { data: epgEvents = [], isLoading: epgLoading } = useEpg()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [view, setView] = useState<ViewState>('player')
  const [showChannelInfo, setShowChannelInfo] = useState(false)
  const [showSettingsConfirm, setShowSettingsConfirm] = useState(false)
  const listRef = useRef<ChannelListHandle>(null)
  const channelInfoTimerRef = useRef<number | null>(null)

  const currentChannel = channels[selectedIndex]

  const hideChannelInfo = useCallback(() => {
    if (channelInfoTimerRef.current) {
      window.clearTimeout(channelInfoTimerRef.current)
      channelInfoTimerRef.current = null
    }
    setShowChannelInfo(false)
  }, [])

  const showChannelInfoWithTimeout = useCallback(() => {
    if (channelInfoTimerRef.current) {
      window.clearTimeout(channelInfoTimerRef.current)
    }
    setShowChannelInfo(true)
    channelInfoTimerRef.current = window.setTimeout(() => {
      setShowChannelInfo(false)
    }, 7000)
  }, [])

  const openChannelList = useCallback(() => {
    setHighlightedIndex(selectedIndex)
    hideChannelInfo()
    setView('channelList')
  }, [selectedIndex, hideChannelInfo])

  const confirmChannelSelection = useCallback((index?: number) => {
    setSelectedIndex(index !== undefined ? index : highlightedIndex)
    setView('player')
  }, [highlightedIndex])

  const cancelChannelSelection = useCallback(() => {
    setHighlightedIndex(selectedIndex)
    setView('player')
  }, [selectedIndex])

  const openEpg = useCallback(() => {
    hideChannelInfo()
    setView('epg')
  }, [hideChannelInfo])

  const closeOverlay = useCallback(() => {
    setView('player')
  }, [])

  const toggleChannelInfo = useCallback(() => {
    if (showChannelInfo) {
      hideChannelInfo()
    } else {
      showChannelInfoWithTimeout()
    }
  }, [showChannelInfo, hideChannelInfo, showChannelInfoWithTimeout])

  useEffect(() => {
    if (currentChannel) {
      showChannelInfoWithTimeout()
    }
  }, [currentChannel, selectedIndex, showChannelInfoWithTimeout])

  const initialInfoShown = useRef(false)

  useEffect(() => {
    if (!initialInfoShown.current && currentChannel && view === 'player') {
      initialInfoShown.current = true
      showChannelInfoWithTimeout()
    }
  }, [currentChannel, view, showChannelInfoWithTimeout])

  const now = Date.now()
  const currentEvent = useMemo(() => {
    if (!currentChannel) return undefined
    return epgEvents.find((e) => e.channelId === currentChannel.id && e.start <= now && e.stop > now)
  }, [currentChannel, epgEvents, now])

  const nextEvent = useMemo(() => {
    if (!currentChannel) return undefined
    return epgEvents
      .filter((e) => e.channelId === currentChannel.id && e.start > now)
      .sort((a, b) => a.start - b.start)[0]
  }, [currentChannel, epgEvents, now])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettingsConfirm) {
        if (isBackKey(e)) {
          setShowSettingsConfirm(false)
        }
        return
      }

      if (view === 'epg') {
        if (isBackKey(e)) {
          e.preventDefault()
          closeOverlay()
        }
        return
      }

      if (view === 'channelList') {
        if (isKey(e, 'UP') || isKey(e, 'DOWN')) {
          // Let the channel list move the highlight only.
          return
        }
        if (isKey(e, 'LEFT')) {
          e.preventDefault()
          openEpg()
          return
        }
        if (isKey(e, 'RIGHT') || isKey(e, 'ENTER')) {
          e.preventDefault()
          confirmChannelSelection()
          return
        }
        if (isBackKey(e)) {
          e.preventDefault()
          cancelChannelSelection()
        }
        return
      }

      // view === 'player'
      if (showChannelInfo) {
        if (isKey(e, 'ENTER') || isBackKey(e)) {
          e.preventDefault()
          hideChannelInfo()
          return
        }
        if (isKey(e, 'UP') || isKey(e, 'DOWN')) {
          e.preventDefault()
          hideChannelInfo()
          openChannelList()
          return
        }
        if (isKey(e, 'LEFT')) {
          e.preventDefault()
          hideChannelInfo()
          openEpg()
          return
        }
        if (isKey(e, 'PAGE_UP') || isKey(e, 'CHANNEL_UP')) {
          e.preventDefault()
          hideChannelInfo()
          setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : channels.length - 1)
          return
        }
        if (isKey(e, 'PAGE_DOWN') || isKey(e, 'CHANNEL_DOWN')) {
          e.preventDefault()
          hideChannelInfo()
          setSelectedIndex(selectedIndex < channels.length - 1 ? selectedIndex + 1 : 0)
          return
        }
        return
      }

      // view === 'player'
      if (isKey(e, 'UP') || isKey(e, 'DOWN')) {
        e.preventDefault()
        openChannelList()
        return
      }
      if (isKey(e, 'PAGE_UP') || isKey(e, 'CHANNEL_UP')) {
        e.preventDefault()
        setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : channels.length - 1)
        return
      }
      if (isKey(e, 'PAGE_DOWN') || isKey(e, 'CHANNEL_DOWN')) {
        e.preventDefault()
        setSelectedIndex(selectedIndex < channels.length - 1 ? selectedIndex + 1 : 0)
        return
      }
      if (isKey(e, 'ENTER')) {
        e.preventDefault()
        toggleChannelInfo()
        return
      }
      if (isKey(e, 'LEFT')) {
        e.preventDefault()
        openEpg()
        return
      }
      if (isBackKey(e)) {
        e.preventDefault()
        setShowSettingsConfirm(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    showSettingsConfirm,
    view,
    showChannelInfo,
    selectedIndex,
    highlightedIndex,
    channels.length,
    openChannelList,
    confirmChannelSelection,
    cancelChannelSelection,
    openEpg,
    closeOverlay,
    hideChannelInfo,
    toggleChannelInfo,
    setSelectedIndex,
    setShowSettingsConfirm,
  ])

  if (channelsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-[var(--tv-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--tv-text-muted)]">Loading channels...</p>
      </div>
    )
  }

  if (channelsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-[var(--tv-danger)] text-xl">Failed to load channels</div>
        <div className="text-[var(--tv-text-muted)] text-center max-w-lg">
          {channelsError instanceof Error ? channelsError.message : 'Check the server address and network connection.'}
        </div>
        <Button onClick={() => setShowSettingsConfirm(true)}>Open settings</Button>
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-xl">No channels found</div>
        <Button onClick={() => setShowSettingsConfirm(true)}>Open settings</Button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black">
      {epgLoading && view !== 'epg' && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 text-sm text-white/80">
          <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          Loading EPG...
        </div>
      )}

      <Player
        channel={currentChannel}
        channelIndex={selectedIndex}
        currentEvent={currentEvent}
        nextEvent={nextEvent}
        visible={true}
        showOverlay={view === 'player'}
        forceShowInfo={showChannelInfo}
      />

      <ChannelList
        ref={listRef}
        channels={channels}
        epgEvents={epgEvents}
        selectedIndex={highlightedIndex}
        visible={view === 'channelList'}
        onSelect={setHighlightedIndex}
        onClose={(index?: number) => confirmChannelSelection(index)}
      />

      <EpgScreen
        channels={channels}
        epgEvents={epgEvents}
        selectedChannelIndex={selectedIndex}
        visible={view === 'epg'}
        onChannelSelect={setSelectedIndex}
        onClose={closeOverlay}
      />

      {showSettingsConfirm && (
        <SettingsConfirmDialog
          onCancel={() => setShowSettingsConfirm(false)}
          onConfirm={() => {
            localStorage.removeItem('tvh-client-settings')
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

interface SettingsConfirmDialogProps {
  onCancel: () => void
  onConfirm: () => void
}

function SettingsConfirmDialog({ onCancel, onConfirm }: SettingsConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [focusIndex, setFocusIndex] = useState(0)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isLeft = e.key === 'ArrowLeft' || e.keyCode === 37
      const isRight = e.key === 'ArrowRight' || e.keyCode === 39
      const isEnter = e.key === 'Enter' || e.keyCode === 13
      const isBack = e.key === 'Backspace' || e.key === 'Escape' || e.key === 'BrowserBack' || e.keyCode === 461

      if (isLeft || isRight) {
        e.preventDefault()
        e.stopPropagation()
        setFocusIndex((prev) => {
          const next = prev === 0 ? 1 : 0
          setTimeout(() => {
            if (next === 0) cancelRef.current?.focus()
            else confirmRef.current?.focus()
          }, 0)
          return next
        })
        return
      }

      if (isEnter) {
        e.preventDefault()
        e.stopPropagation()
        if (focusIndex === 0) onCancel()
        else onConfirm()
        return
      }

      if (isBack) {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusIndex, onCancel, onConfirm])

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--tv-surface)] px-8 py-6 rounded-xl border border-[var(--tv-border)] max-w-sm text-center">
        <h2 className="text-xl font-semibold mb-2">Return to settings?</h2>
        <p className="text-sm text-[var(--tv-text-muted)] mb-5">
          Current configuration will be lost.
        </p>
        <div className="flex gap-3 justify-center">
          <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel} onFocus={() => setFocusIndex(0)}>
            Cancel
          </Button>
          <Button ref={confirmRef} variant="danger" size="sm" onClick={onConfirm} onFocus={() => setFocusIndex(1)}>
            Open settings
          </Button>
        </div>
      </div>
    </div>
  )
}
