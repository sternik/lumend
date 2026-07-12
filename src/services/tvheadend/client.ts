import type { Settings } from '../../types/settings'
import { isRealWebOSDevice, lunaProxyRequest } from '../webos/lunaProxy'
import {
  parseDigestChallenge,
  buildDigestHeader,
  type DigestChallenge,
} from './digestAuth'

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
  private useLunaProxy: boolean
  private credentials: string | null
  private username: string
  private password: string

  // Digest auth state
  private digestChallenge: DigestChallenge | null = null
  private digestNonceCount = 0

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

    this.username = settings.username || ''
    this.password = settings.password || ''

    if (this.username) {
      this.credentials = `${this.username}:${this.password}`
    } else {
      this.credentials = null
    }
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    // For Luna proxy: embed credentials in URL (Node.js http handles it)
    if (this.useLunaProxy && this.credentials) {
      const base = new URL(path, this.baseUrl)
      base.username = this.credentials.split(':')[0] || ''
      base.password = this.credentials.split(':').slice(1).join(':') || ''
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          base.searchParams.set(key, value)
        })
      }
      return base.toString()
    }

    // For fetch(): no credentials in URL (browser blocks it)
    const url = new URL(path, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    return url.toString()
  }

  private async doFetch(url: string, method: string, authHeader?: string): Promise<HttpResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const headers: Record<string, string> = {}
      if (authHeader) {
        headers['Authorization'] = authHeader
      }

      const response = await fetch(url, {
        method,
        headers,
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

  private async request(path: string, method = 'GET', params?: Record<string, string>): Promise<HttpResponse> {
    const url = this.buildUrl(path, params)

    if (this.useLunaProxy) {
      return lunaProxyRequest(url, { method })
    }

    // No auth needed
    if (!this.username) {
      return this.doFetch(url, method)
    }

    // If we have a cached Digest challenge, use it directly
    if (this.digestChallenge) {
      this.digestNonceCount++
      const authHeader = buildDigestHeader(
        this.username,
        this.password,
        this.digestChallenge,
        method,
        url,
        this.digestNonceCount,
      )
      const response = await this.doFetch(url, method, authHeader)

      // If still 401, challenge expired - retry without auth to get new challenge
      if (response.status === 401) {
        this.digestChallenge = null
        this.digestNonceCount = 0
        return this.request(path, method, params)
      }

      return response
    }

    // First request: try without auth to get the Digest challenge
    const firstResponse = await this.doFetch(url, method)

    if (firstResponse.status === 401) {
      // Get the WWW-Authenticate header
      const wwwAuth = firstResponse.headers.get('www-authenticate')
      if (!wwwAuth) {
        throw new Error('HTTP 401: No WWW-Authenticate header')
      }

      // Parse the Digest challenge
      const challenge = parseDigestChallenge(wwwAuth)
      if (!challenge) {
        throw new Error(`HTTP 401: Unsupported auth scheme (${wwwAuth.split(' ')[0]})`)
      }

      // Cache the challenge and retry with Digest auth
      this.digestChallenge = challenge
      this.digestNonceCount = 1
      const authHeader = buildDigestHeader(
        this.username,
        this.password,
        challenge,
        method,
        url,
        this.digestNonceCount,
      )

      return this.doFetch(url, method, authHeader)
    }

    // Server accepted request without auth (anonymous mode)
    return firstResponse
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

  getCredentials(): string | null {
    return this.credentials
  }
}
