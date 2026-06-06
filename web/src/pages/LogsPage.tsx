import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Input } from '@/components/ui/input'
import {
  ChevronDown, ChevronRight, Trash2, Pencil, Check, X,
  Loader2, Clock, MessageSquare, Cpu, Search,
} from 'lucide-react'

interface Session {
  id: string
  name: string
  created_at: string
  turn_count: number
  model_name: string
  user_id: number | null
  username: string
  project_id: number | null
  project_name: string
}

interface TurnLog {
  id: string
  turn_cnt: number
  model_name: string
  user_message: string
  search_mode: string
  rag_query: string | null
  rag_result: string | null
  system_prompt: string
  llm_response: string
  response_time_ms: number
  created_at: string
}

interface SessionDetail {
  session: { id: string; name: string; created_at: string }
  logs: TurnLog[]
}

interface Meta {
  users: { id: number; username: string }[]
  projects: { id: number; display_name: string }[]
  model_names: string[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function SearchModeChip({ mode }: Readonly<{ mode: string }>) {
  const styles: Record<string, string> = {
    off:    'bg-gray-100 text-gray-600',
    direct: 'bg-blue-100 text-blue-700',
    llm:    'bg-purple-100 text-purple-700',
  }
  const labels: Record<string, string> = {
    off: 'RAGなし', direct: 'Direct RAG', llm: 'LLM RAG',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${styles[mode] ?? 'bg-gray-100 text-gray-600'}`}>
      {mode !== 'off' && <Search className="h-3 w-3" />}
      {labels[mode] ?? mode}
    </span>
  )
}

interface TurnCardProps {
  log: TurnLog
  expanded: boolean
  onToggle: () => void
}

function TurnCard({ log, expanded, onToggle }: Readonly<TurnCardProps>) {
  const ragData = (() => {
    if (!log.rag_result) return null
    try { return JSON.parse(log.rag_result) } catch { return null }
  })()

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
          Turn {log.turn_cnt}
        </span>
        <SearchModeChip mode={log.search_mode} />
        <span className="text-sm text-gray-700 truncate flex-1">{log.user_message}</span>
        <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {log.response_time_ms}ms
        </span>
        <span className="text-xs text-gray-400 shrink-0">{formatDate(log.created_at)}</span>
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 bg-gray-50">
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">ユーザーメッセージ</div>
            <div className="bg-white border rounded p-3 text-sm whitespace-pre-wrap">{log.user_message}</div>
          </div>

          {log.search_mode !== 'off' && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">RAG検索クエリ</div>
              <div className="bg-white border rounded p-3 text-sm font-mono">{log.rag_query ?? '—'}</div>
              {ragData && (
                <div className="mt-2 space-y-1">
                  {(ragData.hits as Array<{ rank: number; distance: number; text: string }>).map((hit) => (
                    <div key={hit.rank} className="bg-white border rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">#{hit.rank}</span>
                        <span className={`text-xs font-medium ${hit.distance <= ragData.threshold ? 'text-green-600' : 'text-red-500'}`}>
                          distance: {hit.distance}
                        </span>
                        {hit.distance <= ragData.threshold && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">使用</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-3">{hit.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">LLM応答</div>
            <div className="bg-white border rounded p-3 text-sm whitespace-pre-wrap">{log.llm_response}</div>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600 list-none flex items-center gap-1">
              <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
              システムプロンプト
            </summary>
            <div className="mt-2 bg-white border rounded p-3 text-xs font-mono whitespace-pre-wrap text-gray-600 max-h-48 overflow-y-auto">
              {log.system_prompt || '（なし）'}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

interface SessionRowProps {
  session: Session
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

function SessionRow({ session, onDelete, onRename }: Readonly<SessionRowProps>) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [expandedTurns, setExpandedTurns] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(session.name)
  const [saving, setSaving] = useState(false)

  async function toggleExpand() {
    if (!expanded && !detail) {
      setLoadingDetail(true)
      try {
        const res = await apiClient.get(`/chat-sessions/${session.id}/logs`)
        setDetail(res.data)
      } finally {
        setLoadingDetail(false)
      }
    }
    setExpanded(v => !v)
  }

  function toggleTurn(id: string) {
    setExpandedTurns(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function saveRename() {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await apiClient.patch(`/chat-sessions/${session.id}`, { name: editName.trim() })
      onRename(session.id, editName.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`セッション「${session.name}」を削除しますか？\nすべてのチャットログも削除されます。`)) return
    await apiClient.delete(`/chat-sessions/${session.id}`)
    onDelete(session.id)
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
        <button onClick={toggleExpand} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {loadingDetail && <Loader2 className="h-4 w-4 text-gray-400 shrink-0 animate-spin" />}
          {!loadingDetail && expanded && <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
          {!loadingDetail && !expanded && <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            {editing ? (
              <button type="button" className="flex items-center gap-2 w-full cursor-default" onClick={e => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { saveRename() }
                    else if (e.key === 'Escape') { setEditing(false) }
                  }}
                  className="h-7 text-sm"
                  autoFocus
                />
                <button onClick={saveRename} disabled={saving} className="text-green-600 hover:text-green-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </button>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-sm text-gray-800 truncate">{session.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(session.created_at)}</span>
                {session.project_name !== '—' && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shrink-0">{session.project_name}</span>
                )}
                {session.username !== '—' && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{session.username}</span>
                )}
              </div>
            )}
          </div>
        </button>

        {!editing && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1 text-xs text-gray-500" title={session.model_name}>
              <Cpu className="h-3 w-3" />
              <span className="max-w-24 truncate">{session.model_name || '—'}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="h-3 w-3" />
              {session.turn_count}ターン
            </span>
            <button
              onClick={e => { e.stopPropagation(); setEditName(session.name); setEditing(true) }}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="名前を変更"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDelete() }}
              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              title="削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {expanded && detail && (
        <div className="border-t px-4 py-3 space-y-2 bg-gray-50">
          {detail.logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">ログがありません</p>
          ) : (
            detail.logs.map(log => (
              <TurnCard
                key={log.id}
                log={log}
                expanded={expandedTurns.has(log.id)}
                onToggle={() => toggleTurn(log.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function LogsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Meta>({ users: [], projects: [], model_names: [] })

  // フィルター
  const [nameFilter, setNameFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [userFilter, setUserFilter] = useState<string>('')
  const [modelFilter, setModelFilter] = useState<string>('')

  useEffect(() => {
    Promise.all([
      apiClient.get('/chat-sessions'),
      apiClient.get('/chat-sessions/meta'),
    ]).then(([sessRes, metaRes]) => {
      setSessions(sessRes.data)
      setMeta(metaRes.data)
    }).catch(() => setError('データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  function handleRename(id: string, name: string) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  const filtered = sessions.filter(s => {
    if (nameFilter && !s.name.toLowerCase().includes(nameFilter.toLowerCase())) return false
    if (projectFilter && String(s.project_id) !== projectFilter) return false
    if (userFilter && String(s.user_id) !== userFilter) return false
    if (modelFilter && !s.model_name.includes(modelFilter)) return false
    return true
  })

  const selectClass = "border rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">チャットログ</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} / {sessions.length}セッション</p>
          </div>
        </div>

        {/* フィルターバー */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="セッション名で絞り込み"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            className="text-sm w-48"
          />
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">すべてのプロジェクト</option>
            {meta.projects.map(p => (
              <option key={p.id} value={String(p.id)}>{p.display_name}</option>
            ))}
          </select>
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">すべてのユーザー</option>
            {meta.users.map(u => (
              <option key={u.id} value={String(u.id)}>{u.username}</option>
            ))}
          </select>
          <select
            value={modelFilter}
            onChange={e => setModelFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">すべてのモデル</option>
            {meta.model_names.map(m => (
              <option key={m} value={m} title={m}>{m.split('/').pop()}</option>
            ))}
          </select>
          {(nameFilter || projectFilter || userFilter || modelFilter) && (
            <button
              onClick={() => { setNameFilter(''); setProjectFilter(''); setUserFilter(''); setModelFilter('') }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2"
            >
              <X className="h-3 w-3" />
              クリア
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      {error && (
        <div className="text-red-500 text-sm text-center py-8">{error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-gray-400 text-sm text-center py-16">
          {(nameFilter || projectFilter || userFilter || modelFilter)
            ? '条件に一致するセッションがありません'
            : 'チャットログはまだありません'}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(session => (
          <SessionRow
            key={session.id}
            session={session}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        ))}
      </div>
    </div>
  )
}
