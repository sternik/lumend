export interface Settings {
  tvhUrl: string
  username: string
  password: string
}

export interface ConnectionTestResult {
  serverInfo: { success: boolean; message: string; name?: string; version?: string }
  playlist: { success: boolean; message: string; channelCount?: number }
  stream: { success: boolean; message: string }
}

export const DEFAULT_SETTINGS: Settings = {
  tvhUrl: '',
  username: '',
  password: '',
}
