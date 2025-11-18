import { create } from 'zustand';
import type { Message, Session, ChatParameters, Model } from '../types';

interface ChatState {
  // 現在のセッション
  currentSessionId: number | null;
  currentModel: string;
  messages: Message[];

  // セッション一覧
  sessions: Session[];

  // モデル一覧
  models: Model[];

  // パラメータ
  parameters: ChatParameters;

  // UI状態
  isStreaming: boolean;
  error: string | null;

  // アクション
  setCurrentSession: (sessionId: number | null) => void;
  setCurrentModel: (model: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setSessions: (sessions: Session[]) => void;
  setModels: (models: Model[]) => void;
  setParameters: (parameters: ChatParameters) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setError: (error: string | null) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // 初期状態
  currentSessionId: null,
  currentModel: '',
  messages: [],
  sessions: [],
  models: [],
  parameters: {
    temperature: 0.8,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_ctx: 2048,
  },
  isStreaming: false,
  error: null,

  // アクション
  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
  setCurrentModel: (model) => set({ currentModel: model }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  setMessages: (messages) => set({ messages }),
  setSessions: (sessions) => set({ sessions }),
  setModels: (models) => set((state) => ({
    models,
    // モデル一覧が設定されたときに、currentModel が空なら最初のモデルを設定
    currentModel: state.currentModel || (models.length > 0 ? models[0].name : ''),
  })),
  setParameters: (parameters) => set({ parameters }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  resetChat: () => set({
    currentSessionId: null,
    messages: [],
    error: null,
  }),
}));
