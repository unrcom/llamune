import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function JobLogPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [logLines, setLogLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('llamune_access_token')
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const es = new EventSource(`${apiUrl}/jobs/${jobId}/log/stream?token=${token}`)

    es.onmessage = (e) => {
      if (e.data === '[done]') {
        es.close()
        setLoading(false)
      } else {
        setLogLines(prev => [...prev, e.data])
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    es.onerror = () => {
      es.close()
      setLoading(false)
    }

    return () => es.close()
  }, [jobId])

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/jobs?expandId=" + jobId)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">訓練ログ #{jobId}</h2>
          {loading && <p className="text-xs text-muted-foreground">読み込み中...</p>}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-muted rounded p-4 font-mono text-xs">
        {logLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {logLines.length === 0 && !loading && (
          <p className="text-muted-foreground">ログがありません</p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
