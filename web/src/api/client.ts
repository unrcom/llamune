import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const apiClient = axios.create({ baseURL: API_URL })

const TOKEN_KEY = 'llmn_access_token'
const REFRESH_KEY = 'llmn_refresh_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY)
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}
export const clearTokens = () => {
  console.log('[auth] clearTokens called')
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function getIsAdmin(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.is_admin === true
  } catch {
    return false
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config
    console.log(`[auth] response error: status=${error.response?.status} url=${original?.url}`)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = getRefreshToken()
      console.log(`[auth] attempting refresh, refreshToken exists: ${!!refreshToken}`)
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
          console.log('[auth] refresh success')
          setTokens(res.data.access_token, res.data.refresh_token)
          original.headers.Authorization = `Bearer ${res.data.access_token}`
          return apiClient(original)
        } catch (e) {
          console.log('[auth] refresh failed', e)
          clearTokens()
          globalThis.location.href = '/login'
        }
      } else {
        console.log('[auth] no refresh token, redirecting to login')
        clearTokens()
        globalThis.location.href = '/login'
      }
    }
    throw error
  }
)
