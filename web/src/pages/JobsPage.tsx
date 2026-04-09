import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { TrainingJob, Poc, Model, QuestionSet } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending:   'secondary',
  running:   'default',
  completed: 'outline',
  failed:    'destructive',
}

const TRAINING_MODES: Record<number, string> = {
  1: 'テキスト学習',
  2: 'LoRAノーマル',
  3: 'llamuneオリジナル',
}

export default function JobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<TrainingJob[]>([])
  const [pocs, setPocs] = useState<Poc[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [pocId, setPocId] = useState('')
  const [modelsId, setModelsId] = useState('')
  const [qsId, setQsId] = useState('')
  const [name, setName] = useState('')
  const [trainingMode, setTrainingMode] = useState('2')
  const [iters, setIters] = useState('1000')
  const [batchSize, setBatchSize] = useState('4')
  const [learningRate, setLearningRate] = useState('0.00001')
  const [numLayers, setNumLayers] = useState('16')
  const [maxSeqLength, setMaxSeqLength] = useState('2048')
  const [lossThreshold, setLossThreshold] = useState('0.1')
  const [outputModelName, setOutputModelName] = useState('')

  async function load() {
    const [jobRes, pocRes, modelRes] = await Promise.all([
      apiClient.get('/jobs'),
      apiClient.get('/poc'),
      apiClient.get('/models'),
    ])
    setJobs(jobRes.data)
    setPocs(pocRes.data)
    setModels(modelRes.data)
    setLoading(false)
  }

  async function loadQuestionSets(pid: string) {
    if (!pid) return setQuestionSets([])
    const res = await apiClient.get(`/poc/${pid}/question_sets`)
    setQuestionSets(res.data)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadQuestionSets(pocId) }, [pocId])

  async function createJob() {
    try {
      await apiClient.post('/jobs', {
        poc_id: parseInt(pocId),
        models_id: parseInt(modelsId),
        name,
        training_mode: parseInt(trainingMode),
        question_set_snapshots_id: qsId ? parseInt(qsId) : null,
        iters: parseInt(iters),
        batch_size: parseInt(batchSize),
        learning_rate: parseFloat(learningRate),
        num_layers: parseInt(numLayers),
        max_seq_length: parseInt(maxSeqLength),
        loss_threshold: trainingMode === '3' ? parseFloat(lossThreshold) : null,
        output_model_name: outputModelName || null,
      })
      setShowForm(false)
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'エラーが発生しました')
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">読み込み中...</div>

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">訓練ジョブ</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> 更新
          </Button>
          <Button size="sm" onClick={() => setShowForm(f => !f)}>
            <Plus className="h-4 w-4 mr-1" /> 新規ジョブ
          </Button>
        </div>
      </div>

      {/* 新規ジョブフォーム */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規訓練ジョブ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>PoC</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={pocId}
                  onChange={e => setPocId(e.target.value)}
                >
                  <option value="">-- 選択 --</option>
                  {pocs.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>ベースモデル</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={modelsId}
                  onChange={e => setModelsId(e.target.value)}
                >
                  <option value="">-- 選択 --</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.display_name || m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>訓練モード</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={trainingMode}
                  onChange={e => setTrainingMode(e.target.value)}
                >
                  {Object.entries(TRAINING_MODES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {(trainingMode === '2' || trainingMode === '3') && (
                <div className="space-y-1">
                  <Label>質問セット</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={qsId}
                    onChange={e => setQsId(e.target.value)}
                  >
                    <option value="">-- 選択 --</option>
                    {questionSets.map(qs => (
                      <option key={qs.id} value={qs.id}>{qs.name} ({qs.status})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1 col-span-2">
                <Label>ジョブ名</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Frieren LoRA v1" />
              </div>
              <div className="space-y-1">
                <Label>イテレーション数</Label>
                <Input value={iters} onChange={e => setIters(e.target.value)} type="number" />
              </div>
              <div className="space-y-1">
                <Label>バッチサイズ</Label>
                <Input value={batchSize} onChange={e => setBatchSize(e.target.value)} type="number" />
              </div>
              <div className="space-y-1">
                <Label>学習率</Label>
                <Input value={learningRate} onChange={e => setLearningRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>レイヤー数</Label>
                <Input value={numLayers} onChange={e => setNumLayers(e.target.value)} type="number" />
              </div>
              <div className="space-y-1">
                <Label>最大シーケンス長</Label>
                <Input value={maxSeqLength} onChange={e => setMaxSeqLength(e.target.value)} type="number" />
              </div>
              {trainingMode === '3' && (
                <div className="space-y-1">
                  <Label>loss閾値</Label>
                  <Input value={lossThreshold} onChange={e => setLossThreshold(e.target.value)} />
                </div>
              )}
              <div className="space-y-1 col-span-2">
                <Label>出力モデル名（任意）</Label>
                <Input value={outputModelName} onChange={e => setOutputModelName(e.target.value)} placeholder="Frieren-LoRA-v1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createJob} disabled={!pocId || !modelsId || !name}>
                作成
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ジョブ一覧 */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{jobs.length} 件</p>
        {jobs.map(job => {
          const isExpanded = expandedId === job.id
          return (
            <Card key={job.id}>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{job.name}</span>
                      <Badge variant={STATUS_VARIANTS[job.status] || 'outline'} className="text-xs">
                        {job.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {TRAINING_MODES[job.training_mode] || job.training_mode}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString('ja-JP')}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t pt-3 text-sm space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><span className="text-muted-foreground">iters:</span> {job.iters}</div>
                      <div><span className="text-muted-foreground">batch:</span> {job.batch_size}</div>
                      <div><span className="text-muted-foreground">lr:</span> {job.learning_rate}</div>
                      <div><span className="text-muted-foreground">layers:</span> {job.num_layers}</div>
                      {job.loss_threshold && (
                        <div><span className="text-muted-foreground">loss閾値:</span> {job.loss_threshold}</div>
                      )}
                      {job.output_model_name && (
                        <div className="col-span-2"><span className="text-muted-foreground">出力モデル:</span> {job.output_model_name}</div>
                      )}
                      {job.started_at && (
                        <div className="col-span-2"><span className="text-muted-foreground">開始:</span> {new Date(job.started_at).toLocaleString('ja-JP')}</div>
                      )}
                      {job.finished_at && (
                        <div className="col-span-2"><span className="text-muted-foreground">完了:</span> {new Date(job.finished_at).toLocaleString('ja-JP')}</div>
                      )}
                    </div>
                    {job.error_message && (
                      <div className="text-destructive text-xs mt-2 p-2 bg-destructive/10 rounded">
                        {job.error_message}
                      </div>
                    )}
                    {(job.status === 'running' || job.status === 'pending') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => navigate(`/jobs/${job.id}/log`)}
                      >
                        ログを見る
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {jobs.length === 0 && (
          <p className="text-muted-foreground text-sm">訓練ジョブがありません</p>
        )}
      </div>
    </div>
  )
}
