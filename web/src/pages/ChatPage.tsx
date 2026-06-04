import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Send, Loader2, X, Settings } from 'lucide-react'

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

export default function ChatPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const datasetsRef = useRef<Dataset[]>([])
  const setDatasets = (v: Dataset[]) => { datasetsRef.current = v }
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const loadingModelRef = useRef(false)
  const setLoadingModel = (v: boolean) => { loadingModelRef.current = v }
  const [generating, setGenerating] = useState(false)
  const [searchMode, setSearchMode] = useState<'off' | 'direct' | 'llm'>('off')
  const [ragContext, setRagContext] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null)
  const [loadedAdapterPath, setLoadedAdapterPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      if (res.data.length > 0) {
        setSystemPrompt(res.data[0].content)
      }
    })
  }, [selectedProjectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectedModel = models.find(m => m.id === selectedModelId)

  useEffect(() => {
    if (!selectedModel) return
    apiClient.get(`/validate/system-prompt/${selectedModel.id}`).then(res => {
      setSystemPrompt(res.data.system_prompt || '')
    }).catch(() => setSystemPrompt(''))
    setLoadingModel(true)
    setError(null)
    apiClient.post('/validate/load', {
      model_name: selectedModel.name,
      adapter_path: selectedModel.adapter_path,
    }).then(() => {
      setLoadedModelName(selectedModel.name)
      setLoadedAdapterPath(selectedModel.adapter_path)
      setMessages([])
    }).catch((e: any) => {
      setError(e.response?.data?.detail || 'モデルのロードに失敗しました')
    }).finally(() => {
      setLoadingModel(false)
    })
  }, [selectedModelId])

  async function handleLoadModel() {
    if (!selectedModel) return
    setLoadingModel(true)
    setError(null)
    try {
      await apiClient.post('/validate/load', {
        model_name: selectedModel.name,
        adapter_path: selectedModel.adapter_path,
      })
      setLoadedModelName(selectedModel.name)
      setLoadedAdapterPath(selectedModel.adapter_path)
      setMessages([])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'モデルのロードに失敗しました')
    } finally {
      setLoadingModel(false)
    }
  }

  async function handleSend() {
    if (!input.trim() || generating) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setGenerating(true)
    setError(null)
    try {
      const res = await apiClient.post('/validate/generate', {
        messages: newMessages.filter(m => m.role !== 'tool'),
        system_prompt: systemPrompt || null,
        max_tokens: 512,
        dataset_id: selectedDatasetId || null,
        rag_mode: searchMode === 'direct',
      })
      setRagContext(res.data.rag_context || null)
      // バックエンドから返ってきたmessages（tool含む）で更新
      const assistantMsg: Message = { role: 'assistant', content: res.data.result }
      setMessages([...newMessages, assistantMsg])
    } catch (e: any) {
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
      {/* 左パネル */}
      <div className={`border-r bg-white flex flex-col shrink-0 transition-all duration-200 ${settingsOpen ? 'w-64' : 'w-8'}`}>
        {/* 設定ヘッダー（常時表示） */}
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

        {/* ロード済みモデル（折り畳み時のみ非表示・設定ヘッダー下に縦表示） */}
        {loadedModelName && !settingsOpen && (
          <div className="px-1 py-2 text-xs text-green-600 bg-green-50 border-b text-center" style={{writingMode: 'vertical-rl'}}>
            ✅{searchMode === 'direct' ? ' 直接検索' : ''}
            {searchMode === 'llm' ? ' LLM検索' : ''}
          </div>
        )}

        {/* 折り畳み可能な設定エリア */}
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
                  onChange={e => { setSearchMode(e.target.value as 'off' | 'direct' | 'llm'); setRagContext(null) }}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="off">オフ</option>
                  <option value="direct">直接検索</option>
                  <option value="llm">LLM検索</option>
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
              onClick={() => setMessages([])}
            >
              会話をリセット
            </Button>
          </div>
        )}
      </div>

      {/* 右パネル */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-20">
              モデルをロードしてメッセージを送信してください
            </div>
          )}
          {messages.map((msg, i) => {
            const msgKey = `${i}-${msg.role}`
            let bubbleClass = 'bg-white border text-gray-800'
            if (msg.role === 'user') bubbleClass = 'bg-blue-600 text-white'
            else if (msg.role === 'tool') bubbleClass = 'bg-gray-100 text-gray-500 text-xs font-mono'
            return (
              <div key={msgKey} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${bubbleClass}`}>
                  {msg.role === 'tool' && <div className="text-xs text-gray-400 mb-1">🔍 検索結果</div>}
                  {msg.content}
                </div>
              </div>
            )
          })}
          {generating && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> 生成中...
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {ragContext && (
          <div className="px-4 pt-2">
            <details className="text-xs text-gray-400 border rounded p-2 bg-gray-50">
              <summary className="cursor-pointer">🔍 RAG検索コンテキスト</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all text-gray-500">{ragContext}</pre>
            </details>
          </div>
        )}

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
