import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '../stores/settingsStore'
import { createTvheadendApi } from '../services/tvheadend/api'
import type { Channel } from '../types/channel'

export function useChannels() {
  const { settings } = useSettingsStore()

  return useQuery<Channel[]>({
    queryKey: ['channels', settings.tvhUrl, settings.username],
    queryFn: async () => {
      const api = createTvheadendApi(settings)
      return api.getChannels()
    },
    enabled: Boolean(settings.tvhUrl),
    staleTime: 1000 * 60 * 10,
  })
}