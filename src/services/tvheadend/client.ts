import type { Settings } from '../../types/settings'
import { isRealWebOSDevice, lunaProxyRequest } from '../webos/lunaProxy'

const REQUEST_TIMEOUT_MS = 15000

interface HttpResponse {
  ok: boolean
  status: number
  statusText: string
  text(): Promise<string>
  headers: { get(name: string): string | null }
}

export class TvheadendClient {
  private baseUrl: string
  private headers: Record<string, string> = {}
  private useLunaProxy: boolean

  constructor(settings: Settings) {
    let url = settings.tvhUrl.trim()
    if (url && !url.endsWith('/')) {
      url += '/'
    }

    // In dev mode use the current origin as the base URL so Vite's proxy
    // can forward requests to the TVHeadend server and avoid CORS issues.
    const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
    this.baseUrl = isDev && typeof window !== 'undefined' ? window.location.origin + '/' : url
    this.useLunaProxy = !isDev && isRealWebOSDevice()

    if (settings.username) {
      const token = btoa(`${settings.username}:${settings.password}`)
      this.headers['Authorization'] = `Basic ${token}`
    }
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    return url.toString()
  }

  private async request(path: string, method = 'GET', params?: Record<string, string>): Promise<HttpResponse> {
    const url = this.buildUrl(path, params)

    if (this.useLunaProxy) {
      return lunaProxyRequest(url, { method, headers: this.headers })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        signal: controller.signal,
      })

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        text: () => response.text(),
        headers: { get: (name) => response.headers.get(name) },
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const response = await this.request(path, 'GET', params)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return JSON.parse(text) as T
    }

    return text as unknown as T
  }

  async head(path: string, params?: Record<string, string>): Promise<HttpResponse> {
    return this.request(path, 'HEAD', params)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }
}
