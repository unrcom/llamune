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
      'Authorization': 'Bearer your-api-key-here',
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
      'Authorization': 'Bearer your-api-key-here',
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
      'Authorization': 'Bearer your-api-key-here',
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
      'Authorization': 'Bearer your-api-key-here',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch presets');
  }

  return response.json();
}
