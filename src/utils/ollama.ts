/**
 * Ollama API クライアント
 * Ollama のローカル API と通信するためのユーティリティ
 */

// Ollama APIのベースURL
const OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * Ollama モデルの型定義
 */
export interface OllamaModel {
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

/**
 * モデル一覧レスポンスの型定義
 */
export interface OllamaModelsResponse {
  models: OllamaModel[];
}

/**
 * Ollama API エラー
 */
export class OllamaError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

/**
 * インストール済みモデル一覧を取得
 */
export async function listModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

    if (!response.ok) {
      throw new OllamaError(
        `Ollama API error: ${response.statusText}`,
        response.status
      );
    }

    const data = (await response.json()) as OllamaModelsResponse;
    return data.models || [];
  } catch (error) {
    if (error instanceof OllamaError) {
      throw error;
    }

    // ネットワークエラーなど
    if (error instanceof Error) {
      throw new OllamaError(
        `Ollama に接続できませんでした: ${error.message}`
      );
    }

    throw new OllamaError('不明なエラーが発生しました');
  }
}

/**
 * Ollama が起動しているか確認
 */
export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * バイト数を人間が読みやすい形式に変換
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * パラメータサイズを抽出（例: "9B" から "9.0B params"）
 */
export function formatParams(model: OllamaModel): string {
  const paramSize = model.details?.parameter_size;
  if (paramSize) {
    return `${paramSize} params`;
  }
  return 'Unknown size';
}
