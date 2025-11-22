/**
 * Chat API クライアントユーティリティ
 * CLI から API サーバーの chat エンドポイントを呼び出す
 */

import { getAuthHeaders } from './auth-client.js';
import type { ChatMessage } from './ollama.js';

const API_BASE_URL = process.env.LLAMUNE_API_URL || 'http://localhost:3000';

/**
 * チャットメッセージ送信（ストリーミング）
 */
export async function* sendMessageStream(
  content: string,
  sessionId?: number,
  modelName?: string,
  presetId?: number,
  history?: ChatMessage[]
): AsyncGenerator<string, { sessionId: number; fullContent: string; model: string }, unknown> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const body: any = {
    content,
  };

  if (sessionId !== undefined) {
    body.sessionId = sessionId;
  }
  if (modelName) {
    body.modelName = modelName;
  }
  if (presetId !== undefined) {
    body.presetId = presetId;
  }
  if (history) {
    body.history = history;
  }

  const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullContent = '';
  let resultSessionId = sessionId || 0;
  let resultModel = modelName || '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.content !== undefined) {
            fullContent = parsed.content;
            yield fullContent;
          }
        } catch {
          // JSON パースエラーは無視
        }
      } else if (line.startsWith('event: done')) {
        // 次の行に done データがある
        continue;
      } else if (line.startsWith('data: ') && line.includes('sessionId')) {
        const data = line.substring(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.sessionId !== undefined) {
            resultSessionId = parsed.sessionId;
            fullContent = parsed.fullContent || fullContent;
            resultModel = parsed.model || resultModel;
          }
        } catch {
          // JSON パースエラーは無視
        }
      }
    }
  }

  return {
    sessionId: resultSessionId,
    fullContent,
    model: resultModel,
  };
}

/**
 * セッション一覧を取得
 */
export async function getSessionsList(): Promise<any[]> {
  const headers = {
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get sessions');
  }

  const data = await response.json();
  return data.sessions || [];
}

/**
 * セッション詳細を取得
 */
export async function getSessionDetail(sessionId: number): Promise<{
  session: any;
  messages: ChatMessage[];
}> {
  const headers = {
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get session');
  }

  return await response.json();
}

/**
 * セッションを削除
 */
export async function deleteSessionApi(sessionId: number): Promise<void> {
  const headers = {
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete session');
  }
}

/**
 * セッションタイトルを更新
 */
export async function updateSessionTitleApi(sessionId: number, title: string): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/title`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update session title');
  }
}

/**
 * リトライ（ストリーミング）
 */
export async function* retryMessageStream(
  sessionId: number | undefined,
  modelName: string,
  presetId?: number,
  history?: ChatMessage[]
): AsyncGenerator<string, { sessionId: number; fullContent: string; model: string }, unknown> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const body: any = {
    modelName,
  };

  if (sessionId !== undefined) {
    body.sessionId = sessionId;
  }
  if (presetId !== undefined) {
    body.presetId = presetId;
  }
  if (history) {
    body.history = history;
  }

  const response = await fetch(`${API_BASE_URL}/api/chat/retry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to retry');
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullContent = '';
  let resultSessionId = sessionId || 0;
  let resultModel = modelName || '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.content !== undefined) {
            fullContent = parsed.content;
            yield fullContent;
          }
          if (parsed.sessionId !== undefined) {
            resultSessionId = parsed.sessionId;
            fullContent = parsed.fullContent || fullContent;
            resultModel = parsed.model || resultModel;
          }
        } catch {
          // JSON パースエラーは無視
        }
      }
    }
  }

  return {
    sessionId: resultSessionId,
    fullContent,
    model: resultModel,
  };
}

/**
 * セッションを巻き戻し
 */
export async function rewindSessionApi(sessionId: number, turnNumber: number): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/rewind`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ turnNumber }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to rewind session');
  }
}

/**
 * モデルを切り替え
 */
export async function switchModelApi(sessionId: number, modelName: string): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/model`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ modelName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to switch model');
  }
}

/**
 * パラメータプリセット一覧を取得
 */
export async function getParameterPresetsApi(): Promise<any[]> {
  const headers = {
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}/api/presets`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get presets');
  }

  const data = await response.json();
  return data.presets || [];
}
