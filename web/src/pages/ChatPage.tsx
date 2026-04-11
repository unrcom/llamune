import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/api/client'
import { Poc, Model } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [pocs, setPocs] = useState<Poc[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [pocId, setPocId] = useState('')
  const [modelsId, setModelsId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      apiClient.get('/poc'),
      apiClient.get('/models'),
    ]).then(([pocRes, modelRes]) => {
      setPocs(pocRes.data)
      setModels(modelRes.data)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // pocId が変わったらデフォルトモデルを設定
  useEffect(() => {
    if (!pocId) return
    const poc = pocs.find(p => String(p.id) === pocId)
    if (poc?.models_id) {
      setModelsId(String(poc.models_id))
    }
  }, [pocId, pocs])

  async function sendMessage() {
    if (!input.trim() || !pocId || !modelsId || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const poc = pocs.find(p => String(p.id) === pocId)
      const appName = `p${pocId}-m${modelsId}`
      const res = await apiClient.post('/chat', {
        app_name: appName,
        question: userMessage.content,
      })
      const assistantMessage: Message = { role: 'assistant', content: res.data.answer }
      setMessages(prev => [...prev, assistantMessage])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectedModel = models.find(m => String(m.id) === modelsId)

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="border-b p-4 space-y-3">
        <h2 className="text-xl font-bold">チャット</h2>
        <div className="flex gap-4">
          <div className="space-y-1 flex-1">
            <Label>プロジェクト</Label>
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
          <div className="space-y-1 flex-1">
            <Label>モデル</Label>
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
        </div>
        {selectedModel && (
          <p className="text-xs text-muted-foreground">{selectedModel.name}</p>
        )}
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm text-center mt-8">
            プロジェクトとモデルを選択して質問してください
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
              生成中...
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t p-4 space-y-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="質問を入力してください（Ctrl+Enter で送信）"
          rows={3}
          disabled={!pocId || !modelsId || loading}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!input.trim() || !pocId || !modelsId || loading}
          >
            <Send className="h-4 w-4 mr-1" />
            送信
          </Button>
        </div>
      </div>
    </div>
  )
}
