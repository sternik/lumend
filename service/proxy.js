const http = require('http')
const https = require('https')
const { URL } = require('url')

const REQUEST_TIMEOUT_MS = 30000

function parseHeaders(headerString) {
  if (!headerString) return {}
  const headers = {}
  const lines = headerString.split(/\r?\n/)
  for (const line of lines) {
    const index = line.indexOf(':')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (key) headers[key] = value
  }
  return headers
}

function isTextContentType(contentType) {
  if (!contentType) return false
  const type = contentType.toLowerCase()
  return (
    type.includes('text/') ||
    type.includes('application/json') ||
    type.includes('application/x-mpegurl') ||
    type.includes('audio/mpegurl') ||
    type.includes('application/xml') ||
    type.includes('text/xml')
  )
}

function request(url, options) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const client = isHttps ? https : http

    const requestOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: REQUEST_TIMEOUT_MS,
    }

    const req = client.request(requestOptions, (res) => {
      const chunks = []

      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        const contentType = res.headers['content-type'] || ''
        const isText = isTextContentType(contentType)

        let data
        let isBase64 = false
        if (isText) {
          data = buffer.toString('utf8')
        } else {
          data = buffer.toString('base64')
          isBase64 = true
        }

        resolve({
          status: res.statusCode,
          statusText: res.statusMessage || '',
          headers: res.headers,
          data,
          isBase64,
        })
      })

      res.on('error', (err) => {
        reject(err)
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (options.body) {
      req.write(options.body)
    }

    req.end()
  })
}

async function handleProxyRequest(message) {
  const { url, method = 'GET', headers: headerString, body } = message.payload

  if (!url) {
    message.respond({ returnValue: false, errorText: 'Missing url parameter' })
    return
  }

  try {
    const headers = parseHeaders(headerString)
    const response = await request(url, { method, headers, body })

    message.respond({
      returnValue: true,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      isBase64: response.isBase64,
    })
  } catch (error) {
    message.respond({
      returnValue: false,
      errorText: error instanceof Error ? error.message : 'Proxy request failed',
    })
  }
}

module.exports = { handleProxyRequest }
