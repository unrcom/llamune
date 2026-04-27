import { useState, useEffect } from 'react'
import { getSources, deleteSource, addWikipedia, refreshSource, getChunks, updateChunk, deleteChunk, addText } from './api'
import type { DatasetSource, Chunk } from './api'

export default function DatasetPage() {
  const [sources, setSources] = useState<DatasetSource[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [chunksLoading, setChunksLoading] = useState(false)
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [saving, setSaving] = useState(false)
  const [textSource, setTextSource] = useState('')
  const [textBody, setTextBody] = useState('')
  const [textSeparator, setTextSeparator] = useState('@@@')
  const [addingText, setAddingText] = useState(false)

  const loadSources = async () => {
    setLoading(true)
    try {
      const data = await getSources()
      setSources(data)
    } catch {
      setMessage({ text: 'ソース一覧の取得に失敗しました', ok: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSources() }, [])

  const loadChunks = async (source: string) => {
    setChunksLoading(true)
    try {
      const data = await getChunks(source)
      setChunks(data)
    } catch {
      setMessage({ text: `「${source}」のチャンク取得に失敗しました`, ok: false })
    } finally {
      setChunksLoading(false)
    }
  }

  const handleExpand = async (source: string) => {
    if (expandedSource === source) {
      setExpandedSource(null)
      setChunks([])
      setEditingChunkId(null)
      return
    }
    setExpandedSource(source)
    await loadChunks(source)
  }

  const handleDelete = async (source: string) => {
    if (!confirm(`「${source}」を削除しますか？`)) return
    try {
      await deleteSource(source)
      setMessage({ text: `「${source}」を削除しました`, ok: true })
      if (expandedSource === source) { setExpandedSource(null); setChunks([]) }
      await loadSources()
    } catch {
      setMessage({ text: `「${source}」の削除に失敗しました`, ok: false })
    }
  }

  const handleRefresh = async (source: string) => {
    if (!confirm(`「${source}」を再取得しますか？`)) return
    try {
      const res = await refreshSource(source)
      setMessage({ text: res.message, ok: true })
      if (expandedSource === source) await loadChunks(source)
      await loadSources()
    } catch {
      setMessage({ text: `「${source}」の再取得に失敗しました`, ok: false })
    }
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const res = await addWikipedia(newTitle.trim())
      setMessage({ text: res.message, ok: true })
      setNewTitle('')
      await loadSources()
    } catch (e: any) {
      setMessage({ text: e.response?.data?.detail || '追加に失敗しました', ok: false })
    } finally {
      setAdding(false)
    }
  }

  const handleAddText = async () => {
    if (!textSource.trim() || !textBody.trim()) return
    setAddingText(true)
    try {
      const res = await addText(textSource.trim(), textBody.trim(), textSeparator)
      setMessage({ text: res.message, ok: true })
      setTextSource('')
      setTextBody('')
      setTextSeparator('@@@')
      await loadSources()
    } catch (e: any) {
      setMessage({ text: e.response?.data?.detail || '追加に失敗しました', ok: false })
    } finally {
      setAddingText(false)
    }
  }

  const handleEditStart = (chunk: Chunk) => {
    setEditingChunkId(chunk.id)
    setEditingText(chunk.text)
  }

  const handleEditSave = async () => {
    if (!editingChunkId) return
    setSaving(true)
    try {
      await updateChunk(editingChunkId, editingText)
      setMessage({ text: 'チャンクを更新しました', ok: true })
      setEditingChunkId(null)
      if (expandedSource) await loadChunks(expandedSource)
    } catch {
      setMessage({ text: 'チャンクの更新に失敗しました', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const handleChunkDelete = async (chunkId: string) => {
    if (!confirm('このチャンクを削除しますか？')) return
    try {
      await deleteChunk(chunkId)
      setMessage({ text: 'チャンクを削除しました', ok: true })
      if (expandedSource) {
        await loadChunks(expandedSource)
        await loadSources()
      }
    } catch {
      setMessage({ text: 'チャンクの削除に失敗しました', ok: false })
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', color: '#111111' }}>
      <h1 style={{ color: '#111111', marginBottom: '1.5rem' }}>🗂️ データセット管理</h1>

      {message && (
        <div style={{ background: message.ok ? '#f0fdf4' : '#fee2e2', color: message.ok ? '#15803d' : '#991b1b', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      {/* Wikipedia追加 */}
      <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '1.25rem', marginBottom: '1rem', backgroundColor: '#f9fafb' }}>
        <h2 style={{ color: '#111111', marginTop: 0, fontSize: '1rem' }}>📖 Wikipediaページを追加</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Wikipediaのページ名（例：ロキソプロフェン）"
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.95rem', borderRadius: 6, border: '1px solid #ccc', color: '#111111', backgroundColor: '#ffffff' }}
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', borderRadius: 6, background: '#2563eb', color: '#ffffff', border: 'none', cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.7 : 1 }}
          >
            {adding ? '追加中...' : '追加'}
          </button>
        </div>
      </div>

      {/* テキスト追加 */}
      <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb' }}>
        <h2 style={{ color: '#111111', marginTop: 0, fontSize: '1rem' }}>📝 テキストを追加</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={textSource}
            onChange={e => setTextSource(e.target.value)}
            placeholder="ソース名（例：ロキソプロフェン補足資料）"
            style={{ flex: 2, padding: '0.6rem', fontSize: '0.95rem', borderRadius: 6, border: '1px solid #ccc', color: '#111111', backgroundColor: '#ffffff' }}
          />
          <input
            type="text"
            value={textSeparator}
            onChange={e => setTextSeparator(e.target.value)}
            placeholder="区切り文字"
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.95rem', borderRadius: 6, border: '1px solid #ccc', color: '#111111', backgroundColor: '#ffffff', fontFamily: 'monospace' }}
          />
        </div>
        <textarea
          value={textBody}
          onChange={e => setTextBody(e.target.value)}
          placeholder={`テキストを貼り付けてください。\n区切り文字（デフォルト: @@@）でチャンクを手動指定できます。\n指定がない場合は自動でチャンキングされます。`}
          rows={8}
          style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', borderRadius: 6, border: '1px solid #ccc', color: '#111111', backgroundColor: '#ffffff', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }}
        />
        <button
          onClick={handleAddText}
          disabled={addingText || !textSource.trim() || !textBody.trim()}
          style={{ marginTop: '0.5rem', width: '100%', padding: '0.6rem', fontSize: '0.95rem', borderRadius: 6, background: '#2563eb', color: '#ffffff', border: 'none', cursor: addingText ? 'not-allowed' : 'pointer', opacity: addingText || !textSource.trim() || !textBody.trim() ? 0.7 : 1 }}
        >
          {addingText ? '追加中...' : '追加'}
        </button>
      </div>

      {/* ソース一覧 */}
      <h2 style={{ color: '#111111', fontSize: '1rem' }}>
        登録済みソース一覧
        {!loading && <span style={{ fontWeight: 'normal', color: '#6b7280', marginLeft: '0.5rem' }}>（{sources.length}件 / 合計{sources.reduce((s, x) => s + x.chunk_count, 0)}チャンク）</span>}
      </h2>

      {loading ? (
        <div style={{ color: '#6b7280', padding: '1rem' }}>読み込み中...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem', color: '#374151' }}>ソース名</th>
              <th style={{ textAlign: 'center', padding: '0.5rem', color: '#374151' }}>チャンク数</th>
              <th style={{ textAlign: 'center', padding: '0.5rem', color: '#374151' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(s => (
              <>
                <tr key={s.source} style={{ borderBottom: expandedSource === s.source ? 'none' : '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.6rem 0.5rem', color: '#111111' }}>
                    <button
                      onClick={() => handleExpand(s.source)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '0.9rem', padding: 0 }}
                    >
                      {expandedSource === s.source ? '▼' : '▶'} {s.source}
                    </button>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#374151' }}>{s.chunk_count}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button onClick={() => handleRefresh(s.source)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', cursor: 'pointer' }}>再取得</button>
                      <button onClick={() => handleDelete(s.source)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: 4, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', cursor: 'pointer' }}>削除</button>
                    </div>
                  </td>
                </tr>
                {expandedSource === s.source && (
                  <tr key={`${s.source}-chunks`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td colSpan={3} style={{ padding: '0 0.5rem 0.75rem 1.5rem' }}>
                      {chunksLoading ? (
                        <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: '0.5rem' }}>読み込み中...</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 500, overflowY: 'auto' }}>
                          {chunks.map(c => (
                            <div key={c.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, padding: '0.6rem 0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.heading} #{c.index}</span>
                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                  {editingChunkId === c.id ? (
                                    <>
                                      <button onClick={handleEditSave} disabled={saving} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: 4, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                        {saving ? '保存中...' : '保存'}
                                      </button>
                                      <button onClick={() => setEditingChunkId(null)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: 4, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer' }}>キャンセル</button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => handleEditStart(c)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: 4, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}>編集</button>
                                      <button onClick={() => handleChunkDelete(c.id)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: 4, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', cursor: 'pointer' }}>削除</button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {editingChunkId === c.id ? (
                                <textarea
                                  value={editingText}
                                  onChange={e => setEditingText(e.target.value)}
                                  rows={6}
                                  style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem', borderRadius: 4, border: '1px solid #93c5fd', color: '#111111', backgroundColor: '#ffffff', boxSizing: 'border-box', lineHeight: 1.6 }}
                                />
                              ) : (
                                <div style={{ fontSize: '0.82rem', color: '#111111', lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                                  {c.text.length > 200 ? c.text.slice(0, 200) + '...' : c.text}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
