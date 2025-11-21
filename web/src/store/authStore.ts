import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '../types';

interface AuthState {
  // 認証状態
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  // アクション
  setAuth: (user: User, tokens: AuthTokens) => void;
  clearAuth: () => void;
  updateAccessToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 初期状態
      user: null,
      tokens: null,
      isAuthenticated: false,

      // アクション
      setAuth: (user, tokens) =>
        set({
          user,
          tokens,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        }),

      updateAccessToken: (accessToken) =>
        set((state) => ({
          tokens: state.tokens ? { ...state.tokens, accessToken } : null,
        })),
    }),
    {
      name: 'llamune-auth',
      // トークンは localStorage に保存（XSS対策として本番環境ではhttpOnly cookieが推奨）
    }
  )
);
