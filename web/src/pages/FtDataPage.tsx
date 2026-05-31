import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Save, Copy, Download } from 'lucide-react'

interface Project { id: number; name: string; display_name: string }
interface MessageTurn { role: string; content: string }
interface FtConversation {
  id: number
  project_id: number
  is_base: boolean
  base_id: number | null
  split: string
  messages: MessageTurn[]
  created_at: string
}
interface SystemPrompt { id: number; project_id: number; name: string; content: string }

const ROLES = ['system', 'user', 'assistant', 'tool'] as const
type Role = typeof ROLES[number]

const ROLE_LABELS: Record<string, string> = {
  system: 'system',
  user: 'user',
  assistant: 'assistant',
  tool: 'tool',
}

const ROLE_COLORS: Record<string, string> = {
  system: 'bg-gray-100 text-gray-700',
  user: 'bg-blue-50 text-blue-700',
  assistant: 'bg-green-50 text-green-700',
  tool: 'bg-yellow-50 text-yellow-700',
}

export default function FtDataPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<FtConversation[]>([])
  const [bases, setBases] = useState<FtConversation[]>([])
  const [systemPrompt, setSystemPrompt] = useState<SystemPrompt | null>(null)

  // 編集エリア
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isBase, setIsBase] = useState(false)
  const [baseId, setBaseId] = useState<number | null>(null)
  const [split, setSplit] = useState<'train' | 'valid'>('train')

  function handleSplitChange(newSplit: 'train' | 'valid') {
    if (newSplit === 'valid') {
      setMessages(prev => prev.filter(m => m.role === 'system' || m.role === 'user'))
    }
    setSplit(newSplit)
  }

  const [messages, setMessages] = useState<MessageTurn[]>([
    { role: 'system', content: '' },
    { role: 'user', content: '' },
    { role: 'assistant', content: '' },
    { role: 'tool', content: '' },
    { role: 'assistant', content: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get('/projects').then(res => setProjects(res.data)).catch(() => {})
  }, [])

  async function loadConversations(projectId: number) {
    try {
      const res = await apiClient.get(`/ft-conversations?project_id=${projectId}`)
      const all: FtConversation[] = res.data
      setBases(all.filter(c => c.is_base))
      setConversations(all)
    } catch {
      setError('データの取得に失敗しました')
    }
  }

  async function loadSystemPrompt(projectId: number) {
    try {
      const res = await apiClient.get(`/system-prompts?project_id=${projectId}`)
      const list: SystemPrompt[] = res.data
      setSystemPrompt(list.length > 0 ? list[0] : null)
    } catch {
      setSystemPrompt(null)
    }
  }

  useEffect(() => {
    if (!selectedProjectId) {
      setSystemPrompt(null)
      return
    }
    loadConversations(selectedProjectId)
    loadSystemPrompt(selectedProjectId)
  }, [selectedProjectId])

  // systemPromptが取得されたら編集エリアのsystemメッセージを更新
  useEffect(() => {
    if (!systemPrompt) return
    setMessages(prev => prev.map(m =>
      m.role === 'system' ? { ...m, content: systemPrompt.content } : m
    ))
  }, [systemPrompt])

  function buildInitialMessages(): MessageTurn[] {
    return [
      { role: 'system', content: systemPrompt?.content ?? '' },
      { role: 'user', content: '' },
      { role: 'assistant', content: '' },
      { role: 'tool', content: '' },
      { role: 'assistant', content: '' },
    ]
  }

  function newPattern() {
    setEditingId(null)
    setIsBase(false)
    setBaseId(null)
    setSplit('train')
    setMessages(buildInitialMessages())
    setError('')
  }

  function newBase() {
    setEditingId(null)
    setIsBase(true)
    setBaseId(null)
    setSplit('train')
    setMessages(buildInitialMessages())
    setError('')
  }

  function selectConversation(conv: FtConversation) {
    setEditingId(conv.id)
    setIsBase(conv.is_base)
    setBaseId(conv.base_id)
    setSplit(conv.split as 'train' | 'valid')
    // systemロールの内容はプロジェクトのシステムプロンプトで上書き
    const msgs = conv.messages.map(m =>
      m.role === 'system' ? { ...m, content: systemPrompt?.content ?? m.content } : m
    )
    setMessages(msgs)
    setError('')
  }

  function copyFromBase(base: FtConversation) {
    setEditingId(null)
    setIsBase(false)
    setBaseId(base.id)
    const msgs = base.messages.map(m =>
      m.role === 'system' ? { ...m, content: systemPrompt?.content ?? m.content } : m
    )
    setMessages(msgs)
    setError('')
  }

  function updateMessage(index: number, field: 'role' | 'content', value: string) {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  function addTurn() {
    const lastRole = messages[messages.length - 1]?.role
    let nextRole = 'user'
    if (lastRole === 'user') nextRole = 'assistant'
    else if (lastRole === 'assistant') nextRole = 'tool'
    setMessages(prev => [...prev, { role: nextRole, content: '' }])
  }

  function deleteTurn(index: number) {
    setMessages(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!selectedProjectId) return
    setSaving(true)
    setError('')
    try {
      const body = {
        project_id: selectedProjectId,
        is_base: isBase,
        base_id: baseId,
        split,
        messages,
      }
      if (editingId) {
        await apiClient.put(`/ft-conversations/${editingId}`, { is_base: isBase, split, messages })
      } else {
        const res = await apiClient.post('/ft-conversations', body)
        setEditingId(res.data.id)
      }
      await loadConversations(selectedProjectId)
    } catch (e: any) {
      setError(e.response?.data?.detail || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  function copyPattern(conv: FtConversation) {
    setEditingId(null)
    setIsBase(false)
    setBaseId(conv.base_id)
    setSplit('train')
    const msgs = conv.messages.map(m =>
      m.role === 'system' ? { ...m, content: systemPrompt?.content ?? m.content } : m
    )
    setMessages(msgs)
    setError('')
  }

  async function handleToggleSplit(conv: FtConversation) {
    const newSplit = conv.split === 'train' ? 'valid' : 'train'
    try {
      await apiClient.patch(`/ft-conversations/${conv.id}/split?split=${newSplit}`, {})
      if (selectedProjectId) await loadConversations(selectedProjectId)
    } catch {
      setError('splitの変更に失敗しました')
    }
  }

  async function handleDelete(id: number, label: string = 'このデータ') {
    if (!confirm(`${label}を削除しますか？`)) return
    try {
      await apiClient.delete(`/ft-conversations/${id}`)
      if (editingId === id) newPattern()
      if (selectedProjectId) await loadConversations(selectedProjectId)
    } catch {
      setError('削除に失敗しました')
    }
  }

  async function handleExport(split: 'train' | 'valid') {
    if (!selectedProjectId) return
    try {
      const res = await apiClient.get(`/ft-conversations/export?project_id=${selectedProjectId}&split=${split}`)
      const blob = new Blob([res.data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${split}.jsonl`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('エクスポートに失敗しました')
    }
  }

  const patterns = conversations.filter(c => !c.is_base)

  function getFirstUserContent(conv: FtConversation) {
    const userMsg = conv.messages.find(m => m.role === 'user')
    return userMsg?.content?.slice(0, 30) || '（空）'
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">FTデータ管理</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('train')} disabled={!selectedProjectId}>
            <Download className="h-4 w-4 mr-2" />train
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('valid')} disabled={!selectedProjectId}>
            <Download className="h-4 w-4 mr-2" />valid
          </Button>
        </div>
      </div>

      {/* プロジェクト選択 */}
      <div className="space-y-1">
        <Label>プロジェクト</Label>
        <select
          className="w-full border rounded px-3 py-2 text-sm bg-white"
          value={selectedProjectId ?? ''}
          onChange={e => setSelectedProjectId(Number(e.target.value) || null)}
        >
          <option value="">選択してください</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      </div>

      {selectedProjectId && (
        <>
          {/* 編集エリア */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {(() => {
                    if (editingId) return `編集中 (ID: ${editingId})`
                    return isBase ? '新規ベース' : '新規パターン'
                  })()}
                  {isBase && <Badge className="ml-2" variant="secondary">ベース</Badge>}
                  {baseId && <Badge className="ml-2" variant="outline">ベースID: {baseId}</Badge>}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant={isBase ? "outline" : "default"} onClick={newBase}>
                    ベース
                  </Button>
                  <Button size="sm" variant={isBase ? "default" : "outline"} onClick={newPattern}>
                    パターン
                  </Button>
                  {!isBase && (
                    <button
                      onClick={() => handleSplitChange(split === 'train' ? 'valid' : 'train')}
                      className={`px-2 py-1 rounded text-xs font-medium border ${split === 'train' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'}`}
                    >
                      {split}
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.map((msg, i) => {
                const fmKey = `${i}-${msg.role}`
                return (
                <div key={fmKey} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {msg.role === 'system' ? (
                      <span className="border rounded px-2 py-1 text-xs bg-gray-50 w-28 text-gray-500">system</span>
                    ) : (
                      <select
                        className="border rounded px-2 py-1 text-xs bg-white w-28"
                        value={msg.role}
                        onChange={e => updateMessage(i, 'role', e.target.value)}
                      >
                        {ROLES.filter(r => r !== 'system').map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[msg.role] || ''}`}>
                      {ROLE_LABELS[msg.role] || msg.role}
                    </span>
                    {msg.role !== 'system' && (
                      <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => deleteTurn(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={msg.content}
                    onChange={e => msg.role !== 'system' && updateMessage(i, 'content', e.target.value)}
                    rows={3}
                    className={`text-sm font-mono ${msg.role === 'system' ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder={msg.role === 'system' ? '（システムプロンプトが設定されていません）' : `${msg.role}の内容を入力`}
                    readOnly={msg.role === 'system'}
                  />
                </div>
              )
              })}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={addTurn}>
                  <Plus className="h-3 w-3 mr-1" />ターン追加
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-3 w-3 mr-1" />
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ベース一覧 */}
          {bases.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500">ベース</h3>
              {bases.map(base => (
                <Card key={base.id} className="cursor-pointer hover:bg-gray-50">
                  <CardContent className="flex items-center justify-between py-2 px-4">
                    <button type="button" onClick={() => selectConversation(base)} className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">ベース</Badge>
                        <span className="text-sm text-gray-600">
                          {base.messages[0]?.content?.slice(0, 40) || '（空）'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{base.created_at}</p>
                    </button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyFromBase(base)} title="このベースからパターンを作成">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(base.id, `ベース「${base.messages[0]?.content?.slice(0, 20)}...」`)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* パターン一覧 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500">
              パターン（{patterns.length}件）
            </h3>
            {patterns.length === 0 ? (
              <p className="text-sm text-gray-400">パターンがありません</p>
            ) : (
              patterns.map(conv => (
                <Card
                  key={conv.id}
                  className={`cursor-pointer hover:bg-gray-50 ${editingId === conv.id ? 'border-blue-400' : ''}`}
                >
                  <CardContent className="flex items-center justify-between py-2 px-4">
                    <button type="button" onClick={() => selectConversation(conv)} className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        {conv.base_id && <Badge variant="outline" className="text-xs">ベースID: {conv.base_id}</Badge>}
                        <Badge
                          variant={conv.split === 'train' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {conv.split}
                        </Badge>
                        <span className="text-sm">{getFirstUserContent(conv)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{conv.created_at}</p>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => copyPattern(conv)} title="コピー">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(conv.id, `パターン「${getFirstUserContent(conv)}」`)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
