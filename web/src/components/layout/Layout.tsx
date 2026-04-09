import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/api/client'
import {
  Home, MessageSquare, BrainCircuit, FileText, LogOut, Settings, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'ホーム', icon: Home },
  { to: '/chat', label: 'チャット', icon: MessageSquare },
  { to: '/jobs', label: '訓練ジョブ', icon: BrainCircuit },
  { to: '/learning-texts', label: 'テキスト管理', icon: FileText },
  { to: '/setup', label: '設定', icon: Settings },
]

export default function Layout() {
  const { handleLogout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  async function onLogout() {
    try {
      const refreshToken = localStorage.getItem('llamune_refresh_token')
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken })
      }
    } catch {
      // ignore
    }
    handleLogout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* サイドバー */}
      <aside
        className={cn(
          'border-r bg-muted/30 flex flex-col transition-all duration-200',
          open ? 'w-48' : 'w-12'
        )}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-3 border-b h-14">
          {open && <h1 className="text-base font-bold text-primary">llamune</h1>}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* ナビ */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={!open ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors',
                  open ? 'px-3' : 'justify-center',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {open && label}
            </NavLink>
          ))}
        </nav>

        {/* ログアウト */}
        <div className="p-2 border-t">
          <button
            onClick={onLogout}
            title={!open ? 'ログアウト' : undefined}
            className={cn(
              'flex items-center gap-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors',
              open ? 'px-3' : 'justify-center px-2'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {open && 'ログアウト'}
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
