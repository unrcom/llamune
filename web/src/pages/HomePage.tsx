import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Poc } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BrainCircuit, BookOpen, Layers, PlayCircle } from 'lucide-react'

export default function HomePage() {
  const [pocs, setPocs] = useState<Poc[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    apiClient.get('/poc').then(res => {
      setPocs(res.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-muted-foreground">読み込み中...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">PoC 一覧</h2>
        <p className="text-muted-foreground text-sm mt-1">学習プロジェクトを選択してください</p>
      </div>

      {pocs.length === 0 ? (
        <p className="text-muted-foreground">PoC がありません。設定から作成してください。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pocs.map(poc => (
            <Card key={poc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{poc.display_name}</CardTitle>
                  {poc.model_display_name && (
                    <Badge variant="secondary" className="text-xs">
                      {poc.model_display_name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{poc.name}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/poc/${poc.id}/questions`)}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    質問
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/poc/${poc.id}/question-sets`)}
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    セット
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/poc/${poc.id}/executions`)}
                  >
                    <PlayCircle className="h-3 w-3 mr-1" />
                    実行
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/poc/${poc.id}/jobs`)}
                  >
                    <BrainCircuit className="h-3 w-3 mr-1" />
                    訓練
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
