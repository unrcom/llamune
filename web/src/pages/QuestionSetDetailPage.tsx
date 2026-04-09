import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { QuestionSet, Question, Poc, SystemPrompt } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Trash2, PlayCircle, BookOpen } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:    { label: '編集中', variant: 'secondary' },
  active:   { label: 'ロック済', variant: 'default' },
  archived: { label: 'アーカイブ', variant: 'outline' },
  deleted:  { label: '削除済', variant: 'destructive' },
}

export default function QuestionSetDetailPage() {
  const { pocId, qsId } = useParams<{ pocId: string; qsId: string }>()
  const navigate = useNavigate()

  const [poc, setPoc] = useState<Poc | null>(null)
  const [qs, setQs] = useState<QuestionSet | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)

  const [editName, setEditName] = useState('')
  const [editSpId, setEditSpId] = useState('')
  const [editing, setEditing] = useState(false)

  const [addQuestionId, setAddQuestionId] = useState('')

  async function load() {
    const [pocRes, qsRes, allQRes, spRes] = await Promise.all([
      apiClient.get(`/poc/${pocId}`),
      apiClient.get(`/poc/${pocId}/question_sets/${qsId}`),
      apiClient.get(`/poc/${pocId}/questions`),
      apiClient.get(`/poc/${pocId}/system_prompts`),
    ])
    setPoc(pocRes.data)
    setQs(qsRes.data)
    setEditName(qsRes.data.name)
    setEditSpId(qsRes.data.system_prompts_id?.toString() || '')
    setAllQuestions(allQRes.data)
    setSystemPrompts(spRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [pocId, qsId])

  async function saveEdit() {
    try {
      await apiClient.put(`/poc/${pocId}/question_sets/${qsId}`, {
        name: editName,
        system_prompts_id: editSpId ? parseInt(editSpId) : null,
      })
      setEditing(false)
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function addItem() {
    if (!addQuestionId) return
    try {
      const currentIds = qs?.questions.map(q => q.id) || []
      const nextOrder = currentIds.length
      await apiClient.post(`/poc/${pocId}/question_sets/${qsId}/items`, {
        questions_id: parseInt(addQuestionId),
        order_index: nextOrder,
      })
      setAddQuestionId('')
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function removeItem(questionId: number) {
    if (!confirm('この質問をセットから削除しますか？')) return
    try {
      await apiClient.delete(`/poc/${pocId}/question_sets/${qsId}/items/${questionId}`)
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  async function runExecution() {
    if (!confirm('LLM実行を開始しますか？')) return
    try {
      await apiClient.post(`/poc/${pocId}/question_sets/${qsId}/executions`, {})
      navigate(`/poc/${pocId}/executions`)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">読み込み中...</div>
  if (!qs) return <div className="p-6 text-muted-foreground">見つかりません</div>

  const isDraft = qs.status === 'draft'
  const statusInfo = STATUS_LABELS[qs.status] || { label: qs.status, variant: 'outline' as const }
  const itemIds = qs.questions.map(q => q.id)
  const availableQuestions = allQuestions.filter(q => !itemIds.includes(q.id))

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/poc/${pocId}/question-sets`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{qs.name}</h2>
            <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{poc?.display_name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/poc/${pocId}/question-sets/${qsId}/answers`)}
          >
            <BookOpen className="h-4 w-4 mr-1" /> 回答入力
          </Button>
          <Button size="sm" onClick={runExecution}>
            <PlayCircle className="h-4 w-4 mr-1" /> LLM実行
          </Button>
        </div>
      </div>

      {/* セット情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">セット情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              <div className="space-y-1">
                <Label>セット名</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>システムプロンプト</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={editSpId}
                  onChange={e => setEditSpId(e.target.value)}
                >
                  <option value="">-- なし --</option>
                  {systemPrompts.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>保存</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>キャンセル</Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-sm">
                <div>セット名: <span className="font-medium">{qs.name}</span></div>
                <div>
                  システムプロンプト:{' '}
                  <span className="font-medium">
                    {systemPrompts.find(sp => sp.id === qs.system_prompts_id)?.name || 'なし'}
                  </span>
                </div>
              </div>
              {isDraft && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>編集</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 質問一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">質問一覧（{qs.questions.length} 問）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDraft && (
            <div className="space-y-2">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={addQuestionId}
                onChange={e => setAddQuestionId(e.target.value)}
              >
                <option value="">-- 質問を選択 --</option>
                {availableQuestions.map(q => (
                  <option key={q.id} value={q.id}>#{q.id} {q.question.slice(0, 50)}</option>
                ))}
              </select>
              <Button size="sm" onClick={addItem} disabled={!addQuestionId} className="w-fit">
                <Plus className="h-4 w-4 mr-1" /> 追加
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {qs.questions.map((q, idx) => (
              <div key={q.id} className="flex items-start justify-between gap-2 p-2 border rounded-md">
                <div className="flex gap-2 flex-1">
                  <span className="text-muted-foreground text-xs mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                  <p className="text-sm">{q.question}</p>
                </div>
                {isDraft && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {qs.questions.length === 0 && (
              <p className="text-muted-foreground text-sm">質問がありません</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
