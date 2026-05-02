import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

interface Project {
  id: number
  name: string
  display_name: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    try {
      const res = await apiClient.get('/projects')
      setProjects(res.data)
    } catch {
      setError('プロジェクトの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!name.trim() || !displayName.trim()) return
    setAdding(true)
    try {
      await apiClient.post('/projects', { name, display_name: displayName })
      setName('')
      setDisplayName('')
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail || '登録に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('削除しますか？')) return
    try {
      await apiClient.delete(`/projects/${id}`)
      await load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold">プロジェクト管理</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 登録フォーム */}
      <Card>
        <CardHeader><CardTitle className="text-base">プロジェクトを追加</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>プロジェクト名（英数字）</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="medical_rag"
              />
            </div>
            <div className="space-y-1">
              <Label>表示名</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="医療相談RAG"
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={adding || !name.trim() || !displayName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            {adding ? '追加中...' : '追加'}
          </Button>
        </CardContent>
      </Card>

      {/* プロジェクト一覧 */}
      <div className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-gray-500 text-sm">プロジェクトがありません</p>
        ) : (
          projects.map(p => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{p.display_name}</p>
                  <p className="text-xs text-gray-500">{p.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
