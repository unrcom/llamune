/**
 * データベース管理ユーティリティ
 * SQLiteを使用して会話履歴を保存
 */

import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { ChatMessage } from './ollama.js';

// データベースファイルのパス
const DB_DIR = join(homedir(), '.llamune');
const DB_FILE = join(DB_DIR, 'history.db');

/**
 * 会話セッションの型定義
 */
export interface ChatSession {
  id: number;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview: string; // 最初のユーザーメッセージのプレビュー
  title: string | null; // セッションのタイトル
}

/**
 * 推奨モデルの型定義
 */
export interface RecommendedModel {
  id: number;
  min_memory_gb: number;
  max_memory_gb: number | null;
  model_name: string;
  model_size: string;
  description: string;
  priority: number;
}

/**
 * パラメータプリセットの型定義
 */
export interface ParameterPreset {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  temperature: number | null;
  top_p: number | null;
  top_k: number | null;
  repeat_penalty: number | null;
  num_ctx: number | null;
  created_at: string;
}

/**
 * データベースを初期化
 */
export function initDatabase(): Database.Database {
  // ディレクトリがなければ作成
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_FILE);

  // セッションテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      title TEXT
    )
  `);

  // 既存のテーブルにtitleカラムがなければ追加
  const tableInfo = db.pragma('table_info(sessions)') as { name: string }[];
  const hasTitleColumn = tableInfo.some((col) => col.name === 'title');
  if (!hasTitleColumn) {
    db.exec('ALTER TABLE sessions ADD COLUMN title TEXT');
  }

  // メッセージテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      model TEXT,
      deleted_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  // 推奨モデルテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommended_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      min_memory_gb INTEGER NOT NULL,
      max_memory_gb INTEGER,
      model_name TEXT NOT NULL,
      model_size TEXT NOT NULL,
      description TEXT NOT NULL,
      priority INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  return db;
}

/**
 * 新しいセッションを作成
 */
export function createSession(model: string): number {
  const db = initDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare('INSERT INTO sessions (model, created_at, updated_at) VALUES (?, ?, ?)')
    .run(model, now, now);

  db.close();
  return result.lastInsertRowid as number;
}

/**
 * メッセージを保存
 */
export function saveMessage(
  sessionId: number,
  role: string,
  content: string,
  model?: string
): void {
  const db = initDatabase();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO messages (session_id, role, content, created_at, model) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId, role, content, now, model || null);

  // セッションの更新日時を更新
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);

  // 最初のユーザーメッセージの場合、タイトルを自動設定
  if (role === 'user') {
    const session = db
      .prepare('SELECT title FROM sessions WHERE id = ?')
      .get(sessionId) as { title: string | null } | undefined;

    if (session && !session.title) {
      const title =
        content.length > 30 ? content.substring(0, 30) + '...' : content;
      db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, sessionId);
    }
  }

  db.close();
}

/**
 * 会話全体を保存
 */
export function saveConversation(
  model: string,
  messages: ChatMessage[]
): number {
  const db = initDatabase();
  const now = new Date().toISOString();

  // セッションを作成
  const sessionResult = db
    .prepare('INSERT INTO sessions (model, created_at, updated_at) VALUES (?, ?, ?)')
    .run(model, now, now);

  const sessionId = sessionResult.lastInsertRowid as number;

  // メッセージを一括保存
  const insertMessage = db.prepare(
    'INSERT INTO messages (session_id, role, content, created_at, model) VALUES (?, ?, ?, ?, ?)'
  );

  for (const message of messages) {
    insertMessage.run(sessionId, message.role, message.content, now, message.model || null);
  }

  db.close();
  return sessionId;
}

/**
 * 既存セッションにメッセージを追加
 */
export function appendMessagesToSession(
  sessionId: number,
  messages: ChatMessage[]
): void {
  const db = initDatabase();
  const now = new Date().toISOString();

  // メッセージを一括追加
  const insertMessage = db.prepare(
    'INSERT INTO messages (session_id, role, content, created_at, model) VALUES (?, ?, ?, ?, ?)'
  );

  for (const message of messages) {
    insertMessage.run(sessionId, message.role, message.content, now, message.model || null);
  }

  // セッションの更新日時を更新
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);

  db.close();
}

/**
 * セッション一覧を取得
 */
export function listSessions(limit = 10): ChatSession[] {
  const db = initDatabase();

  const sessions = db
    .prepare(
      `
      SELECT
        s.id,
        s.model,
        s.created_at,
        s.updated_at,
        s.title,
        COUNT(m.id) as message_count,
        (
          SELECT content
          FROM messages
          WHERE session_id = s.id AND role = 'user' AND deleted_at IS NULL
          ORDER BY id ASC
          LIMIT 1
        ) as preview
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id AND m.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT ?
    `
    )
    .all(limit) as ChatSession[];

  db.close();
  return sessions;
}

/**
 * セッションの詳細を取得
 */
export function getSession(sessionId: number): {
  session: ChatSession;
  messages: ChatMessage[];
} | null {
  const db = initDatabase();

  // セッション情報を取得
  const session = db
    .prepare(
      `
      SELECT
        s.id,
        s.model,
        s.created_at,
        s.updated_at,
        COUNT(m.id) as message_count,
        (
          SELECT content
          FROM messages
          WHERE session_id = s.id AND role = 'user' AND deleted_at IS NULL
          ORDER BY id ASC
          LIMIT 1
        ) as preview
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id AND m.deleted_at IS NULL
      WHERE s.id = ?
      GROUP BY s.id
    `
    )
    .get(sessionId) as ChatSession | undefined;

  if (!session) {
    db.close();
    return null;
  }

  // メッセージを取得（論理削除されていないもののみ）
  const messages = db
    .prepare(
      `
      SELECT role, content, model
      FROM messages
      WHERE session_id = ? AND deleted_at IS NULL
      ORDER BY id ASC
    `
    )
    .all(sessionId) as ChatMessage[];

  db.close();

  return {
    session,
    messages,
  };
}

/**
 * デフォルトの推奨モデルを初期化
 */
export function initializeDefaultRecommendedModels(): void {
  const db = initDatabase();

  // 既にデータがあるかチェック
  const count = db
    .prepare('SELECT COUNT(*) as count FROM recommended_models')
    .get() as { count: number };

  if (count.count > 0) {
    // 既にデータがあれば何もしない
    db.close();
    return;
  }

  const now = new Date().toISOString();

  // デフォルトの推奨モデルデータ
  const defaultModels = [
    // 8GB以下
    { min: 0, max: 8, name: 'gemma2:2b', size: '1.6 GB', desc: '軽量で高速。低スペックPCに最適', priority: 1 },
    { min: 0, max: 8, name: 'qwen2.5:3b', size: '2.0 GB', desc: 'コンパクトながら高性能', priority: 2 },
    // 9-16GB
    { min: 9, max: 16, name: 'gemma2:9b', size: '5.4 GB', desc: 'バランス型。品質と速度を両立', priority: 1 },
    { min: 9, max: 16, name: 'qwen2.5:7b', size: '4.7 GB', desc: '日本語性能が高い', priority: 2 },
    // 17GB以上
    { min: 17, max: null, name: 'gemma2:27b', size: '16 GB', desc: '最高性能。複雑なタスクを高精度で処理', priority: 1 },
    { min: 17, max: null, name: 'qwen2.5:14b', size: '8.5 GB', desc: '高性能。日本語処理に優れる', priority: 2 },
    { min: 17, max: null, name: 'deepseek-r1:7b', size: '4.7 GB', desc: '推論特化。思考プロセスを表示', priority: 3 },
  ];

  const insert = db.prepare(
    'INSERT INTO recommended_models (min_memory_gb, max_memory_gb, model_name, model_size, description, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  for (const model of defaultModels) {
    insert.run(
      model.min,
      model.max,
      model.name,
      model.size,
      model.desc,
      model.priority,
      now
    );
  }

  db.close();
}

/**
 * システムメモリに基づいて推奨モデルを取得
 */
export function getRecommendedModelsByMemory(memoryGB: number): RecommendedModel[] {
  const db = initDatabase();

  const models = db
    .prepare(
      `
      SELECT *
      FROM recommended_models
      WHERE min_memory_gb <= ?
        AND (max_memory_gb IS NULL OR max_memory_gb >= ?)
      ORDER BY priority ASC
    `
    )
    .all(memoryGB, memoryGB) as RecommendedModel[];

  db.close();
  return models;
}

/**
 * すべての推奨モデルを取得
 */
export function getAllRecommendedModels(): RecommendedModel[] {
  const db = initDatabase();

  const models = db
    .prepare(
      `
      SELECT *
      FROM recommended_models
      ORDER BY min_memory_gb ASC, priority ASC
    `
    )
    .all() as RecommendedModel[];

  db.close();
  return models;
}

/**
 * メッセージを往復単位で取得（IDと共に）
 */
export interface MessageWithId extends ChatMessage {
  id: number;
}

export interface MessageTurn {
  turnNumber: number;
  user: MessageWithId;
  assistant: MessageWithId;
}

export function getSessionMessagesWithTurns(sessionId: number): MessageTurn[] {
  const db = initDatabase();

  // 論理削除されていないメッセージを取得
  const messages = db
    .prepare(
      `
      SELECT id, role, content, model
      FROM messages
      WHERE session_id = ? AND deleted_at IS NULL
      ORDER BY id ASC
    `
    )
    .all(sessionId) as MessageWithId[];

  db.close();

  // user-assistant のペアに変換
  const turns: MessageTurn[] = [];
  for (let i = 0; i < messages.length; i += 2) {
    if (i + 1 < messages.length && messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
      turns.push({
        turnNumber: Math.floor(i / 2) + 1,
        user: messages[i],
        assistant: messages[i + 1],
      });
    }
  }

  return turns;
}

/**
 * 指定した往復番号以降のメッセージを論理削除
 */
export function logicalDeleteMessagesAfterTurn(sessionId: number, turnNumber: number): number {
  const db = initDatabase();
  const now = new Date().toISOString();

  // 論理削除されていないメッセージを取得
  const messages = db
    .prepare(
      `
      SELECT id
      FROM messages
      WHERE session_id = ? AND deleted_at IS NULL
      ORDER BY id ASC
    `
    )
    .all(sessionId) as Array<{ id: number }>;

  // 削除するメッセージのIDを計算（往復番号 * 2 以降）
  const deleteFromIndex = turnNumber * 2;
  const messageIdsToDelete = messages.slice(deleteFromIndex).map((m) => m.id);

  if (messageIdsToDelete.length === 0) {
    db.close();
    return 0;
  }

  // 論理削除を実行
  const placeholders = messageIdsToDelete.map(() => '?').join(',');
  const result = db
    .prepare(`UPDATE messages SET deleted_at = ? WHERE id IN (${placeholders})`)
    .run(now, ...messageIdsToDelete);

  // セッションの更新日時を更新
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);

  db.close();
  return result.changes;
}

/**
 * すべてのパラメータプリセットを取得
 */
export function getAllParameterPresets(): ParameterPreset[] {
  const db = initDatabase();

  const presets = db
    .prepare(
      `
      SELECT *
      FROM parameter_presets
      ORDER BY id ASC
    `
    )
    .all() as ParameterPreset[];

  db.close();
  return presets;
}

/**
 * 名前でパラメータプリセットを取得
 */
export function getParameterPresetByName(name: string): ParameterPreset | null {
  const db = initDatabase();

  const preset = db
    .prepare(
      `
      SELECT *
      FROM parameter_presets
      WHERE name = ?
    `
    )
    .get(name) as ParameterPreset | undefined;

  db.close();
  return preset || null;
}

/**
 * IDでパラメータプリセットを取得
 */
export function getParameterPresetById(id: number): ParameterPreset | null {
  const db = initDatabase();

  const preset = db
    .prepare(
      `
      SELECT *
      FROM parameter_presets
      WHERE id = ?
    `
    )
    .get(id) as ParameterPreset | undefined;

  db.close();
  return preset || null;
}

/**
 * すべてのセッションを取得（プレビュー付き）
 */
export function getAllSessions(): ChatSession[] {
  const db = initDatabase();

  const sessions = db
    .prepare(
      `
      SELECT
        s.id,
        s.model,
        s.created_at,
        COUNT(m.id) as message_count,
        (SELECT content FROM messages WHERE session_id = s.id AND role = 'user' AND deleted_at IS NULL ORDER BY id ASC LIMIT 1) as preview
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id AND m.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `
    )
    .all() as ChatSession[];

  db.close();
  return sessions;
}

/**
 * セッションのモデルを更新
 */
export function updateSessionModel(sessionId: number, modelName: string): boolean {
  const db = initDatabase();
  const now = new Date().toISOString();

  try {
    const result = db
      .prepare('UPDATE sessions SET model = ?, updated_at = ? WHERE id = ?')
      .run(modelName, now, sessionId);

    db.close();
    return result.changes > 0;
  } catch (error) {
    db.close();
    throw error;
  }
}

/**
 * セッションを削除
 */
export function deleteSession(sessionId: number): boolean {
  const db = initDatabase();

  try {
    // メッセージを削除
    db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);

    // セッションを削除
    const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

    db.close();
    return result.changes > 0;
  } catch (error) {
    db.close();
    throw error;
  }
}
