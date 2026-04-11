import { createContext, useContext, useState, ReactNode } from 'react'
import { getToken, clearTokens } from '@/api/client'

interface AuthContextType {
  loggedIn: boolean
  handleLogin: () => void
  handleLogout: () => void
  backendDown: boolean
  setBackendDown: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(() => !!getToken())
  const [backendDown, setBackendDown] = useState(false)

  function handleLogin() {
    setLoggedIn(true)
  }

  function handleLogout() {
    clearTokens()
    setLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ loggedIn, handleLogin, handleLogout, backendDown, setBackendDown }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
