import type { Settings } from '../../types/settings'
import type { Channel } from '../../types/channel'
import { TvheadendClient } from './client'
import { parseM3u } from './m3uParser'
import type {
  TvheadendConnectionStatus,
  TvheadendEpgGrid,
  TvheadendServerInfo,
} from './types'

export function createTvheadendApi(settings: Settings) {
  const client = new TvheadendClient(settings)

  async function testConnection(): Promise<TvheadendConnectionStatus> {
    const result: TvheadendConnectionStatus = {
      serverInfo: { success: false, message: '' },
      playlist: { success: false, message: '' },
      stream: { success: false, message: '' },
    }

    // 1. Server info
    try {
      const info = await client.get<TvheadendServerInfo>('api/serverinfo')
      result.serverInfo = {
        success: true,
        message: `${info.name} ${info.sw_version}`,
        name: info.name,
        version: info.sw_version,
      }
    } catch (error) {
      result.serverInfo.message = error instanceof Error ? error.message : 'Unknown error'
    }

    // 2. Playlist
    try {
      const playlist = await client.get<string>('playlist/channels')
      const channels = parseM3u(playlist).channels
      result.playlist = {
        success: true,
        message: `${channels.length} channels found`,
        channelCount: channels.length,
      }
    } catch (error) {
      result.playlist.message = error instanceof Error ? error.message : 'Unknown error'
    }

    // 3. Stream access
    if (result.playlist.success && result.serverInfo.success) {
      result.stream = { success: true, message: 'Streaming available' }
    } else {
      result.stream = {
        success: false,
        message: 'Cannot verify streaming without playlist/server access',
      }
    }

    return result
  }

  async function getChannels() {
    const playlist = await client.get<string>('playlist/channels')
    return parseM3u(playlist).channels
  }

  async function getEpg(start = 0, limit = 500): Promise<TvheadendEpgGrid> {
    return client.get<TvheadendEpgGrid>('api/epg/events/grid', {
      start: String(start),
      limit: String(limit),
      dir: 'ASC',
      sort: 'start',
    })
  }

  async function getAllEpg(onProgress?: (loaded: number, total: number) => void) {
    const allEvents: TvheadendEpgGrid['entries'] = []
    let start = 0
    const limit = 500
    let total = 0

    do {
      const response = await getEpg(start, limit)
      allEvents.push(...response.entries)
      total = response.totalCount
      start += response.entries.length
      onProgress?.(allEvents.length, total)
    } while (start < total && start < 20000)

    return allEvents
  }

  function getStreamUrl(channel: Channel) {
    // Use the exact stream URL returned by TVHeadend in the M3U playlist.
    // It contains the correct numeric channel id and the auth token when applicable.
    return channel.streamUrl
  }

  return {
    testConnection,
    getChannels,
    getEpg,
    getAllEpg,
    getStreamUrl,
    getBaseUrl: () => client.getBaseUrl(),
  }
}

export type TvheadendApi = ReturnType<typeof createTvheadendApi>
