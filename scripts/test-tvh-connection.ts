import { config } from 'dotenv'
config({ path: '.env.local' })

import { createTvheadendApi } from '../src/services/tvheadend/api'
import type { Settings } from '../src/types/settings'

const settings: Settings = {
  tvhUrl: process.env.TVH_URL || '',
  username: process.env.TVH_USER || '',
  password: process.env.TVH_PASS || '',
  streamingProfile: 'pass',
}

async function main() {
  if (!settings.tvhUrl) {
    console.error('Set TVH_URL in .env.local or environment')
    process.exit(1)
  }

  console.log('Testing connection to:', settings.tvhUrl)
  const api = createTvheadendApi(settings)

  console.log('\n--- Connection test ---')
  const status = await api.testConnection()
  console.log('Server info:', status.serverInfo.success ? 'OK' : 'FAIL', '-', status.serverInfo.message)
  console.log('Playlist:', status.playlist.success ? 'OK' : 'FAIL', '-', status.playlist.message)
  console.log('Stream:', status.stream.success ? 'OK' : 'FAIL', '-', status.stream.message)
  console.log('Profiles:', status.profiles.join(', ') || 'pass')

  console.log('\n--- Channels ---')
  const channels = await api.getChannels()
  console.log(`Found ${channels.length} channels`)
  channels.slice(0, 5).forEach((ch) => {
    console.log(`  ${ch.number}. ${ch.name} (${ch.id})`)
  })

  console.log('\n--- EPG sample ---')
  const epg = await api.getEpg(0, 3)
  console.log(`Total EPG events: ${epg.totalCount}`)
  epg.entries.slice(0, 3).forEach((event) => {
    console.log(`  ${event.channelName}: ${event.title} (${new Date(event.start * 1000).toLocaleString('en-GB')})`)
  })
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
