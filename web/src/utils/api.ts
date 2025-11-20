import type {
  Message,
  SessionsResponse,
  SessionDetailResponse,
  Model,
  ParameterPreset,
} from '../types';

const API_BASE_URL = '/api';

// セッション一覧を取得
export async function fetchSessions(): Promise<SessionsResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }

  return response.json();
}

// セッション詳細を取得
export async function fetchSession(sessionId: number): Promise<SessionDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }

  return response.json();
}

// モデル一覧を取得
export async function fetchModels(): Promise<{ models: Model[] }> {
  const response = await fetch(`${API_BASE_URL}/models`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  return response.json();
}

// パラメータプリセット一覧を取得
export async function fetchPresets(): Promise<{ presets: ParameterPreset[] }> {
  const response = await fetch(`${API_BASE_URL}/presets`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch presets');
  }

  return response.json();
}

// Retry - 最後のメッセージを再実行
export async function retryLastMessage(
  sessionId: number | null,
  modelName: string,
  presetId?: number | null,
  history?: Message[]
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}/chat/retry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
    body: JSON.stringify({
      sessionId,
      modelName,
      presetId,
      history,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to retry message');
  }

  return response;
}

// Rewind - 指定したターンまで巻き戻し
export async function rewindSession(
  sessionId: number,
  turnNumber: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/rewind`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
    body: JSON.stringify({ turnNumber }),
  });

  if (!response.ok) {
    throw new Error('Failed to rewind session');
  }
}

// セッションタイトルを更新
export async function updateSessionTitle(
  sessionId: number,
  title: string
): Promise<{ success: boolean; sessionId: number; title: string }> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/title`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error('Failed to update session title');
  }

  return response.json();
}

// セッションを削除
export async function deleteSessionApi(
  sessionId: number
): Promise<{ success: boolean; sessionId: number }> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }

  return response.json();
}
