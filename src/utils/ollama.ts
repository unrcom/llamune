/**
 * Ollama API クライアント
 * Ollama のローカル API と通信するためのユーティリティ
 */

import { spawn } from 'child_process';

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
 * Ollama をバックグラウンドで起動
 */
export function startOllama(): void {
  const ollamaProcess = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore',
  });

  // プロセスを切り離してバックグラウンド実行
  ollamaProcess.unref();
}

/**
 * Ollama の起動を待機
 * @param maxWaitSeconds 最大待機時間（秒）
 * @param intervalMs チェック間隔（ミリ秒）
 */
export async function waitForOllama(
  maxWaitSeconds = 30,
  intervalMs = 500
): Promise<boolean> {
  const maxAttempts = (maxWaitSeconds * 1000) / intervalMs;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const isRunning = await checkOllamaStatus();
    if (isRunning) {
      return true;
    }

    // 次のチェックまで待機
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  return false;
}

/**
 * Ollama を確認し、必要に応じて起動
 * @returns 起動成功または既に起動している場合は true
 */
export async function ensureOllamaRunning(): Promise<boolean> {
  // まず起動状態を確認
  const isRunning = await checkOllamaStatus();
  if (isRunning) {
    return true;
  }

  // 起動していない場合は起動を試みる
  console.log('🚀 Ollama を起動しています...');
  startOllama();

  // 起動を待機
  const started = await waitForOllama();
  if (started) {
    console.log('✅ Ollama が起動しました');
    console.log('');
    return true;
  }

  return false;
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

/**
 * モデルをプル（ダウンロード）する
 * @param modelName モデル名（例: "gemma2:9b"）
 * @returns プル成功時は true
 */
export function pullModel(modelName: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    console.log(`📥 ${modelName} をダウンロードしています...`);
    console.log('');

    const pullProcess = spawn('ollama', ['pull', modelName], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    // 標準出力をリアルタイム表示
    pullProcess.stdout?.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    // エラー出力をリアルタイム表示
    pullProcess.stderr?.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    pullProcess.on('close', (code) => {
      console.log('');
      if (code === 0) {
        console.log(`✅ ${modelName} のダウンロードが完了しました`);
        resolve(true);
      } else {
        console.error(`❌ ${modelName} のダウンロードに失敗しました`);
        reject(new OllamaError(`プル失敗: 終了コード ${code}`));
      }
    });

    pullProcess.on('error', (error) => {
      console.error('❌ ollama コマンドの実行に失敗しました');
      reject(new OllamaError(`プル失敗: ${error.message}`));
    });
  });
}
