import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react'

interface Project { id: number; display_name: string }
interface Dataset { id: number; project_id: number; name: string; display_name: string; description: string | null; created_at: string }
interface Document { id: string; content: string }

export default function DatasetPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])

  // データセット作成
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // データセット編集
  const [editingDatasetId, setEditingDatasetId] = useState<number | null>(null)
  const [editingDisplayName, setEditingDisplayName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  // ドキュメント追加
  const [newDocContent, setNewDocContent] = useState('')
  const [showAddDoc, setShowAddDoc] = useState(false)

  // ドキュメント編集
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get('/projects').then(res => setProjects(res.data))
  }, [])

  useEffect(() => {
    if (!selectedProjectId) return
    apiClient.get(`/datasets?project_id=${selectedProjectId}`).then(res => setDatasets(res.data))
    setSelectedDataset(null)
    setDocuments([])
  }, [selectedProjectId])

  async function loadDocuments(dataset: Dataset) {
    setSelectedDataset(dataset)
    const res = await apiClient.get(`/datasets/${dataset.id}/documents`)
    setDocuments(res.data)
  }

  async function createDataset() {
    if (!newDisplayName || !selectedProjectId) return
    setError(null)
    try {
      await apiClient.post('/datasets', {
        project_id: selectedProjectId,
        display_name: newDisplayName,
        description: newDescription || null,
      })
      setNewDisplayName('')
      setNewDescription('')
      setShowCreateForm(false)
      const res = await apiClient.get(`/datasets?project_id=${selectedProjectId}`)
      setDatasets(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function updateDataset() {
    if (!editingDatasetId || !editingDisplayName) return
    setError(null)
    try {
      await apiClient.put(`/datasets/${editingDatasetId}`, {
        display_name: editingDisplayName,
        description: editingDescription || null,
      })
      setEditingDatasetId(null)
      const res = await apiClient.get(`/datasets?project_id=${selectedProjectId}`)
      setDatasets(res.data)
      if (selectedDataset?.id === editingDatasetId) {
        setSelectedDataset(d => d ? { ...d, display_name: editingDisplayName, description: editingDescription } : d)
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function deleteDataset(id: number) {
    if (!confirm('削除しますか？')) return
    await apiClient.delete(`/datasets/${id}`)
    setDatasets(d => d.filter(x => x.id !== id))
    if (selectedDataset?.id === id) { setSelectedDataset(null); setDocuments([]) }
  }

  async function addDocument() {
    if (!newDocContent.trim() || !selectedDataset) return
    setError(null)
    try {
      await apiClient.post(`/datasets/${selectedDataset.id}/documents`, { content: newDocContent })
      setNewDocContent('')
      setShowAddDoc(false)
      const res = await apiClient.get(`/datasets/${selectedDataset.id}/documents`)
      setDocuments(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function updateDocument(docId: string) {
    if (!selectedDataset) return
    setError(null)
    try {
      await apiClient.put(`/datasets/${selectedDataset.id}/documents/${docId}`, { content: editingContent })
      setEditingDocId(null)
      const res = await apiClient.get(`/datasets/${selectedDataset.id}/documents`)
      setDocuments(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function deleteDocument(docId: string) {
    if (!selectedDataset || !confirm('削除しますか？')) return
    await apiClient.delete(`/datasets/${selectedDataset.id}/documents/${docId}`)
    setDocuments(d => d.filter(x => x.id !== docId))
  }

  return (
    <div className="flex h-full">
      {/* 左パネル：データセット一覧 */}
      <div className="w-72 border-r bg-white p-4 flex flex-col gap-4 shrink-0">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">プロジェクト</Label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={selectedProjectId ?? ''}
            onChange={e => setSelectedProjectId(Number(e.target.value) || null)}
          >
            <option value="">-- 選択 --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>

        {selectedProjectId && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">データセット</span>
              <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(v => !v); setError(null) }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {showCreateForm && (
              <div className="border rounded p-3 space-y-2 bg-gray-50">
                <Input placeholder="表示名" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="text-sm" />
                <Input placeholder="説明（省略可）" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="text-sm" />
                {error && <div className="text-red-500 text-xs">{error}</div>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={createDataset} className="flex-1">作成</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(false); setError(null) }}>キャンセル</Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {datasets.map(d => (
                <div key={d.id}>
                  {editingDatasetId === d.id ? (
                    <div className="border rounded p-2 space-y-1 bg-gray-50">
                      <Input value={editingDisplayName} onChange={e => setEditingDisplayName(e.target.value)} className="text-sm" />
                      <Input value={editingDescription} onChange={e => setEditingDescription(e.target.value)} placeholder="説明（省略可）" className="text-sm" />
                      {error && <div className="text-red-500 text-xs">{error}</div>}
                      <div className="flex gap-1">
                        <Button size="sm" onClick={updateDataset} className="flex-1"><Check className="h-3 w-3 mr-1" />保存</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDatasetId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm ${selectedDataset?.id === d.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                      onClick={() => loadDocuments(d)}
                    >
                      <span className="truncate">{d.display_name}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={e => { e.stopPropagation(); setEditingDatasetId(d.id); setEditingDisplayName(d.display_name); setEditingDescription(d.description || ''); setError(null) }} className="text-gray-400 hover:text-blue-500">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteDataset(d.id) }} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 右パネル：ドキュメント一覧 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!selectedDataset ? (
          <div className="text-center text-gray-400 text-sm mt-20">データセットを選択してください</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">{selectedDataset.display_name}</h2>
              <Button size="sm" onClick={() => { setShowAddDoc(v => !v); setError(null) }}>
                <Plus className="h-3 w-3 mr-1" /> 追加
              </Button>
            </div>

            {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

            {showAddDoc && (
              <div className="border rounded p-3 mb-4 bg-gray-50 space-y-2">
                <Textarea
                  rows={4}
                  placeholder='{"title": "...", "content": "..."}'
                  value={newDocContent}
                  onChange={e => setNewDocContent(e.target.value)}
                  className="text-sm font-mono"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addDocument}>登録</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddDoc(false)}>キャンセル</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="border rounded p-3 bg-white">
                  {editingDocId === doc.id ? (
                    <div className="space-y-2">
                      <Textarea
                        rows={4}
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        className="text-sm font-mono"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateDocument(doc.id)}><Check className="h-3 w-3 mr-1" />保存</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDocId(null)}><X className="h-3 w-3 mr-1" />キャンセル</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <pre className="text-sm flex-1 whitespace-pre-wrap break-all font-mono">{doc.content}</pre>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingDocId(doc.id); setEditingContent(doc.content) }} className="text-gray-400 hover:text-blue-500">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteDocument(doc.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
