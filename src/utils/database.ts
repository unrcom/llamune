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
      updated_at TEXT NOT NULL
    )
  `);

  // メッセージテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
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
  content: string
): void {
  const db = initDatabase();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, role, content, now);

  // セッションの更新日時を更新
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);

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
    'INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)'
  );

  for (const message of messages) {
    insertMessage.run(sessionId, message.role, message.content, now);
  }

  db.close();
  return sessionId;
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
        COUNT(m.id) as message_count,
        (
          SELECT content
          FROM messages
          WHERE session_id = s.id AND role = 'user'
          ORDER BY id ASC
          LIMIT 1
        ) as preview
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
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
          WHERE session_id = s.id AND role = 'user'
          ORDER BY id ASC
          LIMIT 1
        ) as preview
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      WHERE s.id = ?
      GROUP BY s.id
    `
    )
    .get(sessionId) as ChatSession | undefined;

  if (!session) {
    db.close();
    return null;
  }

  // メッセージを取得
  const messages = db
    .prepare(
      `
      SELECT role, content
      FROM messages
      WHERE session_id = ?
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
