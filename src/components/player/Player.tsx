import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import type { Channel } from '../../types/channel'
import type { EpgEvent } from '../../types/epg'
import { createTvheadendApi } from '../../services/tvheadend/api'
import { useSettingsStore } from '../../stores/settingsStore'

const MAX_RETRIES = 1
const RETRY_DELAY_MS = 0
const PLAYBACK_TIMEOUT_MS = 8000

interface PlayerProps {
  channel: Channel
  channelIndex: number
  currentEvent?: EpgEvent
  nextEvent?: EpgEvent
  visible: boolean
  showOverlay?: boolean
  forceShowInfo?: boolean
}

export function Player({ channel, channelIndex, currentEvent, nextEvent, visible, showOverlay = true, forceShowInfo = false }: PlayerProps) {
  const { settings } = useSettingsStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const streamUrl = createTvheadendApi(settings).getStreamUrl(channel)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    retryCountRef.current = 0
    setError(null)
    setIsPlaying(false)

    clearTimers()

    let cancelled = false

    function clearTimers() {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    function scheduleRetry(url: string) {
      if (cancelled) return
      clearTimers()

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        console.log(`[Player] Retry ${retryCountRef.current}/${MAX_RETRIES} for ${channel.name}`)
        retryTimerRef.current = window.setTimeout(() => {
          if (!cancelled) {
            setError(null)
            loadUrl(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now())
          }
        }, RETRY_DELAY_MS)
      } else {
        console.log(`[Player] All retries exhausted for ${channel.name}`)
        setError('No signal')
      }
    }

    function startPlaybackTimeout(url: string) {
      clearTimers()
      timeoutRef.current = window.setTimeout(() => {
        if (!cancelled && !isPlaying) {
          console.log(`[Player] Playback timeout for ${channel.name}`)
          scheduleRetry(url)
        }
      }, PLAYBACK_TIMEOUT_MS)
    }

    function loadUrl(url: string) {
      if (cancelled || !video) return

      console.log(`[Player] Loading: ${url}`)
      setIsPlaying(false)

      // Remove old sources and listeners
      while (video.firstChild) {
        video.removeChild(video.firstChild)
      }

      const source = document.createElement('source')
      source.setAttribute('src', url)
      video.appendChild(source)
      video.load()

      const handlePlaying = () => {
        console.log(`[Player] Playing: ${channel.name}`)
        if (!cancelled) {
          setIsPlaying(true)
          clearTimers()
        }
      }
      const handleError = () => {
        console.log(`[Player] Error event for ${channel.name}:`, video.error)
        if (!cancelled) {
          scheduleRetry(url)
        }
      }

      video.addEventListener('playing', handlePlaying)
      video.addEventListener('error', handleError)

      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log(`[Player] play() rejected for ${channel.name}:`, err?.name, err?.message)
          if (cancelled) return
          if (err instanceof Error && err.name === 'AbortError') return
          scheduleRetry(url)
        })
      }

      // Start timeout — if nothing happens in PLAYBACK_TIMEOUT_MS, retry
      startPlaybackTimeout(url)

      return () => {
        video.removeEventListener('playing', handlePlaying)
        video.removeEventListener('error', handleError)
      }
    }

    const cleanup = loadUrl(streamUrl)

    return () => {
      cancelled = true
      clearTimers()
      cleanup?.()
      while (video.firstChild) {
        video.removeChild(video.firstChild)
      }
    }
  }, [streamUrl, channel.name])

  if (!visible) return null

  return (
    <div className="relative flex-1 h-full bg-black">
      <video
        ref={videoRef}
        id="myVideo"
        width={window.innerWidth}
        height={window.innerHeight}
        className="w-full h-full object-contain"
        preload="none"
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center p-6">
            <div className="text-white text-2xl font-bold mb-2">No signal</div>
            <div className="text-[var(--tv-text-muted)] text-base">{channel.name}</div>
            <div className="text-[var(--tv-text-muted)] text-sm mt-1">
              {retryCountRef.current < MAX_RETRIES ? 'Retrying connection...' : 'Unable to connect to stream'}
            </div>
          </div>
        </div>
      )}

      {showOverlay && (
        <ChannelInfoOverlay
          channel={channel}
          channelIndex={channelIndex}
          currentEvent={currentEvent}
          nextEvent={nextEvent}
          isPlaying={isPlaying}
          forceShow={forceShowInfo}
        />
      )}
    </div>
  )
}

interface ChannelInfoOverlayProps {
  channel: Channel
  channelIndex: number
  currentEvent?: EpgEvent
  nextEvent?: EpgEvent
  isPlaying: boolean
  forceShow?: boolean
}

function ChannelInfoOverlay({ channel, channelIndex, currentEvent, nextEvent, isPlaying, forceShow = false }: ChannelInfoOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true)
    } else {
      const t = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [forceShow])

  if (!isVisible) return null

  const now = Date.now()
  const progress = currentEvent ? Math.min(100, Math.max(0, ((now - currentEvent.start) / (currentEvent.stop - currentEvent.start)) * 100)) : 0

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className={clsx(
        'absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black via-black/80 to-transparent tv-text-shadow',
        'transition-opacity duration-200',
        forceShow ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="flex items-start gap-6 max-w-6xl">
        <div className="w-28 h-28 shrink-0 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
          {channel.iconUrl ? (
            <ChannelLogo iconUrl={channel.iconUrl} fallback={channelIndex + 1} />
          ) : (
            <span className="text-2xl font-bold text-white/70">{channelIndex + 1}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 h-[2.5rem]">
            <span className="text-3xl font-bold truncate">{channel.name}</span>
            <span
              className={clsx(
                'px-3 py-1 rounded-full text-sm font-bold tracking-wide bg-[var(--tv-success)]/20 text-[var(--tv-success)] transition-opacity duration-200',
                isPlaying ? 'opacity-100' : 'opacity-0',
              )}
            >
              LIVE
            </span>
          </div>

          {currentEvent && (
            <>
              <div className="text-2xl font-semibold mb-1 truncate">{currentEvent.title}</div>
              {currentEvent.subtitle ? (
                <div className="text-lg text-white/80 mb-2 truncate">{currentEvent.subtitle}</div>
              ) : (
                <div className="h-[1.75rem] mb-2" />
              )}

              <div className="flex items-center gap-3 text-base text-white/70 mb-3">
                <span>
                  {formatTime(currentEvent.start)} - {formatTime(currentEvent.stop)}
                </span>
                <span className="text-white/40">|</span>
                <span>{Math.round((currentEvent.stop - currentEvent.start) / 60000)} min</span>
              </div>

              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-3 max-w-2xl">
                <div
                  className="h-full bg-[var(--tv-accent)] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {currentEvent.description ? (
                <div className="text-base text-white/70 line-clamp-3 max-w-4xl h-[4.5rem] overflow-hidden">{currentEvent.description}</div>
              ) : (
                <div className="h-[4.5rem]" />
              )}
            </>
          )}

          {nextEvent ? (
            <div className="mt-4 text-base text-white/60 h-[1.5rem]">
              Next: <span className="text-white font-medium">{nextEvent.title}</span> at {formatTime(nextEvent.start)}
            </div>
          ) : (
            <div className="mt-4 h-[1.5rem]" />
          )}
        </div>
      </div>
    </div>
  )
}

function ChannelLogo({ iconUrl, fallback }: { iconUrl: string; fallback: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span className="text-2xl font-bold text-white/70">{fallback}</span>
  }
  return <img src={iconUrl} alt="" className="w-full h-full object-contain p-2" onError={() => setFailed(true)} />
}
