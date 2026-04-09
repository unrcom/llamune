import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { QuestionSet, Poc, Question, Answer } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface QuestionWithAnswer extends Question {
  human_answer: Answer | null
  llm_answers: Answer[]
  expanded: boolean
}

export default function AnswersPage() {
  const { pocId, qsId } = useParams<{ pocId: string; qsId: string }>()
  const navigate = useNavigate()

  const [poc, setPoc] = useState<Poc | null>(null)
  const [qs, setQs] = useState<QuestionSet | null>(null)
  const [items, setItems] = useState<QuestionWithAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [editTexts, setEditTexts] = useState<Record<number, string>>({})

  async function load() {
    const [pocRes, qsRes] = await Promise.all([
      apiClient.get(`/poc/${pocId}`),
      apiClient.get(`/poc/${pocId}/question_sets/${qsId}`),
    ])
    setPoc(pocRes.data)
    setQs(qsRes.data)

    const questions: Question[] = qsRes.data.questions
    const withAnswers: QuestionWithAnswer[] = await Promise.all(
      questions.map(async q => {
        const aRes = await apiClient.get(`/poc/${pocId}/questions/${q.id}/answers`)
        const answers: Answer[] = aRes.data
        const human = answers.find(a => a.answer_type === 'human') || null
        const llms = answers.filter(a => a.answer_type === 'llm')
        return { ...q, human_answer: human, llm_answers: llms, expanded: true }
      })
    )
    setItems(withAnswers)
    const texts: Record<number, string> = {}
    withAnswers.forEach(q => {
      texts[q.id] = q.human_answer?.answer || ''
    })
    setEditTexts(texts)
    setLoading(false)
  }

  useEffect(() => { load() }, [pocId, qsId])

  async function saveAnswer(questionId: number) {
    const text = editTexts[questionId]
    if (!text?.trim()) return
    await apiClient.put(
      `/poc/${pocId}/question_sets/${qsId}/answers/questions/${questionId}/human-answer`,
      { answer: text.trim() }
    )
    load()
  }

  async function deleteAnswer(questionId: number) {
    if (!confirm('回答を削除しますか？')) return
    await apiClient.delete(
      `/poc/${pocId}/question_sets/${qsId}/answers/questions/${questionId}/human-answer`
    )
    load()
  }

  function toggleExpand(id: number) {
    setItems(prev => prev.map(q => q.id === id ? { ...q, expanded: !q.expanded } : q))
  }

  if (loading) return <div className="p-6 text-muted-foreground">読み込み中...</div>

  const answeredCount = items.filter(q => q.human_answer).length

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/poc/${pocId}/question-sets/${qsId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">回答入力</h2>
          <p className="text-sm text-muted-foreground">
            {poc?.display_name} / {qs?.name} — {answeredCount}/{items.length} 件回答済
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              {/* 質問ヘッダー */}
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => toggleExpand(q.id)}
              >
                <div className="flex gap-2 flex-1">
                  <span className="text-muted-foreground text-sm shrink-0">{idx + 1}.</span>
                  <p className="text-sm font-medium">{q.question}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {q.human_answer
                    ? <Badge variant="default" className="text-xs">回答済</Badge>
                    : <Badge variant="outline" className="text-xs">未回答</Badge>
                  }
                  {q.expanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
              </div>

              {q.expanded && (
                <>
                  {/* LLM回答 */}
                  {q.llm_answers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">LLM回答</p>
                      {q.llm_answers.slice(0, 1).map(a => (
                        <div key={a.id} className="text-sm bg-muted/50 rounded p-2 whitespace-pre-wrap">
                          {a.answer}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Human回答入力 */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">正解回答（human）</p>
                    <Textarea
                      value={editTexts[q.id] || ''}
                      onChange={e => setEditTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="正解回答を入力してください"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveAnswer(q.id)}
                        disabled={!editTexts[q.id]?.trim()}
                      >
                        <Save className="h-4 w-4 mr-1" /> 保存
                      </Button>
                      {q.human_answer && (
                        <Button size="sm" variant="ghost" onClick={() => deleteAnswer(q.id)}>
                          <Trash2 className="h-4 w-4 mr-1 text-destructive" /> 削除
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm">質問がありません</p>
        )}
      </div>
    </div>
  )
}
