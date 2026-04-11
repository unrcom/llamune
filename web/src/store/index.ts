import { create } from 'zustand'

interface AppState {
  // 認証
  loggedIn: boolean
  setLoggedIn: (v: boolean) => void

  // バックエンド接続状態
  backendDown: boolean
  setBackendDown: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  loggedIn: !!localStorage.getItem('llamune_access_token'),
  setLoggedIn: (v) => set({ loggedIn: v }),

  backendDown: false,
  setBackendDown: (v) => set({ backendDown: v }),
}))
