const SERVICE_URI = 'luna://com.sternik.lumend.proxy'

export function isRealWebOSDevice(): boolean {
  if (typeof window === 'undefined') return false

  const globalWindow = window as unknown as Record<string, unknown>
  if (typeof globalWindow.webOS === 'undefined' || typeof globalWindow.PalmSystem === 'undefined') {
    return false
  }

  const palmSystem = globalWindow.PalmSystem as { deviceInfo?: string }
  if (palmSystem.deviceInfo) {
    try {
      const deviceInfo = JSON.parse(palmSystem.deviceInfo) as { modelName?: string }
      if (deviceInfo.modelName?.toLowerCase().includes('simulator')) {
        return false
      }
    } catch {
      // Ignore parse errors and fall through to the default check.
    }
  }

  return true
}

interface ProxyResponse {
  returnValue: boolean
  status?: number
  statusText?: string
  data?: string
  isBase64?: boolean
  headers?: Record<string, string>
  errorText?: string
}

export async function lunaProxyRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ ok: boolean; status: number; statusText: string; headers: { get(name: string): string | null }; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    if (!isRealWebOSDevice()) {
      reject(new Error('webOS device or proxy service is not available'))
      return
    }

    const webOS = (window as unknown as Record<string, unknown>).webOS as {
      service: {
        request(
          uri: string,
          params: {
            method: string
            parameters: Record<string, unknown>
            onSuccess: (result: unknown) => void
            onFailure: (error: unknown) => void
          },
        ): void
      }
    }

    const headerString = options.headers
      ? Object.entries(options.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\r\n')
      : ''

    webOS.service.request(SERVICE_URI, {
      method: 'request',
      parameters: {
        url,
        method: options.method || 'GET',
        headers: headerString,
        body: options.body || '',
      },
      onSuccess: (result: unknown) => {
        const response = result as ProxyResponse
        if (!response.returnValue) {
          reject(new Error(response.errorText || 'Luna proxy request failed'))
          return
        }

        let bodyText = response.data || ''
        if (response.isBase64) {
          bodyText = atob(bodyText)
        }

        const headers = response.headers || {}

        resolve({
          ok: response.status !== undefined && response.status >= 200 && response.status < 300,
          status: response.status || 0,
          statusText: response.statusText || '',
          headers: { get: (name) => headers[name.toLowerCase()] || null },
          text: () => Promise.resolve(bodyText),
        })
      },
      onFailure: (error: unknown) => {
        const err = error as Record<string, string>
        reject(new Error(err.errorText || err.errorCode || 'Luna service call failed'))
      },
    })
  })
}
