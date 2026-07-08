import { describe, expect, it } from 'vitest'
import { parseM3u } from '../m3uParser'

const SAMPLE_M3U = `#EXTM3U
#EXTINF:-1 tvg-id="abc123" tvg-chno="5" tvg-logo="http://example.com/logo.png",TVP1
http://example.com:9981/stream/channelid/123?profile=pass
#EXTINF:-1 tvg-id="def456" tvg-chno="2",Polsat
http://example.com:9981/stream/channelid/456?profile=pass
#EXTINF:-1 tvg-id="ghi789" tvg-chno="10",TVN
http://example.com:9981/stream/channelid/789?profile=pass
`

describe('parseM3u', () => {
  it('parses channels and sorts by channel number', () => {
    const result = parseM3u(SAMPLE_M3U)

    expect(result.channels).toHaveLength(3)
    expect(result.channels[0].name).toBe('Polsat')
    expect(result.channels[0].number).toBe(2)
    expect(result.channels[1].name).toBe('TVP1')
    expect(result.channels[1].number).toBe(5)
    expect(result.channels[2].name).toBe('TVN')
    expect(result.channels[2].number).toBe(10)
  })

  it('extracts channel metadata', () => {
    const result = parseM3u(SAMPLE_M3U)
    const tvp1 = result.channels.find((c) => c.name === 'TVP1')

    expect(tvp1).toBeDefined()
    expect(tvp1?.id).toBe('abc123')
    expect(tvp1?.iconUrl).toBe('http://example.com/logo.png')
    expect(tvp1?.streamUrl).toBe('http://example.com:9981/stream/channelid/123?profile=pass')
  })
})
