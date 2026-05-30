import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, RefreshCw } from 'lucide-react'

interface Project { id: number; name: string; display_name: string }
interface Model { id: number; name: string; display_name: string; model_type: string }

interface TrainingJob {
  id: number
  project_id: number
  models_id: number
  status: string
  training_mode: number
  max_seq_length: number
  iters: number
  batch_size: number
  learning_rate: number | null
  adapter_path: string | null
  error_message: string | null
  log: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-700',
  running:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   '待機中',
  running:   '実行中',
  completed: '完了',
  failed:    '失敗',
}

export default function JobsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [jobs, setJobs] = useState<TrainingJob[]>([])

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [maxSeqLength, setMaxSeqLength] = useState(8192)
  const [iters, setIters] = useState(100)
  const [batchSize, setBatchSize] = useState(4)
  const [learningRate, setLearningRate] = useState('1e-05')

  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    apiClient.get('/projects').then(res => setProjects(res.data)).catch(() => {})
    apiClient.get('/models').then(res => setModels(res.data)).catch(() => {})
  }, [])

  async function loadJobs(projectId: number) {
    try {
      const res = await apiClient.get(`/training-jobs?project_id=${projectId}`)
      setJobs(res.data)
      // runningジョブがあればポーリング継続
      const hasRunning = res.data.some((j: TrainingJob) => j.status === 'running' || j.status === 'pending')
      if (!hasRunning && pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
        setRunning(false)
      }
    } catch {}
  }

  useEffect(() => {
    if (!selectedProjectId) return
    loadJobs(selectedProjectId)
  }, [selectedProjectId])

  function startPolling(projectId: number) {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(() => loadJobs(projectId), 3000)
  }

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  async function handleRun() {
    if (!selectedProjectId || !selectedModelId) return
    setError('')
    setRunning(true)
    try {
      const res = await apiClient.post('/training-jobs', {
        project_id: selectedProjectId,
        models_id: selectedModelId,
        max_seq_length: maxSeqLength,
        iters,
        batch_size: batchSize,
        learning_rate: Number.parseFloat(learningRate),
      })
      setJobs(prev => [res.data, ...prev])
      setExpandedJobId(res.data.id)
      startPolling(selectedProjectId)
    } catch (e: any) {
      setError(e.response?.data?.detail || '実行に失敗しました')
      setRunning(false)
    }
  }

  const baseModels = models.filter(m => m.model_type === 'base')

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold">訓練ジョブ</h2>

      {/* 設定エリア */}
      <Card>
        <CardHeader><CardTitle className="text-base">設定</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>プロジェクト</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-white"
                value={selectedProjectId ?? ''}
                onChange={e => { setSelectedProjectId(Number(e.target.value) || null); setJobs([]) }}
              >
                <option value="">選択してください</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>ベースモデル</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-white"
                value={selectedModelId ?? ''}
                onChange={e => setSelectedModelId(Number(e.target.value) || null)}
              >
                <option value="">選択してください</option>
                {baseModels.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>max_seq_length</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-white"
                value={maxSeqLength}
                onChange={e => setMaxSeqLength(Number(e.target.value))}
              >
                {[2048, 4096, 8192, 16384].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>iters</Label>
              <input
                type="number"
                min={1}
                value={iters}
                onChange={e => setIters(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>batch_size</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-white"
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value))}
              >
                {[1, 2, 4].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>learning_rate</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-white"
                value={learningRate}
                onChange={e => setLearningRate(e.target.value)}
              >
                {['1e-05', '5e-05', '1e-04', '5e-04'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleRun}
            disabled={running || !selectedProjectId || !selectedModelId}
          >
            {running
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />実行中...</>
              : <><Play className="h-4 w-4 mr-2" />実行</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* ジョブ一覧 */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">ジョブ一覧</h3>
          {jobs.map(job => (
            <Card key={job.id} className="cursor-pointer" onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">ID: {job.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[job.status]}`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                    {(job.status === 'running' || job.status === 'pending') && (
                      <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {job.started_at ? new Date(job.started_at).toLocaleString('ja-JP') : job.created_at}
                  </div>
                </div>

                <div className="text-xs text-gray-500 flex gap-4">
                  <span>iters: {job.iters}</span>
                  <span>batch: {job.batch_size}</span>
                  <span>max_seq: {job.max_seq_length}</span>
                  {job.learning_rate && <span>lr: {job.learning_rate}</span>}
                </div>

                {job.adapter_path && (
                  <p className="text-xs text-green-600">adapter: {job.adapter_path}</p>
                )}

                {job.error_message && (
                  <p className="text-xs text-red-600">{job.error_message}</p>
                )}

                {/* ログ表示 */}
                {expandedJobId === job.id && job.log && (
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap">
                    {job.log}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
