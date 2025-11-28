// API URL utility with automatic fallback
// Uses relative URLs in production, localhost in development

const LOCALHOST_API = 'http://localhost:8000'
const NETWORK_API = 'http://117.117.117.235:8000'

// Check if running in browser and not on localhost
const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1')

// In production, use relative URLs (Nginx will proxy)
// In development, use localhost:8000
const getDefaultApiUrl = () => isProduction ? '' : LOCALHOST_API

let cachedApiUrl: string | null = null
let detectionInProgress = false

export async function getApiUrl(): Promise<string> {
  // In production, always use relative URLs
  if (isProduction) {
    return ''
  }
  
  // Return cached URL if already detected
  if (cachedApiUrl) {
    return cachedApiUrl
  }

  // Avoid multiple simultaneous detection attempts
  if (detectionInProgress) {
    return LOCALHOST_API
  }

  detectionInProgress = true

  // Try localhost first (most common case, no CORS issues)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 800)
    
    const response = await fetch(`${LOCALHOST_API}/api/settings`, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      cachedApiUrl = LOCALHOST_API
      console.log('✓ Using localhost API:', LOCALHOST_API)
      detectionInProgress = false
      return LOCALHOST_API
    }
  } catch (error) {
    console.log('Localhost API unavailable, trying network...')
  }

  // Fallback to network IP
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 800)
    
    const response = await fetch(`${NETWORK_API}/api/settings`, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      cachedApiUrl = NETWORK_API
      console.log('✓ Using network API:', NETWORK_API)
      detectionInProgress = false
      return NETWORK_API
    }
  } catch (error) {
    console.log('Network API also unavailable, defaulting to localhost')
  }

  // Default to localhost (backend might start later)
  cachedApiUrl = LOCALHOST_API
  detectionInProgress = false
  return LOCALHOST_API
}

// Synchronous version for immediate use (uses cached value or defaults)
export function getApiUrlSync(): string {
  if (isProduction) {
    return ''
  }
  return cachedApiUrl || LOCALHOST_API
}

// Helper to build full API endpoint
export async function apiUrl(endpoint: string): Promise<string> {
  const baseUrl = await getApiUrl()
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

// Synchronous helper
export function apiUrlSync(endpoint: string): string {
  const baseUrl = getApiUrlSync()
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

// Enhanced fetch wrapper that auto-detects API URL
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = await apiUrl(endpoint)
  
  try {
    const response = await fetch(url, options)
    return response
  } catch (error) {
    // If fetch fails, reset cache and retry once with opposite API
    console.warn(`Fetch failed for ${url}, trying alternate API...`)
    resetApiUrl()
    
    // Try the other API URL
    const alternateUrl = cachedApiUrl === LOCALHOST_API ? NETWORK_API : LOCALHOST_API
    cachedApiUrl = alternateUrl
    
    try {
      const retryUrl = `${alternateUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
      const retryResponse = await fetch(retryUrl, options)
      console.log(`✓ Retry successful with ${alternateUrl}`)
      return retryResponse
    } catch (retryError) {
      // Both failed, throw original error
      throw error
    }
  }
}

// Reset cache (useful for testing or after network changes)
export function resetApiUrl() {
  cachedApiUrl = null
}
