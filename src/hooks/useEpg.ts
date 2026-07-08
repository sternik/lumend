import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '../stores/settingsStore'
import { createTvheadendApi } from '../services/tvheadend/api'
import type { EpgEvent } from '../types/epg'

export function useEpg() {
  const { settings } = useSettingsStore()

  return useQuery<EpgEvent[]>({
    queryKey: ['epg', settings.tvhUrl, settings.username],
    queryFn: async () => {
      const api = createTvheadendApi(settings)
      const events = await api.getAllEpg()

      return events.map(
        (event): EpgEvent => ({
          id: String(event.eventId),
          channelId: event.channelUuid,
          title: event.title,
          subtitle: event.subtitle,
          description: event.description,
          start: event.start * 1000,
          stop: event.stop * 1000,
        }),
      )
    },
    enabled: Boolean(settings.tvhUrl),
    staleTime: 1000 * 60 * 15,
  })
}