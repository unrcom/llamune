import React, { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Trash2, Plus, Pencil, Check, X, Download, Upload } from 'lucide-react'

interface Project { id: number; display_name: string }
interface Dataset { id: number; project_id: number; name: string; display_name: string; description: string | null; created_at: string }
interface Document { id: string; title: string; content: string; source_id: string; source_data: string; created_at: string }
interface Source { source_id: string; source_data: string; created_at: string }

// コンポーネント外に移動
function today() {
  return new Date().toISOString().slice(0, 19).replace('Z', '')
}

function splitLongParagraph(para: string, maxLen: number, result: string[]): string {
  const sentences = para.split(/(?<=[。！？\n])/)
  let sub = ''
  for (const s of sentences) {
    if ((sub + s).length <= maxLen) {
      sub += s
    } else {
      if (sub) result.push(sub.trim())
      sub = s.length > maxLen ? s.slice(0, maxLen) : s
    }
  }
  return sub.trim()
}

function splitIntoChunks(text: string, maxLen = 500): string[] {
  const result: string[] = []
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  let current = ''
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).trim().length <= maxLen) {
      current = current ? current + '\n\n' + para : para
    } else {
      if (current) result.push(current.trim())
      current = para.length > maxLen ? splitLongParagraph(para, maxLen, result) : para
    }
  }
  if (current.trim()) result.push(current.trim())
  return result.filter(Boolean)
}

interface SourceSelectorProps {
  value: string
  onChange: (v: string) => void
  sources: Source[]
}

function SourceSelector({ value, onChange, sources }: Readonly<SourceSelectorProps>) {
  return (
    <select
      className="w-full border rounded px-3 py-1.5 text-sm bg-white"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="new">新規資料</option>
      {sources.map(s => (
        <option key={s.source_id} value={s.source_id}>
          {s.source_data || s.source_id}
        </option>
      ))}
    </select>
  )
}

function getContentClass(len: number) {
  if (len >= 700) return 'text-red-500 font-medium'
  if (len >= 500) return 'text-yellow-600'
  return 'text-gray-400'
}

function normalizeCreatedAt(v: string): string | undefined {
  if (!v) return undefined
  return v.length === 16 ? v + ':00' : v
}

function getTextareaClass(len: number) {
  if (len >= 700) return 'text-sm border-red-400'
  if (len >= 500) return 'text-sm border-yellow-400'
  return 'text-sm'
}


interface ChunkListProps {
  chunks: string[]
  setChunks: React.Dispatch<React.SetStateAction<string[]>>
}

function ChunkList({ chunks, setChunks }: Readonly<ChunkListProps>) {
  function removeChunk(i: number) {
    setChunks(prev => prev.filter((_, j) => j !== i))
  }
  function updateChunk(i: number, value: string) {
    setChunks(prev => prev.map((c, j) => j === i ? value : c))
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400">{chunks.length}件に分割されました。</div>
      {chunks.map((chunk, i) => (
        <div key={`chunk-${chunk.slice(0, 20)}-${i}`} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">#{i + 1}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${getContentClass(chunk.length)}`}>
                {chunk.length} 文字{chunk.length >= 700 ? '　要修正' : ''}
              </span>
              <button onClick={() => removeChunk(i)} className="text-gray-300 hover:text-red-400"><X className="h-3 w-3" /></button>
            </div>
          </div>
          <Textarea rows={6} value={chunk} onChange={e => updateChunk(i, e.target.value)} className={getTextareaClass(chunk.length)} />
        </div>
      ))}
    </div>
  )
}

function useDataset() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatingDataset, setCreatingDataset] = useState(false)

  useEffect(() => {
    apiClient.get('/projects').then(res => setProjects(res.data))
  }, [])

  async function refreshDocs(ds: Dataset) {
    const [docsRes, sourcesRes] = await Promise.all([
      apiClient.get(`/datasets/${ds.id}/documents`),
      apiClient.get(`/datasets/${ds.id}/sources`),
    ])
    setDocuments(docsRes.data)
    setSources(sourcesRes.data)
  }

  async function loadDataset(projectId: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/datasets?project_id=${projectId}`)
      const list: Dataset[] = res.data
      if (list.length > 0) {
        setDataset(list[0])
        await refreshDocs(list[0])
      } else {
        setDataset(null)
        setDocuments([])
        setSources([])
      }
    } catch {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedProjectId) {
      setDataset(null); setDocuments([]); setSources([]); return
    }
    loadDataset(selectedProjectId)
  }, [selectedProjectId])

  async function createDataset() {
    if (!selectedProjectId) return
    const project = projects.find(p => p.id === selectedProjectId)
    if (!project) return
    setCreatingDataset(true)
    setError(null)
    try {
      const res = await apiClient.post('/datasets', { project_id: selectedProjectId, display_name: project.display_name })
      setDataset(res.data)
      setDocuments([])
      setSources([])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'データセットの作成に失敗しました')
    } finally {
      setCreatingDataset(false)
    }
  }

  async function deleteDataset(ds: Dataset) {
    if (!confirm(`データセット「${ds.display_name}」を削除しますか？\nドキュメントもすべて削除されます。`)) return
    setError(null)
    try {
      await apiClient.delete(`/datasets/${ds.id}`)
      setDataset(null); setDocuments([]); setSources([])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'データセットの削除に失敗しました')
    }
  }

  return { projects, selectedProjectId, setSelectedProjectId, dataset, documents, sources,
           error, setError, loading, creatingDataset, refreshDocs, createDataset, deleteDataset }
}

function useDocEditor(dataset: Dataset | null, sources: Source[], refreshDocs: (ds: Dataset) => Promise<void>, setError: (e: string | null) => void) {
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [savingDoc, setSavingDoc] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocSourceId, setNewDocSourceId] = useState('new')
  const [newDocSourceData, setNewDocSourceData] = useState('')
  const [newDocCreatedAt, setNewDocCreatedAt] = useState(() => today())
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [editingSourceData, setEditingSourceData] = useState('')
  const [editingCreatedAt, setEditingCreatedAt] = useState('')

  async function addDocument() {
    if (!newDocContent.trim() || !dataset) return
    setError(null)
    setSavingDoc(true)
    try {
      const source_id = newDocSourceId === 'new' ? undefined : newDocSourceId
      await apiClient.post(`/datasets/${dataset.id}/documents`, {
        title: newDocTitle.trim() || undefined, content: newDocContent, source_id,
        source_data: newDocSourceData.trim() || undefined, created_at: normalizeCreatedAt(newDocCreatedAt),
      })
      setNewDocTitle(''); setNewDocContent(''); setNewDocSourceId('new')
      setNewDocSourceData(''); setNewDocCreatedAt(today()); setShowAddDoc(false)
      await refreshDocs(dataset)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    } finally {
      setSavingDoc(false)
    }
  }

  async function updateDocument(docId: string) {
    if (!dataset) return
    setError(null)
    try {
      await apiClient.put(`/datasets/${dataset.id}/documents/${docId}`, {
        title: editingTitle, content: editingContent, source_data: editingSourceData,
        created_at: normalizeCreatedAt(editingCreatedAt),
      })
      setEditingDocId(null)
      await refreshDocs(dataset)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function deleteDocument(docId: string) {
    if (!dataset || !confirm('削除しますか？')) return
    await apiClient.delete(`/datasets/${dataset.id}/documents/${docId}`)
    await refreshDocs(dataset)
  }

  function handleSourceChange(sourceId: string, setSourceId: (v: string) => void, setSourceData: (v: string) => void) {
    setSourceId(sourceId)
    if (sourceId !== 'new') {
      const s = sources.find(src => src.source_id === sourceId)
      if (s) setSourceData(s.source_data)
    }
  }

  return { showAddDoc, setShowAddDoc, savingDoc, newDocTitle, setNewDocTitle, newDocContent, setNewDocContent,
           newDocSourceId, setNewDocSourceId, newDocSourceData, setNewDocSourceData, newDocCreatedAt, setNewDocCreatedAt,
           editingDocId, setEditingDocId, editingTitle, setEditingTitle, editingContent, setEditingContent,
           editingSourceData, setEditingSourceData, editingCreatedAt, setEditingCreatedAt,
           addDocument, updateDocument, deleteDocument, handleSourceChange }
}

function useImportExport(dataset: Dataset | null, refreshDocs: (ds: Dataset) => Promise<void>, setError: (e: string | null) => void) {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkTitlePrefix, setBulkTitlePrefix] = useState('')
  const [bulkSourceId, setBulkSourceId] = useState('new')
  const [bulkSourceData, setBulkSourceData] = useState('')
  const [bulkCreatedAt, setBulkCreatedAt] = useState(() => today())
  const [chunks, setChunks] = useState<string[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)

  async function exportDataset() {
    if (!dataset) return
    try {
      const res = await apiClient.get(`/datasets/${dataset.id}/export`, { responseType: 'blob' })
      const cd = res.headers['content-disposition'] || ''
      const match = cd.match(/filename="(.+)"/)
      const filename = match ? match[1] : `${dataset.name}.md`
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/markdown' }))
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('エクスポートに失敗しました')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!dataset || !e.target.files?.[0]) return
    const file = e.target.files[0]; e.target.value = ''
    setImporting(true); setImportResult(null); setError(null)
    try {
      const form = new FormData(); form.append('file', file)
      const res = await apiClient.post(`/datasets/${dataset.id}/import`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(`インポート完了：${res.data.imported}件追加・更新、${res.data.skipped}件スキップ`)
      await refreshDocs(dataset)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  async function bulkRegister() {
    if (!dataset || chunks.length === 0) return
    setBulkSaving(true); setError(null)
    const source_id = bulkSourceId === 'new' ? undefined : bulkSourceId
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]; if (!chunk.trim()) continue
        const title = bulkTitlePrefix.trim() ? `${bulkTitlePrefix.trim()} #${i + 1}` : chunk.slice(0, 20).replace(/\n/g, ' ')
        await apiClient.post(`/datasets/${dataset.id}/documents`, { title, content: chunk, source_id, source_data: bulkSourceData.trim() || undefined, created_at: bulkCreatedAt || undefined })
      }
      await refreshDocs(dataset)
      setShowBulkImport(false); setBulkText(''); setBulkTitlePrefix(''); setBulkSourceId('new')
      setBulkSourceData(''); setBulkCreatedAt(today()); setChunks([])
    } catch (e: any) {
      setError(e.response?.data?.detail || '一括登録に失敗しました')
    } finally {
      setBulkSaving(false)
    }
  }

  return { importing, importResult, setImportResult, importInputRef, showBulkImport, setShowBulkImport,
           bulkText, setBulkText, bulkTitlePrefix, setBulkTitlePrefix, bulkSourceId, setBulkSourceId,
           bulkSourceData, setBulkSourceData, bulkCreatedAt, setBulkCreatedAt, chunks, setChunks,
           bulkSaving, exportDataset, handleImportFile, bulkRegister }
}

export default function DatasetPage() {
  const { projects, selectedProjectId, setSelectedProjectId, dataset, documents, sources,
          error, setError, loading, creatingDataset, refreshDocs, createDataset, deleteDataset } = useDataset()
  const docEditor = useDocEditor(dataset, sources, refreshDocs, setError)
  const importExport = useImportExport(dataset, refreshDocs, setError)

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* プロジェクト選択 */}
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">プロジェクト</Label>
        <select
          className="w-full border rounded px-3 py-2 text-sm bg-white"
          value={selectedProjectId ?? ''}
          onChange={e => setSelectedProjectId(Number(e.target.value) || null)}
        >
          <option value="">-- 選択してください --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      </div>

      {selectedProjectId && (
        <>
          {loading && (
            <div className="text-sm text-gray-400">読み込み中...</div>
          )}
          {!loading && !dataset && (
            <div className="border rounded p-4 bg-gray-50 space-y-3">
              <p className="text-sm text-gray-500">このプロジェクトにはデータセットがありません。</p>
              <Button size="sm" onClick={createDataset} disabled={creatingDataset}>
                <Plus className="h-3 w-3 mr-1" />{creatingDataset ? '作成中...' : 'データセットを作成'}
              </Button>
              {error && <div className="text-red-500 text-sm">{error}</div>}
            </div>
          )}
          {!loading && dataset && (
            <div className="space-y-4">

              {/* ヘッダー */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{dataset.display_name}</span>
                  <span className="ml-2 text-xs text-gray-400">{documents.length} 件</span>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button size="sm" variant="outline" onClick={importExport.exportDataset} title="エクスポート">
                    <Download className="h-3 w-3 mr-1" />エクスポート
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => importExport.importInputRef.current?.click()} disabled={importExport.importing} title="インポート">
                    {importExport.importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                    インポート
                  </Button>
                  <input ref={importExport.importInputRef} type="file" accept=".md" className="hidden" onChange={importExport.handleImportFile} />
                  <Button size="sm" variant="outline" onClick={() => { importExport.setShowBulkImport(v => !v); docEditor.setShowAddDoc(false); importExport.setChunks([]); importExport.setBulkText('') }}>
                    一括登録
                  </Button>
                  <Button size="sm" onClick={() => { docEditor.setShowAddDoc(v => !v); importExport.setShowBulkImport(false); setError(null) }}>
                    <Plus className="h-3 w-3 mr-1" /> 追加
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => dataset && deleteDataset(dataset)} className="text-red-500 hover:text-red-700 hover:border-red-300">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}
              {importExport.importResult && (
                <div className="text-green-600 text-sm flex items-center justify-between">
                  {importExport.importResult}
                  <button onClick={() => importExport.setImportResult(null)}><X className="h-3 w-3" /></button>
                </div>
              )}

              {/* 一括登録フォーム */}
              {importExport.showBulkImport && (
                <div className="border rounded p-3 bg-gray-50 space-y-3">
                  <div className="text-xs text-gray-500 font-medium">一括登録（長文を自動分割）</div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">資料</Label>
                      <SourceSelector
                        value={importExport.bulkSourceId}
                        sources={sources}
                        onChange={v => docEditor.handleSourceChange(v, importExport.setBulkSourceId, importExport.setBulkSourceData)}
                      />
                    </div>
                    {importExport.bulkSourceId === 'new' && (
                      <>
                        <div>
                          <Label className="text-xs text-gray-500">資料情報（出典・著者など）</Label>
                          <input type="text" placeholder="例：ホログラフィー原理とはなにか / 橋本幸士 / ブルーバックス" value={importExport.bulkSourceData} onChange={e => importExport.setBulkSourceData(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">登録日時</Label>
                          <input type="text" placeholder="2026-05-21T10:00:00" value={importExport.bulkCreatedAt} onChange={e => importExport.setBulkCreatedAt(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                        </div>
                      </>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">タイトルプレフィックス</Label>
                      <input type="text" placeholder="例：ホログラフィー原理 → 「ホログラフィー原理 #1」..." value={importExport.bulkTitlePrefix} onChange={e => importExport.setBulkTitlePrefix(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                    </div>
                  </div>
                  <Textarea rows={6} placeholder="長文テキストを貼り付けてください" value={importExport.bulkText} onChange={e => { importExport.setBulkText(e.target.value); importExport.setChunks([]) }} className="text-sm" />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => importExport.setChunks(splitIntoChunks(importExport.bulkText))} disabled={!importExport.bulkText.trim()}>分割プレビュー</Button>
                    {importExport.chunks.length > 0 && (
                      <Button size="sm" onClick={importExport.bulkRegister} disabled={importExport.bulkSaving || importExport.chunks.some(c => c.length >= 700)}>
                        {importExport.bulkSaving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />登録中...</> : `まとめて登録（${importExport.chunks.length}件）`}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { importExport.setShowBulkImport(false); importExport.setBulkText(''); importExport.setBulkTitlePrefix(''); importExport.setChunks([]) }}>キャンセル</Button>
                  </div>
                  {importExport.chunks.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400">{importExport.chunks.length}件に分割されました。</div>
                      <ChunkList chunks={importExport.chunks} setChunks={importExport.setChunks} />
                    </div>
                  )}
                </div>
              )}

              {/* 単体追加フォーム */}
              {docEditor.showAddDoc && (
                <div className="border rounded p-3 bg-gray-50 space-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">資料</Label>
                    <SourceSelector
                      value={docEditor.newDocSourceId}
                      sources={sources}
                      onChange={v => docEditor.handleSourceChange(v, docEditor.setNewDocSourceId, docEditor.setNewDocSourceData)}
                    />
                  </div>
                  {docEditor.newDocSourceId === 'new' && (
                    <>
                      <div>
                        <Label className="text-xs text-gray-500">資料情報（出典・著者など）</Label>
                        <input type="text" placeholder="例：ホログラフィー原理とはなにか / 橋本幸士 / ブルーバックス" value={docEditor.newDocSourceData} onChange={e => docEditor.setNewDocSourceData(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">登録日時</Label>
                        <input type="text" placeholder="2026-05-21T10:00:00" value={docEditor.newDocCreatedAt} onChange={e => docEditor.setNewDocCreatedAt(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-xs text-gray-500">タイトル（任意）</Label>
                    <input type="text" placeholder="タイトル" value={docEditor.newDocTitle} onChange={e => docEditor.setNewDocTitle(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                  </div>
                  <Textarea rows={4} placeholder="本文（検索対象）" value={docEditor.newDocContent} onChange={e => docEditor.setNewDocContent(e.target.value)} className={getTextareaClass(docEditor.newDocContent.length)} />
                  <div className={`text-xs text-right ${getContentClass(docEditor.newDocContent.length)}`}>
                    {docEditor.newDocContent.length} 文字{docEditor.newDocContent.length >= 700 && '　700文字以上は登録できません'}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={docEditor.addDocument} disabled={docEditor.savingDoc || docEditor.newDocContent.length >= 700}>
                      {docEditor.savingDoc ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />登録中...</> : '登録'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { docEditor.setShowAddDoc(false); docEditor.setNewDocTitle(''); docEditor.setNewDocContent('') }}>キャンセル</Button>
                  </div>
                </div>
              )}

              {/* ドキュメント一覧 */}
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-8">ドキュメントがありません</div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="border rounded p-3 bg-white">
                      {docEditor.editingDocId === doc.id ? (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-gray-500">タイトル</Label>
                            <input type="text" value={docEditor.editingTitle} onChange={e => docEditor.setEditingTitle(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">資料情報</Label>
                            <input type="text" value={docEditor.editingSourceData} onChange={e => docEditor.setEditingSourceData(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">登録日時</Label>
                            <input type="text" placeholder="2026-05-21T10:00:00" value={docEditor.editingCreatedAt} onChange={e => docEditor.setEditingCreatedAt(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm bg-white" />
                          </div>
                          <Textarea rows={4} value={docEditor.editingContent} onChange={e => docEditor.setEditingContent(e.target.value)} className={`font-mono ${getTextareaClass(docEditor.editingContent.length)}`} />
                          <div className={`text-xs text-right ${getContentClass(docEditor.editingContent.length)}`}>{docEditor.editingContent.length} 文字{docEditor.editingContent.length >= 700 && '　700文字以上は保存できません'}</div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => docEditor.updateDocument(doc.id)} disabled={docEditor.editingContent.length >= 700}><Check className="h-3 w-3 mr-1" />保存</Button>
                            <Button size="sm" variant="outline" onClick={() => docEditor.setEditingDocId(null)}><X className="h-3 w-3 mr-1" />キャンセル</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {doc.title && <span className="text-xs font-medium text-gray-500">{doc.title}</span>}
                              {doc.source_data && <span className="text-xs text-blue-500">{doc.source_data}</span>}
                              {doc.created_at && <span className="text-xs text-gray-400">{doc.created_at.slice(0, 19).replace('T', ' ')}</span>}
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap break-all">{doc.content}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { docEditor.setEditingDocId(doc.id); docEditor.setEditingTitle(doc.title); docEditor.setEditingContent(doc.content); docEditor.setEditingSourceData(doc.source_data); docEditor.setEditingCreatedAt(doc.created_at.replace('Z', '').slice(0, 19)) }} className="text-gray-400 hover:text-blue-500">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => docEditor.deleteDocument(doc.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </>
      )}

    </div>
  )
}
