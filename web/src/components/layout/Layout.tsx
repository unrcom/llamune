import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, clearTokens } from '@/api/client'
import {
  Home, MessageSquare, BookOpen, Layers, PlayCircle,
  BrainCircuit, FileText, LogOut, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'ホーム', icon: Home },
  { to: '/chat', label: 'チャット', icon: MessageSquare },
  { to: '/questions', label: '質問管理', icon: BookOpen },
  { to: '/question-sets', label: '質問セット', icon: Layers },
  { to: '/executions', label: '実行履歴', icon: PlayCircle },
  { to: '/answers', label: '回答入力', icon: BookOpen },
  { to: '/jobs', label: '訓練ジョブ', icon: BrainCircuit },
  { to: '/learning-texts', label: 'テキスト管理', icon: FileText },
  { to: '/setup', label: '設定', icon: Settings },
]

export default function Layout() {
  const { handleLogout } = useAuth()
  const navigate = useNavigate()

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
      <aside className="w-56 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-primary">llamune</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
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
