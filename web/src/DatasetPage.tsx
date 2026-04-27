import { useState, useEffect } from 'react'
import { getSources, deleteSource, addWikipedia, refreshSource } from './api'
import type { DatasetSource } from './api'

export default function DatasetPage() {
  const [sources, setSources] = useState<DatasetSource[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

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

  const handleDelete = async (source: string) => {
    if (!confirm(`「${source}」を削除しますか？`)) return
    try {
      await deleteSource(source)
      setMessage({ text: `「${source}」を削除しました`, ok: true })
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', color: '#111111' }}>
      <h1 style={{ color: '#111111', marginBottom: '1.5rem' }}>🗂️ データセット管理</h1>

      {message && (
        <div style={{ background: message.ok ? '#f0fdf4' : '#fee2e2', color: message.ok ? '#15803d' : '#991b1b', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb' }}>
        <h2 style={{ color: '#111111', marginTop: 0, fontSize: '1rem' }}>Wikipediaページを追加</h2>
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
              <tr key={s.source} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.6rem 0.5rem', color: '#111111' }}>{s.source}</td>
                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#374151' }}>{s.chunk_count}</td>
                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleRefresh(s.source)}
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', cursor: 'pointer' }}
                  >
                    再取得
                  </button>
                  <button
                    onClick={() => handleDelete(s.source)}
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: 4, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', cursor: 'pointer' }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
