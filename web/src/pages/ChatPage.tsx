import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Send, Loader2 } from 'lucide-react'

interface Model {
  id: number
  name: string
  display_name: string
  model_type: string
  adapter_path: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loadingModel, setLoadingModel] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null)
  const [loadedAdapterPath, setLoadedAdapterPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiClient.get('/models').then(res => setModels(res.data))
    apiClient.get('/validate/status').then(res => {
      if (res.data.loaded) {
        setLoadedModelName(res.data.model_name)
        setLoadedAdapterPath(res.data.adapter_path)
      }
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectedModel = models.find(m => m.id === selectedModelId)

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
        messages: newMessages,
        system_prompt: systemPrompt || null,
        max_tokens: 512,
      })
      setMessages([...newMessages, { role: 'assistant', content: res.data.result }])
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
      <div className="w-64 border-r bg-white p-4 flex flex-col gap-4 shrink-0">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">モデル選択</Label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={selectedModelId ?? ''}
            onChange={e => setSelectedModelId(Number(e.target.value) || null)}
          >
            <option value="">-- 選択 --</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>

        <Button
          size="sm"
          onClick={handleLoadModel}
          disabled={!selectedModelId || loadingModel}
          className="w-full"
        >
          {loadingModel ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />ロード中...</> : 'モデルをロード'}
        </Button>

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
          <Label className="text-xs text-gray-500 mb-1 block">システムプロンプト</Label>
          <Textarea
            className="text-sm"
            rows={6}
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

      {/* 右パネル */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-20">
              モデルをロードしてメッセージを送信してください
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border text-gray-800'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
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
