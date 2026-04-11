import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_URL,
})

const TOKEN_KEY = 'llamune_access_token'
const REFRESH_KEY = 'llamune_refresh_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

let isRefreshing = false
let refreshQueue: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshQueue.forEach(cb => cb(token))
  refreshQueue = []
}

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        // リフレッシュ中なら完了を待つ
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(original))
          })
        })
      }

      isRefreshing = true
      const refreshToken = getRefreshToken()

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const newToken = res.data.access_token
          setTokens(newToken, res.data.refresh_token)
          onRefreshed(newToken)
          original.headers.Authorization = `Bearer ${newToken}`
          return apiClient(original)
        } catch {
          clearTokens()
          window.location.href = '/login'
        } finally {
          isRefreshing = false
        }
      } else {
        isRefreshing = false
        clearTokens()
        window.location.href = '/login'
      }
    }
    // ネットワークエラー（バックエンド無応答）
    if (!error.response) {
      import('@/store').then(({ useAppStore }) => useAppStore.getState().setBackendDown(true))
    }
    return Promise.reject(error)
  }
)
