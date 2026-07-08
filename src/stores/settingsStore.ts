import { create } from 'zustand'
import { settingsStorage } from '../services/storage/settingsStorage'
import { DEFAULT_SETTINGS, type Settings } from '../types/settings'

interface SettingsState {
  settings: Settings
  isConfigured: boolean
  setSettings: (settings: Settings) => void
  loadSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isConfigured: false,

  setSettings: (settings) => {
    settingsStorage.save(settings)
    set({ settings, isConfigured: Boolean(settings.tvhUrl) })
  },

  loadSettings: () => {
    const settings = settingsStorage.load()
    set({ settings, isConfigured: Boolean(settings.tvhUrl) })
  },
}))
