import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Send, Loader2, X, Settings, ChevronDown, ChevronRight } from 'lucide-react'

interface Model {
  id: number
  name: string
  display_name: string
  model_type: string
  adapter_path: string | null
  system_prompt: string | null
}

interface Dataset {
  id: number
  display_name: string
}

interface Project {
  id: number
  display_name: string
}

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
}

interface RagHit {
  rank: number
  distance: number
  text: string
}

interface RagResult {
  hits: RagHit[]
  threshold: number
  used: boolean
  error?: string
}

interface TurnLog {
  search_mode: 'off' | 'direct' | 'llm'
  rag_query: string | null
  rag_result: string | null  // JSON文字列
  response_time_ms: number
  model_name: string
  system_prompt: string
}

// userメッセージとassistantメッセージをターン単位で管理
interface Turn {
  userMessage: string
  assistantMessage: string
  log: TurnLog | null
}

const SEARCH_MODE_LABEL: Record<string, string> = {
  off: 'RAGなし',
  direct: '直接検索',
  llm: 'LLM検索',
}

function SystemPromptPanel({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  if (!content) return null
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-gray-400 hover:opacity-70"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>system_prompt</span>
      </button>
      {open && (
        <pre className="mt-0.5 whitespace-pre-wrap break-all text-gray-500 bg-white border rounded p-1 max-h-40 overflow-y-auto">
          {content}
        </pre>
      )}
    </div>
  )
}

function TurnLogPanel({ log }: { log: TurnLog }) {
  const [open, setOpen] = useState(false)
  const modeColor =
    log.search_mode === 'off' ? 'text-gray-400' :
    log.search_mode === 'direct' ? 'text-blue-500' : 'text-purple-500'

  return (
    <div className="my-1 mx-auto w-full max-w-[75%]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 text-xs ${modeColor} hover:opacity-70 transition-opacity`}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{SEARCH_MODE_LABEL[log.search_mode]}</span>
        <span className="text-gray-400 ml-1">{log.response_time_ms}ms</span>
      </button>

      {open && (
        <div className="mt-1 rounded border bg-gray-50 text-xs text-gray-600 p-2 space-y-1">
          <div>
            <span className="text-gray-400 mr-1">model:</span>
            <span className="text-gray-700">{log.model_name}</span>
          </div>
          <div>
            <span className="text-gray-400 mr-1">search_mode:</span>
            <span className={modeColor}>{log.search_mode}</span>
          </div>
          <SystemPromptPanel content={log.system_prompt} />
          {log.rag_query && (
            <div>
              <span className="text-gray-400 mr-1">rag_query:</span>
              <span>{log.rag_query}</span>
            </div>
          )}
          {log.rag_result && (() => {
            let parsed: RagResult | null = null
            try { parsed = JSON.parse(log.rag_result) } catch {}
            if (!parsed) return (
              <div>
                <span className="text-gray-400 mr-1">rag_result:</span>
                <pre className="mt-0.5 whitespace-pre-wrap break-all text-gray-500 bg-white border rounded p-1">{log.rag_result}</pre>
              </div>
            )
            return (
              <div>
                <div className="text-gray-400 mb-0.5">
                  rag_hits: threshold={parsed.threshold} / used={parsed.used ? '✅' : '❌'}
                </div>
                <div className="space-y-1">
                  {parsed.hits.map(h => (
                    <div key={h.rank} className={`border rounded p-1 bg-white ${h.distance <= parsed!.threshold ? 'border-blue-200' : 'border-gray-200 opacity-50'}`}>
                      <div className="flex gap-2 text-gray-400 mb-0.5">
                        <span>rank={h.rank}</span>
                        <span className={h.distance <= parsed!.threshold ? 'text-blue-500' : 'text-red-400'}>
                          distance={h.distance}
                        </span>
                      </div>
                      <div className="text-gray-600 whitespace-pre-wrap break-all">{h.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          <div>
            <span className="text-gray-400 mr-1">response_time:</span>
            <span>{log.response_time_ms}ms</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const datasetsRef = useRef<Dataset[]>([])
  const setDatasets = (v: Dataset[]) => { datasetsRef.current = v }
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const loadingModelRef = useRef(false)
  const setLoadingModel = (v: boolean) => { loadingModelRef.current = v }
  const [generating, setGenerating] = useState(false)
  const [searchMode, setSearchMode] = useState<'off' | 'direct' | 'llm'>('direct')
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null)
  const [loadedAdapterPath, setLoadedAdapterPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiClient.get('/projects').then(res => setProjects(res.data))
    apiClient.get('/models').then(res => setModels(res.data))
    apiClient.get('/validate/status').then(res => {
      if (res.data.loaded) {
        setLoadedModelName(res.data.model_name)
        setLoadedAdapterPath(res.data.adapter_path)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedProjectId) { setDatasets([]); setSelectedDatasetId(null); return }
    apiClient.get(`/datasets?project_id=${selectedProjectId}`).then(res => {
      setDatasets(res.data)
      if (res.data.length > 0) setSelectedDatasetId(res.data[0].id)
      else setSelectedDatasetId(null)
    })
    apiClient.get(`/system-prompts?project_id=${selectedProjectId}`).then(res => {
      if (res.data.length > 0) setSystemPrompt(res.data[0].content)
    })
  }, [selectedProjectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  const selectedModel = models.find(m => m.id === selectedModelId)

  useEffect(() => {
    if (!selectedModel) return
    apiClient.get(`/validate/system-prompt/${selectedModel.id}`).then(res => {
      if (res.data.system_prompt) {
        setSystemPrompt(res.data.system_prompt)
      } else if (selectedProjectId) {
        // FTモデルのシステムプロンプトがない場合はプロジェクトのものを使う
        apiClient.get(`/system-prompts?project_id=${selectedProjectId}`).then(r => {
          if (r.data.length > 0) setSystemPrompt(r.data[0].content)
          else setSystemPrompt('')
        }).catch(() => setSystemPrompt(''))
      } else {
        setSystemPrompt('')
      }
    }).catch(() => {})
    setLoadingModel(true)
    setError(null)
    apiClient.post('/validate/load', {
      model_name: selectedModel.name,
      adapter_path: selectedModel.adapter_path,
    }).then(() => {
      setLoadedModelName(selectedModel.name)
      setLoadedAdapterPath(selectedModel.adapter_path)
      setTurns([])
      sessionIdRef.current = null
    }).catch((e: any) => {
      setError(e.response?.data?.detail || 'モデルのロードに失敗しました')
    }).finally(() => {
      setLoadingModel(false)
    })
  }, [selectedModelId])

  // turns → messages変換（generate APIに渡す用）
  function turnsToMessages(ts: Turn[]): Message[] {
    const msgs: Message[] = []
    for (const t of ts) {
      msgs.push({ role: 'user', content: t.userMessage })
      msgs.push({ role: 'assistant', content: t.assistantMessage })
    }
    return msgs
  }

  async function handleSend() {
    if (!input.trim() || generating) return
    const userMessage = input.trim()
    setInput('')
    setPendingUserMessage(userMessage)
    setGenerating(true)
    setError(null)

    // 現在の会話履歴 + 今回のユーザーメッセージ
    const historyMessages = turnsToMessages(turns)
    const allMessages = [...historyMessages, { role: 'user' as const, content: userMessage }]

    try {
      const res = await apiClient.post('/validate/generate', {
        messages: allMessages,
        system_prompt: systemPrompt || null,
        max_tokens: 512,
        dataset_id: selectedDatasetId || null,
        rag_mode: searchMode === 'direct',
        rag_llm_mode: searchMode === 'llm',
        session_id: sessionIdRef.current,
      })

      // session_idを保持（2ターン目以降は同一sessionとして記録）
      if (res.data.session_id) {
        sessionIdRef.current = res.data.session_id
      }

      const newTurn: Turn = {
        userMessage,
        assistantMessage: res.data.result,
        log: res.data.log ?? null,
      }
      setPendingUserMessage(null)
      setTurns(prev => [...prev, newTurn])
    } catch (e: any) {
      setPendingUserMessage(null)
      setError(e.response?.data?.detail || '生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full">
      {/* 左パネル：設定 */}
      <div className={`border-r bg-white flex flex-col shrink-0 transition-all duration-200 ${settingsOpen ? 'w-64' : 'w-8'}`}>
        <button
          type="button"
          onClick={() => setSettingsOpen(v => !v)}
          className={`flex items-center justify-between px-2 py-3 text-xs text-gray-500 hover:bg-gray-50 border-b w-full text-left ${settingsOpen ? '' : 'flex-col gap-1'}`}
        >
          {settingsOpen ? (
            <>
              <span className="font-medium">設定</span>
              <X className="h-3 w-3" />
            </>
          ) : (
            <Settings className="h-4 w-4 mx-auto" />
          )}
        </button>

        {loadedModelName && !settingsOpen && (
          <div className="px-1 py-2 text-xs text-green-600 bg-green-50 border-b text-center" style={{writingMode: 'vertical-rl'}}>
            ✅{searchMode === 'direct' ? ' 直接検索' : ''}
            {searchMode === 'llm' ? ' LLM検索' : ''}
          </div>
        )}

        {settingsOpen && (
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">モデル選択</Label>
              <select
                className="w-full border rounded px-2 py-1.5 text-sm"
                value={selectedModelId ?? ''}
                onChange={e => setSelectedModelId(Number(e.target.value) || null)}
              >
                <option value="">-- 選択 --</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>

            {loadedModelName && (
              <div className="text-xs text-green-600 bg-green-50 rounded p-2 break-all space-y-1">
                <div>✅ {loadedModelName}</div>
                {loadedAdapterPath
                  ? <div className="text-blue-600">🔧 {loadedAdapterPath}</div>
                  : <div className="text-gray-400">adapter: なし（ベースモデル）</div>
                }
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-500 mb-1 block">プロジェクト</Label>
              <select
                className="w-full border rounded px-2 py-1.5 text-sm"
                value={selectedProjectId ?? ''}
                onChange={e => setSelectedProjectId(Number(e.target.value) || null)}
              >
                <option value="">-- 選択 --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
              </select>
            </div>

            {selectedProjectId && selectedDatasetId && (
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">ドキュメント参照</Label>
                <select
                  value={searchMode}
                  onChange={e => setSearchMode(e.target.value as 'off' | 'direct' | 'llm')}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="direct">直接検索</option>
                  <option value="llm">LLM検索</option>
                  <option value="off">オフ</option>
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-500 mb-1 block">システムプロンプト</Label>
              <Textarea
                className="text-sm"
                rows={5}
                placeholder="省略可"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { setTurns([]); sessionIdRef.current = null }}
            >
              会話をリセット
            </Button>
          </div>
        )}
      </div>

      {/* 右パネル：チャット */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {turns.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-20">
              モデルをロードしてメッセージを送信してください
            </div>
          )}

          {turns.map((turn, i) => (
            <div key={i}>
              {/* ユーザーメッセージ */}
              <div className="flex justify-end mb-1">
                <div className="max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap bg-blue-600 text-white">
                  {turn.userMessage}
                </div>
              </div>

              {/* ターンログ（折りたたみ） */}
              {turn.log && <TurnLogPanel log={turn.log} />}

              {/* アシスタントメッセージ */}
              <div className="flex justify-start mt-1">
                <div className="max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap bg-white border text-gray-800">
                  {turn.assistantMessage}
                </div>
              </div>
            </div>
          ))}

          {pendingUserMessage && (
            <div className="flex justify-end mb-1">
              <div className="max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap bg-blue-600 text-white">
                {pendingUserMessage}
              </div>
            </div>
          )}
          {generating && (
            <div className="flex justify-start mt-1">
              <div className="bg-white border rounded-lg px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> 生成中...
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm text-center mt-2">{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-4 bg-white flex gap-2 items-end">
          <Textarea
            className="flex-1 text-sm resize-none"
            rows={2}
            placeholder="メッセージを入力（Ctrl+Enterで送信）"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!loadedModelName || generating}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !loadedModelName || generating}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
