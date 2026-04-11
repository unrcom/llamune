import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Question, Poc, Answer } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, ArrowLeft, Pencil, Check, X, Save } from 'lucide-react'

const TRAINING_ROLES: Record<number, string> = {
  1: '訓練',
  2: '検証',
  3: 'テスト',
  4: '除外',
}

export default function QuestionsPage() {
  const { pocId } = useParams<{ pocId: string }>()
  const navigate = useNavigate()
  const [poc, setPoc] = useState<Poc | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const [newQuestion, setNewQuestion] = useState('')
  const [newRole, setNewRole] = useState('')

  const [editId, setEditId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editRole, setEditRole] = useState('')
  const [humanAnswers, setHumanAnswers] = useState<Record<number, Answer | null>>({})
  const [answerTexts, setAnswerTexts] = useState<Record<number, string>>({})

  async function load() {
    const [pocRes, qRes] = await Promise.all([
      apiClient.get(`/poc/${pocId}`),
      apiClient.get(`/poc/${pocId}/questions`),
    ])
    setPoc(pocRes.data)
    const qs: Question[] = qRes.data
    setQuestions(qs)

    // 各質問の human 回答を取得
    const answers: Record<number, Answer | null> = {}
    const texts: Record<number, string> = {}
    await Promise.all(qs.map(async q => {
      try {
        const aRes = await apiClient.get(`/poc/${pocId}/questions/${q.id}/answers`)
        const human = aRes.data.find((a: Answer) => a.answer_type === 'human') || null
        answers[q.id] = human
        texts[q.id] = human?.answer || ''
      } catch {
        answers[q.id] = null
        texts[q.id] = ''
      }
    }))
    setHumanAnswers(answers)
    setAnswerTexts(texts)
    setLoading(false)
  }

  useEffect(() => { load() }, [pocId])

  async function createQuestion() {
    if (!newQuestion.trim()) return
    await apiClient.post(`/poc/${pocId}/questions`, {
      question: newQuestion.trim(),
      training_role: newRole ? parseInt(newRole) : null,
    })
    setNewQuestion('')
    setNewRole('')
    load()
  }

  async function saveAnswer(questionId: number) {
    const text = answerTexts[questionId]?.trim()
    if (!text) return
    await apiClient.post(`/poc/${pocId}/questions/${questionId}/answers`, {
      answer: text,
      answer_type: 'human',
    })
    load()
  }

  async function deleteAnswer(questionId: number) {
    if (!confirm('回答を削除しますか？')) return
    const answer = humanAnswers[questionId]
    if (!answer) return
    await apiClient.delete(`/poc/${pocId}/questions/${questionId}/answers`)
    load()
  }

  async function deleteQuestion(id: number) {
    if (!confirm('削除しますか？')) return
    await apiClient.delete(`/poc/${pocId}/questions/${id}`)
    load()
  }

  async function saveEdit(id: number) {
    await apiClient.put(`/poc/${pocId}/questions/${id}`, {
      question: editText,
      training_role: editRole ? parseInt(editRole) : null,
    })
    setEditId(null)
    load()
  }

  if (loading) return <div className="p-6 text-muted-foreground">読み込み中...</div>

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">質問管理</h2>
          <p className="text-sm text-muted-foreground">{poc?.display_name}</p>
        </div>
      </div>

      {/* 新規追加 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新しい質問を追加</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>質問文</Label>
            <Textarea
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder="質問を入力してください"
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label>訓練ロール</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
            >
              <option value="">-- 未設定 --</option>
              {Object.entries(TRAINING_ROLES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={createQuestion} disabled={!newQuestion.trim()}>
            <Plus className="h-4 w-4 mr-1" /> 追加
          </Button>
        </CardContent>
      </Card>

      {/* 質問一覧 */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{questions.length} 件</p>
        {questions.map(q => (
          <Card key={q.id}>
            <CardContent className="p-4">
              {editId === q.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                  />
                  <select
                    className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                  >
                    <option value="">-- 未設定 --</option>
                    {Object.entries(TRAINING_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(q.id)}>
                      <Check className="h-4 w-4 mr-1" /> 保存
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                      <X className="h-4 w-4 mr-1" /> キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{q.question}</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">#{q.id}</Badge>
                      {q.training_role && (
                        <Badge variant="secondary" className="text-xs">
                          {TRAINING_ROLES[q.training_role] || q.training_role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditId(q.id)
                        setEditText(q.question)
                        setEditRole(q.training_role?.toString() || '')
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {/* human 回答入力 */}
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">正解回答（human）</p>
                    {humanAnswers[q.id] && (
                      <Button size="sm" variant="ghost" onClick={() => deleteAnswer(q.id)}>
                        <Trash2 className="h-3 w-3 mr-1 text-destructive" /> 削除
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={answerTexts[q.id] || ''}
                    onChange={e => setAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="正解回答を入力してください"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={() => saveAnswer(q.id)}
                    disabled={!answerTexts[q.id]?.trim()}
                  >
                    <Save className="h-4 w-4 mr-1" /> 保存
                  </Button>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {questions.length === 0 && (
          <p className="text-muted-foreground text-sm">質問がありません</p>
        )}
      </div>
    </div>
  )
}
