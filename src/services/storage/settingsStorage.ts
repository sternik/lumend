import { DEFAULT_SETTINGS, type Settings } from '../../types/settings'

const STORAGE_KEY = 'tvh-client-settings'

export const settingsStorage = {
  load(): Settings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return DEFAULT_SETTINGS
      const parsed = JSON.parse(raw) as Partial<Settings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    } catch {
      return DEFAULT_SETTINGS
    }
  },

  save(settings: Settings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  },
}
