import { useEffect, useState } from 'react'
import { useSettingsStore } from './stores/settingsStore'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { MainScreen } from './components/MainScreen'

function Splash() {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1600)
    return () => clearTimeout(t1)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] transition-opacity duration-500"
      style={{ opacity: leaving ? 0 : 1, pointerEvents: leaving ? 'none' : 'auto' }}
    >
      <img src="icon.png" alt="" className="w-40 h-40 drop-shadow-[0_0_40px_rgba(96,165,250,0.4)] animate-[lumendPulse_1.6s_ease-out]" />
      <h1 className="mt-6 text-5xl font-bold tracking-tight text-white">Lumend</h1>
    </div>
  )
}

function App() {
  const { isConfigured, loadSettings } = useSettingsStore()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    loadSettings()
    const t = setTimeout(() => setShowSplash(false), 2100)
    return () => clearTimeout(t)
  }, [loadSettings])

  return (
    <>
      {showSplash && <Splash />}
      {!isConfigured ? <SettingsScreen /> : <MainScreen />}
    </>
  )
}

export default App