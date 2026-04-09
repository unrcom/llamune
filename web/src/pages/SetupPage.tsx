import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Poc, Model, User, SystemPrompt } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

export default function SetupPage() {
  const [pocs, setPocs] = useState<Poc[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [pocName, setPocName] = useState('')
  const [pocDisplayName, setPocDisplayName] = useState('')
  const [pocModelsId, setPocModelsId] = useState('')

  const [modelName, setModelName] = useState('')
  const [modelDisplayName, setModelDisplayName] = useState('')
  const [modelType, setModelType] = useState('base')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([])
  const [spPocId, setSpPocId] = useState('')
  const [spName, setSpName] = useState('')
  const [spContent, setSpContent] = useState('')

  const [error, setError] = useState('')

  async function load() {
    const [pocRes, modelRes, userRes] = await Promise.all([
      apiClient.get('/poc'),
      apiClient.get('/models'),
      apiClient.get('/users'),
    ])
    setPocs(pocRes.data)
    setModels(modelRes.data)
    setUsers(userRes.data)
  }

  async function loadSystemPrompts(pid: string) {
    if (!pid) return setSystemPrompts([])
    const res = await apiClient.get(`/poc/${pid}/system_prompts`)
    setSystemPrompts(res.data)
  }

  async function createSystemPrompt() {
    if (!spPocId || !spName.trim() || !spContent.trim()) return
    try {
      await apiClient.post(`/poc/${spPocId}/system_prompts`, {
        name: spName.trim(),
        content: spContent.trim(),
      })
      setSpName('')
      setSpContent('')
      loadSystemPrompts(spPocId)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function deleteSystemPrompt(id: number) {
    if (!confirm('削除しますか？')) return
    await apiClient.delete(`/poc/${spPocId}/system_prompts/${id}`)
    loadSystemPrompts(spPocId)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadSystemPrompts(spPocId) }, [spPocId])

  async function createPoc() {
    try {
      await apiClient.post('/poc', {
        name: pocName,
        display_name: pocDisplayName,
        models_id: pocModelsId ? parseInt(pocModelsId) : null,
      })
      setPocName('')
      setPocDisplayName('')
      setPocModelsId('')
      load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function deletePoc(id: number) {
    if (!confirm('削除しますか？')) return
    await apiClient.delete(`/poc/${id}`)
    load()
  }

  async function createModel() {
    try {
      await apiClient.post('/models', {
        name: modelName,
        display_name: modelDisplayName,
        model_type: modelType,
      })
      setModelName('')
      setModelDisplayName('')
      setModelType('base')
      load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function deleteModel(id: number) {
    if (!confirm('削除しますか？')) return
    await apiClient.delete(`/models/${id}`)
    load()
  }

  async function createUser() {
    try {
      await apiClient.post('/users', { username, password, is_admin: isAdmin })
      setUsername('')
      setPassword('')
      setIsAdmin(false)
      load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('削除しますか？')) return
    await apiClient.delete(`/users/${id}`)
    load()
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">設定</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* モデル管理 */}
      <Card>
        <CardHeader>
          <CardTitle>モデル管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>モデル名</Label>
              <Input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="mlx-community/Qwen2.5-14B-Instruct-4bit" />
            </div>
            <div className="space-y-1">
              <Label>表示名</Label>
              <Input value={modelDisplayName} onChange={e => setModelDisplayName(e.target.value)} placeholder="Qwen2.5 14B Instruct 4bit" />
            </div>
            <div className="space-y-1">
              <Label>タイプ</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={modelType}
                onChange={e => setModelType(e.target.value)}
              >
                <option value="base">base</option>
                <option value="fine-tuned">fine-tuned</option>
              </select>
            </div>
          </div>
          <Button size="sm" onClick={createModel} disabled={!modelName}>
            <Plus className="h-4 w-4 mr-1" /> 追加
          </Button>
          <div className="space-y-2">
            {models.map(model => (
              <div key={model.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{model.display_name || model.name}</div>
                  <div className="text-muted-foreground text-xs truncate">{model.name}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">{model.model_type}</Badge>
                    <Badge variant="secondary" className="text-xs">v{model.version}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteModel(model.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PoC管理 */}
      <Card>
        <CardHeader>
          <CardTitle>PoC 管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>名前（識別子）</Label>
              <Input value={pocName} onChange={e => setPocName(e.target.value)} placeholder="FrierenLLM" />
            </div>
            <div className="space-y-1">
              <Label>表示名</Label>
              <Input value={pocDisplayName} onChange={e => setPocDisplayName(e.target.value)} placeholder="フリーレンLLM" />
            </div>
            <div className="space-y-1">
              <Label>デフォルトモデル</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={pocModelsId}
                onChange={e => setPocModelsId(e.target.value)}
              >
                <option value="">-- 選択してください --</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button size="sm" onClick={createPoc} disabled={!pocName || !pocDisplayName}>
            <Plus className="h-4 w-4 mr-1" /> 追加
          </Button>
          <div className="space-y-2">
            {pocs.map(poc => (
              <div key={poc.id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <span className="font-medium">{poc.display_name}</span>
                  <span className="text-muted-foreground text-sm ml-2">({poc.name})</span>
                  {poc.model_display_name && (
                    <Badge variant="secondary" className="ml-2 text-xs">{poc.model_display_name}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePoc(poc.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* システムプロンプト管理 */}
      <Card>
        <CardHeader>
          <CardTitle>システムプロンプト管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>PoC</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={spPocId}
                onChange={e => setSpPocId(e.target.value)}
              >
                <option value="">-- 選択してください --</option>
                {pocs.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>
            {spPocId && (
              <>
                <div className="space-y-1">
                  <Label>プロンプト名</Label>
                  <Input value={spName} onChange={e => setSpName(e.target.value)} placeholder="デフォルトプロンプト" />
                </div>
                <div className="space-y-1">
                  <Label>内容</Label>
                  <Textarea
                    value={spContent}
                    onChange={e => setSpContent(e.target.value)}
                    placeholder="あなたはフリーレンの専門家です..."
                    rows={4}
                  />
                </div>
                <Button size="sm" onClick={createSystemPrompt} disabled={!spName.trim() || !spContent.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> 追加
                </Button>
                <div className="space-y-2">
                  {systemPrompts.map(sp => (
                    <div key={sp.id} className="flex items-start justify-between p-2 border rounded-md">
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">{sp.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{sp.content}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteSystemPrompt(sp.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {systemPrompts.length === 0 && (
                    <p className="text-muted-foreground text-sm">システムプロンプトがありません</p>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ユーザー管理 */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>ユーザー名</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>パスワード</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={isAdmin}
                onChange={e => setIsAdmin(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isAdmin">管理者権限</Label>
            </div>
          </div>
          <Button size="sm" onClick={createUser} disabled={!username || !password}>
            <Plus className="h-4 w-4 mr-1" /> 追加
          </Button>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <span className="font-medium">{user.username}</span>
                  {user.is_admin && <Badge className="ml-2 text-xs">管理者</Badge>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
