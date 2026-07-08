export interface EpgEvent {
  id: string
  channelId: string
  title: string
  subtitle?: string
  description?: string
  start: number // timestamp ms
  stop: number // timestamp ms
}
