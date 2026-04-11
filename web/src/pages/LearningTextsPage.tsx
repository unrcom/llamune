import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { LearningText, LearningTextChunk, Poc } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function LearningTextsPage() {
  const [pocs, setPocs] = useState<Poc[]>([])
  const [pocId, setPocId] = useState('')
  const [texts, setTexts] = useState<LearningText[]>([])
  const [chunks, setChunks] = useState<Record<number, LearningTextChunk[]>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newRawText, setNewRawText] = useState('')

  const [newChunkContent, setNewChunkContent] = useState<Record<number, string>>({})

  async function loadPocs() {
    const res = await apiClient.get('/poc')
    setPocs(res.data)
    if (res.data.length > 0) setPocId(String(res.data[0].id))
  }

  async function loadTexts(pid: string) {
    if (!pid) return
    setLoading(true)
    const res = await apiClient.get(`/poc/${pid}/learning_texts`)
    setTexts(res.data)
    setLoading(false)
  }

  async function loadChunks(ltId: number) {
    const res = await apiClient.get(`/poc/${pocId}/learning_texts/${ltId}/chunks`)
    setChunks(prev => ({ ...prev, [ltId]: res.data }))
  }

  useEffect(() => { loadPocs() }, [])
  useEffect(() => { if (pocId) loadTexts(pocId) }, [pocId])

  async function createText() {
    if (!newTitle.trim() || !pocId) return
    await apiClient.post(`/poc/${pocId}/learning_texts`, {
      title: newTitle.trim(),
      source_url: newSourceUrl || null,
      raw_text: newRawText || null,
    })
    setNewTitle('')
    setNewSourceUrl('')
    setNewRawText('')
    loadTexts(pocId)
  }

  async function deleteText(id: number) {
    if (!confirm('削除しますか？')) return
    await apiClient.delete(`/poc/${pocId}/learning_texts/${id}`)
    loadTexts(pocId)
  }

  async function createChunk(ltId: number) {
    const content = newChunkContent[ltId]?.trim()
    if (!content) return
    await apiClient.post(`/poc/${pocId}/learning_texts/${ltId}/chunks`, {
      content,
      token_count: null,
    })
    setNewChunkContent(prev => ({ ...prev, [ltId]: '' }))
    loadChunks(ltId)
  }

  async function deleteChunk(ltId: number, chunkId: number) {
    if (!confirm('このチャンクを削除しますか？')) return
    await apiClient.delete(`/poc/${pocId}/learning_texts/${ltId}/chunks/${chunkId}`)
    loadChunks(ltId)
  }

  async function toggleExpand(lt: LearningText) {
    if (expandedId === lt.id) {
      setExpandedId(null)
    } else {
      setExpandedId(lt.id)
      await loadChunks(lt.id)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h2 className="text-2xl font-bold">テキスト管理</h2>

      {/* PoC選択 */}
      <div className="space-y-1 max-w-xs">
        <Label>PoC</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={pocId}
          onChange={e => setPocId(e.target.value)}
        >
          <option value="">-- 選択 --</option>
          {pocs.map(p => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>

      {pocId && (
        <>
          {/* 新規テキスト追加 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">テキストを追加</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>タイトル</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Wikipedia: フリーレン" />
              </div>
              <div className="space-y-1">
                <Label>ソースURL（任意）</Label>
                <Input value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} placeholder="https://ja.wikipedia.org/wiki/..." />
              </div>
              <div className="space-y-1">
                <Label>原文テキスト</Label>
                <Textarea
                  value={newRawText}
                  onChange={e => setNewRawText(e.target.value)}
                  placeholder="原文テキストを貼り付けてください"
                  rows={5}
                />
              </div>
              <Button size="sm" onClick={createText} disabled={!newTitle.trim()}>
                <Plus className="h-4 w-4 mr-1" /> 追加
              </Button>
            </CardContent>
          </Card>

          {/* テキスト一覧 */}
          {loading ? (
            <p className="text-muted-foreground text-sm">読み込み中...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{texts.length} 件</p>
              {texts.map(lt => (
                <Card key={lt.id}>
                  <CardContent className="p-4 space-y-3">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpand(lt)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{lt.title}</span>
                          <Badge variant="outline" className="text-xs">#{lt.id}</Badge>
                        </div>
                        {lt.source_url && (
                          <a
                            href={lt.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {lt.source_url}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => { e.stopPropagation(); deleteText(lt.id) }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        {expandedId === lt.id
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {expandedId === lt.id && (
                      <div className="border-t pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            チャンク（{chunks[lt.id]?.length || 0} 件）
                          </p>
                          {lt.raw_text && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const hasChunks = (chunks[lt.id]?.length || 0) > 0
                                const msg = hasChunks
                                  ? '自動チャンク分割を実行しますか？（既存のチャンクは削除されます）'
                                  : '自動チャンク分割を実行しますか？'
                                if (!confirm(msg)) return
                                await apiClient.post(`/poc/${pocId}/learning_texts/${lt.id}/auto-chunk`, {})
                                await loadChunks(lt.id)
                              }}
                            >
                              自動チャンク分割
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {(chunks[lt.id] || []).map(chunk => (
                            <div key={chunk.id} className="flex items-start gap-2 p-2 border rounded-md">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">#{chunk.chunk_index}</Badge>
                                  {chunk.token_count && (
                                    <span className="text-xs text-muted-foreground">{chunk.token_count} tokens</span>
                                  )}
                                </div>
                                <p className="text-xs whitespace-pre-wrap">{chunk.content}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteChunk(lt.id, chunk.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <Textarea
                            value={newChunkContent[lt.id] || ''}
                            onChange={e => setNewChunkContent(prev => ({ ...prev, [lt.id]: e.target.value }))}
                            placeholder="チャンクテキストを入力"
                            rows={3}
                          />
                          <Button
                            size="sm"
                            onClick={() => createChunk(lt.id)}
                            disabled={!newChunkContent[lt.id]?.trim()}
                          >
                            <Plus className="h-4 w-4 mr-1" /> チャンク追加
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {texts.length === 0 && (
                <p className="text-muted-foreground text-sm">テキストがありません</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
