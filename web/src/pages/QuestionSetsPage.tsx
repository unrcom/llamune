import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { QuestionSet, Poc, SystemPrompt } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, ArrowLeft, ChevronRight, Copy, GitBranch } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:    { label: '編集中', variant: 'secondary' },
  active:   { label: 'ロック済', variant: 'default' },
  archived: { label: 'アーカイブ', variant: 'outline' },
  deleted:  { label: '削除済', variant: 'destructive' },
}

export default function QuestionSetsPage() {
  const { pocId } = useParams<{ pocId: string }>()
  const navigate = useNavigate()
  const [poc, setPoc] = useState<Poc | null>(null)
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newSpId, setNewSpId] = useState('')

  async function load() {
    const [pocRes, qsRes, spRes] = await Promise.all([
      apiClient.get(`/poc/${pocId}`),
      apiClient.get(`/poc/${pocId}/question_sets`),
      apiClient.get(`/poc/${pocId}/system_prompts`),
    ])
    setPoc(pocRes.data)
    setQuestionSets(qsRes.data)
    setSystemPrompts(spRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [pocId])

  async function createQuestionSet() {
    if (!newName.trim()) return
    await apiClient.post(`/poc/${pocId}/question_sets`, {
      name: newName.trim(),
      system_prompts_id: newSpId ? parseInt(newSpId) : null,
    })
    setNewName('')
    setNewSpId('')
    load()
  }

  async function deleteQuestionSet(id: number) {
    if (!confirm('削除しますか？')) return
    try {
      await apiClient.delete(`/poc/${pocId}/question_sets/${id}`)
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function createNewVersion(id: number) {
    if (!confirm('新しいバージョンを作成しますか？')) return
    try {
      await apiClient.post(`/poc/${pocId}/question_sets/${id}/new-version`)
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">読み込み中...</div>

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">質問セット</h2>
          <p className="text-sm text-muted-foreground">{poc?.display_name}</p>
        </div>
      </div>

      {/* 新規作成 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新しい質問セットを作成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>セット名</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="フリーレンQ&A セット1"
            />
          </div>
          <div className="space-y-1">
            <Label>システムプロンプト</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={newSpId}
              onChange={e => setNewSpId(e.target.value)}
            >
              <option value="">-- なし --</option>
              {systemPrompts.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={createQuestionSet} disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> 作成
          </Button>
        </CardContent>
      </Card>

      {/* セット一覧 */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{questionSets.length} 件</p>
        {questionSets.map(qs => {
          const statusInfo = STATUS_LABELS[qs.status] || { label: qs.status, variant: 'outline' as const }
          return (
            <Card key={qs.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="flex-1 cursor-pointer space-y-1"
                    onClick={() => navigate(`/poc/${pocId}/question-sets/${qs.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{qs.name}</span>
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{qs.questions.length} 問</span>
                      <span>#{qs.id}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {qs.status !== 'draft' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="新バージョン作成"
                        onClick={() => createNewVersion(qs.id)}
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="回答入力"
                      onClick={() => navigate(`/poc/${pocId}/question-sets/${qs.id}/answers`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {qs.status === 'draft' && (
                      <Button variant="ghost" size="icon" onClick={() => deleteQuestionSet(qs.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/poc/${pocId}/question-sets/${qs.id}`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {questionSets.length === 0 && (
          <p className="text-muted-foreground text-sm">質問セットがありません</p>
        )}
      </div>
    </div>
  )
}
