interface AudioTrack {
  id: string
  kind: string
  label: string
  language: string
  enabled: boolean
}

interface AudioTrackList extends EventTarget {
  readonly length: number
  getTrackById(id: string): AudioTrack | null
  addEventListener<K extends keyof HTMLMediaElementEventMap>(
    type: K,
    listener: (this: AudioTrackList, ev: HTMLMediaElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof HTMLMediaElementEventMap>(
    type: K,
    listener: (this: AudioTrackList, ev: HTMLMediaElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
  [index: number]: AudioTrack
}
