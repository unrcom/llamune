import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Search, Loader2, HardDrive, Pencil, Check, X } from 'lucide-react'

interface Model {
  id: number
  name: string
  display_name: string
  model_type: string
  adapter_path: string | null
  parent_models_id: number | null
}

interface LocalModel {
  name: string
  display_name: string
  registered: boolean
}

interface LocalAdapter {
  path: string
  name: string
}

interface HFModel {
  id: string
  downloads: number
}

interface HFModelDetail {
  siblings: { rfilename: string; size: number }[]
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

type Tab = 'local' | 'hf'

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('local')

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [modelType, setModelType] = useState<'base' | 'fine-tuned'>('base')
  const [adapterPath, setAdapterPath] = useState('')
  const [parentModelId, setParentModelId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [localAdapters, setLocalAdapters] = useState<LocalAdapter[]>([])
  const [editingModelId, setEditingModelId] = useState<number | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editAdapterPath, setEditAdapterPath] = useState('')

  // ローカルモデル
  const [localModels, setLocalModels] = useState<LocalModel[]>([])
  const [localLoading, setLocalLoading] = useState(false)

  // HuggingFace検索
  const [hfQuery, setHfQuery] = useState('')
  const [hfModels, setHfModels] = useState<HFModel[]>([])
  const [hfLoading, setHfLoading] = useState(false)
  const [hfError, setHfError] = useState('')
  const [selectedHF, setSelectedHF] = useState<HFModel | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [fileSizeLoading, setFileSizeLoading] = useState(false)

  async function load() {
    try {
      const res = await apiClient.get('/models')
      setModels(res.data)
    } catch {
      setError('モデルの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function loadLocal() {
    setLocalLoading(true)
    try {
      const res = await apiClient.get('/models/local')
      setLocalModels(res.data)
    } catch {
      setError('ローカルモデルの取得に失敗しました')
    } finally {
      setLocalLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadLocal()
    apiClient.get('/models/local-adapters')
      .then(res => setLocalAdapters(res.data))
      .catch(() => {})
  }, [])

  function selectLocal(m: LocalModel) {
    setName(m.name)
    setDisplayName(m.display_name)
  }

  async function searchHF() {
    setHfLoading(true)
    setHfError('')
    setHfModels([])
    setSelectedHF(null)
    setFileSize(null)
    try {
      const params = new URLSearchParams({
        author: 'mlx-community',
        limit: '100',
        sort: 'downloads',
        direction: '-1',
      })
      if (hfQuery.trim()) params.append('search', hfQuery.trim())
      const res = await fetch(`https://huggingface.co/api/models?${params}`)
      if (!res.ok) throw new Error("Failed to load")
      const data: HFModel[] = await res.json()
      data.sort((a, b) => a.id.localeCompare(b.id))
      setHfModels(data)
    } catch {
      setHfError('HuggingFaceからの取得に失敗しました')
    } finally {
      setHfLoading(false)
    }
  }

  async function selectHFModel(hfModel: HFModel) {
    setSelectedHF(hfModel)
    setFileSize(null)
    setFileSizeLoading(true)
    setName(hfModel.id)
    setDisplayName(hfModel.id.split('/').pop() || hfModel.id)
    try {
      const res = await fetch(`https://huggingface.co/api/models/${hfModel.id}?blobs=true`)
      if (!res.ok) throw new Error("Failed to load")
      const detail: HFModelDetail = await res.json()
      const totalBytes = detail.siblings.reduce((sum, f) => sum + (f.size || 0), 0)
      setFileSize(formatBytes(totalBytes))
    } catch {
      setFileSize('取得失敗')
    } finally {
      setFileSizeLoading(false)
    }
  }

  function startEdit(m: Model) {
    setEditingModelId(m.id)
    setEditDisplayName(m.display_name)
    setEditAdapterPath(m.adapter_path || '')
  }

  function cancelEdit() {
    setEditingModelId(null)
  }

  async function handleUpdate(m: Model) {
    try {
      await apiClient.put(`/models/${m.id}`, {
        display_name: editDisplayName,
        adapter_path: editAdapterPath || null,
      })
      setError(null)
      setEditingModelId(null)
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail || '更新に失敗しました')
    }
  }

  async function handleAdd() {
    if (!name.trim() || !displayName.trim()) return
    setAdding(true)
    try {
      await apiClient.post('/models', {
        name,
        display_name: displayName,
        model_type: modelType,
        adapter_path: adapterPath || null,
        parent_models_id: parentModelId || null,
      })
      setName('')
      setDisplayName('')
      setModelType('base')
      setAdapterPath('')
      setParentModelId(null)
      setSelectedHF(null)
      setFileSize(null)
      await load()
      await loadLocal()
    } catch (e: any) {
      setError(e.response?.data?.detail || '登録に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('削除しますか？')) return
    try {
      await apiClient.delete(`/models/${id}`)
      await load()
      await loadLocal()
    } catch {
      setError('削除に失敗しました')
    }
  }

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold">モデル管理</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* モデル選択 */}
      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('local')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <HardDrive className="h-3 w-3 inline mr-1" />
              ローカル
            </button>
            <button
              onClick={() => setTab('hf')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === 'hf' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              HuggingFace
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* ローカルモデル */}
          {tab === 'local' && (
            <>
              {localLoading && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />読み込み中...
                </div>
              )}
              {!localLoading && localModels.length === 0 && (
                <p className="text-sm text-gray-500">ローカルモデルが見つかりません</p>
              )}
              {!localLoading && localModels.length > 0 && (
                <div className="border rounded max-h-64 overflow-y-auto">
                  {localModels.map(m => {
                    let btnClass = 'hover:bg-gray-50'
                    if (m.registered) btnClass = 'bg-gray-50 cursor-not-allowed'
                    else if (name === m.name) btnClass = 'bg-blue-50'
                    return (
                    <button
                      key={m.name}
                      onClick={() => !m.registered && selectLocal(m)}
                      disabled={m.registered}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 flex items-center justify-between transition-colors ${btnClass}`}
                    >
                      <span className="text-sm font-mono">{m.display_name}</span>
                      {m.registered && <Badge variant="secondary" className="text-xs">登録済み</Badge>}
                      {!m.registered && name === m.name && <Badge variant="outline" className="text-xs text-blue-600">選択中</Badge>}
                    </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* HuggingFace検索 */}
          {tab === 'hf' && (
            <>
              <div className="flex gap-2">
                <Input
                  value={hfQuery}
                  onChange={e => setHfQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchHF()}
                  placeholder="例: Qwen, gemma, llama"
                  className="flex-1"
                />
                <Button onClick={searchHF} disabled={hfLoading} variant="outline">
                  {hfLoading
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Search className="h-4 w-4 mr-2" />
                  }
                  {hfLoading ? '検索中...' : '検索'}
                </Button>
              </div>

              {hfError && <p className="text-sm text-red-600">{hfError}</p>}

              {hfModels.length > 0 && (
                <div className="border rounded max-h-64 overflow-y-auto">
                  {hfModels.map(m => (
                    <button
                      key={m.id}
                      onClick={() => selectHFModel(m)}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 flex items-center justify-between transition-colors ${
                        selectedHF?.id === m.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-mono">{m.id.split('/').pop()}</span>
                      <span className="text-xs text-gray-400">DL: {m.downloads.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedHF && (
                <div className="bg-blue-50 rounded p-3 space-y-1">
                  <p className="text-sm font-mono text-blue-800">{selectedHF.id}</p>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span>ファイルサイズ（≒メモリ使用量）:</span>
                    {fileSizeLoading
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <span className="font-semibold">{fileSize}</span>
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 登録フォーム */}
      <Card>
        <CardHeader><CardTitle className="text-base">モデルを登録</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>モデル名</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="mlx-community/Qwen2.5-14B-Instruct-4bit"
              />
            </div>
            <div className="space-y-1">
              <Label>表示名</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Qwen2.5 14B"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>種別</Label>
            <select
              className="w-full border rounded px-3 py-2 text-sm bg-white"
              value={modelType}
              onChange={e => setModelType(e.target.value as 'base' | 'fine-tuned')}
            >
              <option value="base">ベースモデル</option>
              <option value="fine-tuned">ファインチューニング済み</option>
            </select>
          </div>

          {modelType === 'fine-tuned' && (
            <>
              <div className="space-y-1">
                <Label>アダプターパス</Label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={adapterPath}
                  onChange={e => setAdapterPath(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {localAdapters.map(a => (
                    <option key={a.path} value={a.path}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>ベースモデル</Label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={parentModelId ?? ''}
                  onChange={e => setParentModelId(Number(e.target.value) || null)}
                >
                  <option value="">選択してください</option>
                  {models.filter(m => m.model_type === 'base').map(m => (
                    <option key={m.id} value={m.id}>{m.display_name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <Button onClick={handleAdd} disabled={adding || !name.trim() || !displayName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            {adding ? '追加中...' : '登録'}
          </Button>
        </CardContent>
      </Card>

      {/* モデル一覧 */}
      <div className="space-y-2">
        {models.length === 0 ? (
          <p className="text-gray-500 text-sm">登録済みモデルがありません</p>
        ) : (
          models.map(m => (
            <Card key={m.id}>
              <CardContent className="py-3">
                {editingModelId === m.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        value={editDisplayName}
                        onChange={e => setEditDisplayName(e.target.value)}
                        placeholder="表示名"
                      />
                    </div>
                    {m.model_type === 'fine-tuned' && (
                      <select
                        className="w-full border rounded px-2 py-1 text-sm bg-white"
                        value={editAdapterPath}
                        onChange={e => setEditAdapterPath(e.target.value)}
                      >
                        <option value="">なし</option>
                        {localAdapters.map(a => (
                          <option key={a.path} value={a.path}>{a.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(m)}>
                        <Check className="h-3 w-3 mr-1" />保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-3 w-3 mr-1" />キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{m.display_name}</span>
                        <Badge variant={m.model_type === 'base' ? 'outline' : 'secondary'}>
                          {m.model_type === 'base' ? 'ベース' : 'FT済み'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">{m.name}</p>
                      {m.adapter_path && (
                        <p className="text-xs text-gray-400">adapter: {m.adapter_path}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
