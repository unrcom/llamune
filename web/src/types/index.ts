// メッセージ型
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

// セッション型
export interface Session {
  id: number;
  model: string;
  created_at: string;
  message_count: number;
  preview: string;
  title: string | null;
}

// チャットパラメータ型
export interface ChatParameters {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  num_ctx?: number;
}

// パラメータプリセット型
export interface ParameterPreset {
  id: number;
  name: string;
  description: string;
  temperature: number | null;
  top_p: number | null;
  top_k: number | null;
  repeat_penalty: number | null;
  num_ctx: number | null;
}

// モデル型
export interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

// 推奨モデル型
export interface RecommendedModel {
  name: string;
  size: string;
  description: string;
  priority: number;
}

// システムスペック型
export interface SystemSpec {
  totalMemoryGB: number;
  cpuCores: number;
  platform: string;
  arch: string;
}

// APIリクエスト型
export interface SendMessageParams {
  sessionId?: number;
  content: string;
  modelName?: string;
  presetId?: number;
  history?: Message[];
}

// APIレスポンス型
export interface ChatChunkResponse {
  content: string;
}

export interface ChatDoneResponse {
  sessionId: number;
  fullContent: string;
  model: string;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface SessionDetailResponse {
  session: {
    id: number;
    model: string;
    created_at: string;
  };
  messages: Message[];
}

export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
}
