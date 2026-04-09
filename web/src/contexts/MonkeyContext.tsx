import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/api/client'

interface MonkeyStatus {
  connected: boolean
  url: string
}

interface MonkeyContextType {
  status: MonkeyStatus | null
}

const MonkeyContext = createContext<MonkeyContextType | null>(null)

export function MonkeyProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MonkeyStatus | null>(null)

  useEffect(() => {
    const monkeyUrl = import.meta.env.VITE_MONKEY_URL || ''
    if (!monkeyUrl) return

    const check = async () => {
      try {
        await apiClient.get(`${monkeyUrl}/api/health`)
        setStatus({ connected: true, url: monkeyUrl })
      } catch {
        setStatus({ connected: false, url: monkeyUrl })
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <MonkeyContext.Provider value={{ status }}>
      {children}
    </MonkeyContext.Provider>
  )
}

export function useMonkey() {
  const ctx = useContext(MonkeyContext)
  if (!ctx) throw new Error('useMonkey must be used within MonkeyProvider')
  return ctx
}
