import { useState, useEffect } from 'react'
import { getPrompts, addPrompt, updatePrompt, deletePrompt, reorderPrompts } from './api'
import type { Prompt } from './api'

export default function PromptPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const data = await getPrompts()
      setPrompts(data)
    } catch {
      setMessage({ text: 'プロンプト一覧の取得に失敗しました', ok: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPrompts() }, [])

  const handleEditStart = (p: Prompt) => {
    setEditingFile(p.file)
    setEditingName(p.name)
    setEditingContent(p.content)
  }

  const handleEditSave = async () => {
    if (!editingFile) return
    setSaving(true)
    try {
      await updatePrompt(editingFile, editingName, editingContent)
      setMessage({ text: '更新しました', ok: true })
      setEditingFile(null)
      await loadPrompts()
    } catch {
      setMessage({ text: '更新に失敗しました', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: Prompt) => {
    if (!confirm(`「${p.name}」を削除しますか？`)) return
    try {
      await deletePrompt(p.file)
      setMessage({ text: '削除しました', ok: true })
      if (editingFile === p.file) setEditingFile(null)
      await loadPrompts()
    } catch (e: any) {
      setMessage({ text: e.response?.data?.detail || '削除に失敗しました', ok: false })
    }
  }

  const handleAdd = async () => {
    if (!newName.trim() || !newContent.trim()) return
    setAdding(true)
    try {
      await addPrompt(newName.trim(), newContent.trim())
      setMessage({ text: '追加しました', ok: true })
      setNewName('')
      setNewContent('')
      setShowNew(false)
      await loadPrompts()
    } catch (e: any) {
      setMessage({ text: e.response?.data?.detail || '追加に失敗しました', ok: false })
    } finally {
      setAdding(false)
    }
  }

  const handleMoveUp = async (p: Prompt) => {
    const idx = prompts.findIndex(x => x.file === p.file)
    if (idx === 0) return
    const newPrompts = [...prompts]
    const prevOrder = newPrompts[idx - 1].order
    const currOrder = newPrompts[idx].order
    newPrompts[idx - 1] = { ...newPrompts[idx - 1], order: currOrder }
    newPrompts[idx] = { ...newPrompts[idx], order: prevOrder }
    newPrompts.sort((a, b) => a.order - b.order)
    setPrompts(newPrompts)
    await reorderPrompts(newPrompts.map(x => ({ file: x.file, order: x.order })))
    await loadPrompts()
  }

  const handleMoveDown = async (p: Prompt) => {
    const idx = prompts.findIndex(x => x.file === p.file)
    if (idx === prompts.length - 1) return
    const newPrompts = [...prompts]
    const nextOrder = newPrompts[idx + 1].order
    const currOrder = newPrompts[idx].order
    newPrompts[idx + 1] = { ...newPrompts[idx + 1], order: currOrder }
    newPrompts[idx] = { ...newPrompts[idx], order: nextOrder }
    newPrompts.sort((a, b) => a.order - b.order)
    setPrompts(newPrompts)
    await reorderPrompts(newPrompts.map(x => ({ file: x.file, order: x.order })))
    await loadPrompts()
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', color: '#111111' }}>
      <h1 style={{ color: '#111111', marginBottom: '1.5rem' }}>📝 プロンプト管理</h1>

      {message && (
        <div style={{ background: message.ok ? '#f0fdf4' : '#fee2e2', color: message.ok ? '#15803d' : '#991b1b', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowNew(!showNew)}
          style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', borderRadius: 6, background: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer' }}
        >
          {showNew ? 'キャンセル' : '＋ 新規追加'}
        </button>
      </div>

      {showNew && (
        <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb' }}>
          <h2 style={{ color: '#111111', marginTop: 0, fontSize: '1rem' }}>新規プロンプト</h2>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="プロンプト名（例：詳細版）"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.95rem', borderRadius: 6, border: '1px solid #ccc', color: '#111111', backgroundColor: '#ffffff', boxSizing: 'border-box', marginBottom: '0.5rem' }}
          />
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="{context} と {symptom} を含めてください"
            rows={8}
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', borderRadius: 6, border: '1px solid #ccc', color: '#111111', backgroundColor: '#ffffff', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, marginBottom: '0.5rem' }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim() || !newContent.trim()}
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.95rem', borderRadius: 6, background: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer', opacity: adding ? 0.7 : 1 }}
          >
            {adding ? '追加中...' : '追加'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#6b7280', padding: '1rem' }}>読み込み中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {prompts.map((p, idx) => (
            <div key={p.file} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '1rem', backgroundColor: p.order === 1 ? '#eff6ff' : '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ffffff', background: p.order === 1 ? '#2563eb' : '#6b7280', borderRadius: 4, padding: '0.15rem 0.5rem' }}>
                    {p.order === 1 ? 'デフォルト' : `優先度 ${p.order}`}
                  </span>
                  {editingFile === p.file ? (
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.95rem', borderRadius: 4, border: '1px solid #93c5fd', color: '#111111' }}
                    />
                  ) : (
                    <strong style={{ color: '#111111' }}>{p.name}</strong>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  <button onClick={() => handleMoveUp(p)} disabled={idx === 0} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: 4, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                  <button onClick={() => handleMoveDown(p)} disabled={idx === prompts.length - 1} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: 4, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', cursor: idx === prompts.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === prompts.length - 1 ? 0.4 : 1 }}>↓</button>
                  {editingFile === p.file ? (
                    <>
                      <button onClick={handleEditSave} disabled={saving} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: 4, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>{saving ? '保存中...' : '保存'}</button>
                      <button onClick={() => setEditingFile(null)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: 4, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer' }}>キャンセル</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditStart(p)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: 4, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}>編集</button>
                      <button onClick={() => handleDelete(p)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: 4, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', cursor: 'pointer' }}>削除</button>
                    </>
                  )}
                </div>
              </div>
              {editingFile === p.file ? (
                <textarea
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  rows={10}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: 4, border: '1px solid #93c5fd', color: '#111111', backgroundColor: '#ffffff', boxSizing: 'border-box', lineHeight: 1.6, resize: 'vertical' }}
                />
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'left', background: '#f9fafb', padding: '0.6rem', borderRadius: 4 }}>
                  {p.content.length > 150 ? p.content.slice(0, 150) + '...' : p.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
