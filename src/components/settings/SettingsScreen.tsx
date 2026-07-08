import { useEffect, useMemo, useRef, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { createTvheadendApi } from '../../services/tvheadend/api'
import type { Settings, ConnectionTestResult } from '../../types/settings'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'

const DEFAULT_TEST_RESULT: ConnectionTestResult = {
  serverInfo: { success: false, message: '' },
  playlist: { success: false, message: '' },
  stream: { success: false, message: '' },
}

function isBackKey(e: KeyboardEvent) {
  return e.keyCode === 461 || e.key === 'BrowserBack' || e.code === 'BrowserBack'
}

type FocusableName = 'url' | 'auth' | 'username' | 'password' | 'test' | 'save'

export function SettingsScreen() {
  const { settings, setSettings } = useSettingsStore()
  const [form, setForm] = useState<Settings>(settings)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const [showAuth, setShowAuth] = useState(Boolean(settings.username || settings.password))
  const refs = useRef<Partial<Record<FocusableName, HTMLElement>>>({})
  const initialFocusSet = useRef(false)

  const testPassed = Boolean(
    testResult?.serverInfo.success && testResult?.playlist.success,
  )

  const focusOrder = useMemo<FocusableName[]>(() => {
    const order: FocusableName[] = ['url']
    order.push('auth')
    if (showAuth) {
      order.push('username', 'password')
    }
    if (testPassed) {
      order.push('save')
    } else {
      order.push('test')
    }
    return order
  }, [showAuth, testPassed])

  useEffect(() => {
    if (!settings.tvhUrl && import.meta.env.VITE_TVH_URL) {
      setForm((prev) => ({ ...prev, tvhUrl: import.meta.env.VITE_TVH_URL }))
    }
  }, [])

  useEffect(() => {
    if (initialFocusSet.current) return
    const first = refs.current[focusOrder[0]]
    if (first) {
      first.focus()
      setFocusIndex(0)
      initialFocusSet.current = true
    }
  }, [focusOrder])

  // Auto-focus Save once the test passes.
  useEffect(() => {
    if (!testPassed) return
    const saveIndex = focusOrder.indexOf('save')
    if (saveIndex >= 0) {
      refs.current.save?.focus()
      setFocusIndex(saveIndex)
    }
  }, [testPassed, focusOrder])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (focusOrder.length === 0) return

      const currentIndex = Math.max(0, Math.min(focusIndex, focusOrder.length - 1))
      const current = focusOrder[currentIndex]
      const isTextField = current === 'url' || current === 'username' || current === 'password'

      // Only Up/Down navigate between fields; Left/Right move cursor in text fields.
      if (e.key === 'ArrowUp' || e.keyCode === 38) {
        e.preventDefault()
        const next = currentIndex > 0 ? currentIndex - 1 : focusOrder.length - 1
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        refs.current[focusOrder[next]]?.focus()
        setFocusIndex(next)
        return
      }

      if (e.key === 'ArrowDown' || e.keyCode === 40) {
        e.preventDefault()
        const next = currentIndex < focusOrder.length - 1 ? currentIndex + 1 : 0
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        refs.current[focusOrder[next]]?.focus()
        setFocusIndex(next)
        return
      }

      // For non-text fields, Left/Right also navigate.
      if (!isTextField) {
        if (e.key === 'ArrowLeft' || e.keyCode === 37) {
          e.preventDefault()
          const next = currentIndex > 0 ? currentIndex - 1 : focusOrder.length - 1
          refs.current[focusOrder[next]]?.focus()
          setFocusIndex(next)
          return
        }
        if (e.key === 'ArrowRight' || e.keyCode === 39) {
          e.preventDefault()
          const next = currentIndex < focusOrder.length - 1 ? currentIndex + 1 : 0
          refs.current[focusOrder[next]]?.focus()
          setFocusIndex(next)
          return
        }
      }

      if (e.key === 'Enter' || e.keyCode === 13) {
        const active = document.activeElement as HTMLElement | null
        if (active && (active.tagName === 'BUTTON' || (active as HTMLInputElement).type === 'checkbox')) {
          e.preventDefault()
          active.click()
        }
        return
      }

      // Back closes the virtual keyboard by blurring the active input.
      if (isBackKey(e)) {
        e.preventDefault()
        const active = document.activeElement as HTMLElement | null
        if (active && (active.tagName === 'INPUT' || active.tagName === 'BUTTON')) {
          active.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusIndex, focusOrder])

  const setRef = (name: FocusableName) => (el: HTMLElement | null) => {
    if (el) {
      refs.current[name] = el
    }
  }

  const handleFocus = (index: number) => () => {
    setFocusIndex(index)
  }

  const updateForm = (key: keyof Settings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setTestResult(null)
  }

  const toggleAuth = () => {
    setShowAuth((prev) => {
      const next = !prev
      if (!next) {
        setForm((prevForm) => ({ ...prevForm, username: '', password: '' }))
      }
      setTestResult(null)
      return next
    })
  }

  const handleTest = async () => {
    if (!form.tvhUrl.trim()) return

    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await createTvheadendApi(form).testConnection()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        ...DEFAULT_TEST_RESULT,
        serverInfo: {
          success: false,
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = () => {
    setSettings(form)
  }

  const canTest = form.tvhUrl.trim().length > 0

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-12">
      <div className="w-full max-w-2xl bg-[var(--tv-surface)] rounded-2xl p-10 border border-[var(--tv-border)] shadow-xl">
        <h1 className="text-3xl font-semibold mb-2 text-center">Lumend</h1>
        <p className="text-[var(--tv-text-muted)] text-center mb-8">Configure connection to your TVHeadend server</p>

        <div className="flex flex-col gap-5">
          <Textarea
            ref={setRef('url')}
            onFocus={handleFocus(focusOrder.indexOf('url'))}
            label="TVHeadend server URL"
            placeholder="http://your-tvh-server:9981/"
            value={form.tvhUrl}
            onChange={(e) => updateForm('tvhUrl', e.target.value)}
          />

          {/* Authentication toggle */}
          <div className="flex items-center gap-3 mt-1">
            <input
              ref={setRef('auth')}
              id="use-auth"
              type="checkbox"
              checked={showAuth}
              onChange={toggleAuth}
              onFocus={handleFocus(focusOrder.indexOf('auth'))}
              className="w-6 h-6 accent-[var(--tv-accent)] cursor-pointer focus-ring"
            />
            <label htmlFor="use-auth" className="text-base text-[var(--tv-text-muted)] cursor-pointer select-none">
              Use authentication (username / password)
            </label>
          </div>

          {showAuth && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                ref={setRef('username')}
                onFocus={handleFocus(focusOrder.indexOf('username'))}
                label="Username"
                type="text"
                placeholder="login"
                value={form.username}
                onChange={(e) => updateForm('username', e.target.value)}
              />
              <Input
                ref={setRef('password')}
                onFocus={handleFocus(focusOrder.indexOf('password'))}
                label="Password"
                type="password"
                placeholder="******"
                value={form.password}
                onChange={(e) => updateForm('password', e.target.value)}
              />
            </div>
          )}

          {testPassed && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--tv-success)]/10 border border-[var(--tv-success)]/30">
              <div className="text-[var(--tv-success)] text-base font-medium mb-2">Connection OK</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-white/50">Server</span>
                <span className="text-white/90 text-right truncate">{testResult?.serverInfo.name}</span>
                <span className="text-white/50">Version</span>
                <span className="text-white/90 text-right truncate">{testResult?.serverInfo.version}</span>
                <span className="text-white/50">Channels</span>
                <span className="text-white/90 text-right">{testResult?.playlist.channelCount}</span>
              </div>
            </div>
          )}

          {testPassed ? (
            <div className="mt-8">
              <Button
                ref={setRef('save')}
                onFocus={handleFocus(focusOrder.indexOf('save'))}
                onClick={handleSave}
                variant="primary"
                className="w-full"
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="flex gap-4 mt-4">
              <Button
                ref={setRef('test')}
                onFocus={handleFocus(focusOrder.indexOf('test'))}
                onClick={handleTest}
                disabled={!canTest}
                isLoading={isTesting}
                className="flex-1"
              >
                Test
              </Button>
            </div>
          )}

          {testResult && !testPassed && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--tv-bg)] border border-[var(--tv-border)]">
              <h2 className="text-base font-medium mb-2">Connection test result</h2>
              <TestItem label="Server" result={testResult.serverInfo} />
              <TestItem label="Playlist" result={testResult.playlist} />
              <TestItem label="Stream" result={testResult.stream} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TestItem({ label, result }: { label: string; result: { success: boolean; message: string } }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--tv-border)] last:border-0">
      <span className="text-white/50 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={result.success ? 'text-[var(--tv-success)] text-sm' : 'text-[var(--tv-danger)] text-sm'}>
          {result.success ? 'OK' : 'Error'}
        </span>
        <span className="text-sm text-white/70 max-w-xs truncate">{result.message}</span>
      </div>
    </div>
  )
}