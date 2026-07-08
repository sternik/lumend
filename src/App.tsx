import { useEffect } from 'react'
import { useSettingsStore } from './stores/settingsStore'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { MainScreen } from './components/MainScreen'

function App() {
  const { isConfigured, loadSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <>
      {!isConfigured ? <SettingsScreen /> : <MainScreen />}
    </>
  )
}

export default App
