import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Execution, Poc } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

const STATUS_LABELS: Record<number, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  1: { label: '待機中', variant: 'secondary' },
  2: { label: '実行中', variant: 'default' },
  3: { label: '完了', variant: 'outline' },
  4: { label: 'エラー', variant: 'destructive' },
}

const RESULT_STATUS: Record<number, string> = {
  1: '待機中',
  2: '実行中',
  3: '完了',
  4: 'エラー',
}

export default function ExecutionsPage() {
  const { pocId } = useParams<{ pocId: string }>()
  const navigate = useNavigate()
  const [poc, setPoc] = useState<Poc | null>(null)
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  async function load() {
    const pocRes = await apiClient.get(`/poc/${pocId}`)
    setPoc(pocRes.data)

    // question_sets から executions を取得
    const qsRes = await apiClient.get(`/poc/${pocId}/question_sets`)
    const allExecs: Execution[] = []
    for (const qs of qsRes.data) {
      try {
        const exRes = await apiClient.get(`/poc/${pocId}/question_sets/${qs.id}/executions`)
        allExecs.push(...exRes.data)
      } catch {
        // ignore
      }
    }
    allExecs.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
    setExecutions(allExecs)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      const hasRunning = executions.some(e => e.status === 1 || e.status === 2)
      if (hasRunning) load()
    }, 5000)
    return () => clearInterval(interval)
  }, [pocId, executions.length])

  if (loading) return <div className="p-6 text-muted-foreground">読み込み中...</div>

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">実行履歴</h2>
          <p className="text-sm text-muted-foreground">{poc?.display_name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> 更新
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{executions.length} 件</p>
        {executions.map(exe => {
          const statusInfo = STATUS_LABELS[exe.status] || { label: String(exe.status), variant: 'outline' as const }
          const isExpanded = expandedId === exe.id
          const completedCount = exe.results.filter(r => r.status === 3).length
          const errorCount = exe.results.filter(r => r.status === 4).length

          return (
            <Card key={exe.id}>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : exe.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">実行 #{exe.id}</span>
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                      {errorCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          エラー {errorCount}件
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(exe.executed_at).toLocaleString('ja-JP')}
                      {exe.finished_at && (
                        <span className="ml-2">
                          完了: {new Date(exe.finished_at).toLocaleString('ja-JP')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {completedCount}/{exe.results.length} 件完了
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {exe.results.map((r, idx) => (
                      <div key={r.id} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs shrink-0">{idx + 1}.</span>
                          <Badge
                            variant={r.status === 4 ? 'destructive' : r.status === 3 ? 'outline' : 'secondary'}
                            className="text-xs"
                          >
                            {RESULT_STATUS[r.status] || r.status}
                          </Badge>
                        </div>
                        {r.question_text && (
                          <div className="text-xs font-medium ml-4">{r.question_text}</div>
                        )}
                        {r.answer_text && (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 ml-4 whitespace-pre-wrap">
                            {r.answer_text}
                          </div>
                        )}
                        {r.error_message && (
                          <div className="text-xs text-destructive bg-destructive/10 rounded p-2 ml-4 whitespace-pre-wrap">
                            {r.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                    {exe.results.length === 0 && (
                      <p className="text-muted-foreground text-xs">結果がありません</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {executions.length === 0 && (
          <p className="text-muted-foreground text-sm">実行履歴がありません</p>
        )}
      </div>
    </div>
  )
}
