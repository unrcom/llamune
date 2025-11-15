# Llamune CLI 版 仕様書

ink による CLI/TUI アプリケーションの詳細仕様

---

## 目次

1. [概要](#概要)
2. [コマンド設計](#コマンド設計)
3. [UI 設計](#ui設計)
4. [データ構造](#データ構造)
5. [技術アーキテクチャ](#技術アーキテクチャ)
6. [開発タスク](#開発タスク)
7. [テスト計画](#テスト計画)

---

## 概要

### Phase 1: MVP（CLI 版のみ）

**目的:**
最小限の機能で、複数 LLM の比較・活用の価値を検証

**スコープ:**

```
必須機能:
├─ 複数LLM実行（gemma2, deepseek-r1, qwen2.5）
├─ 会話履歴管理（SQLite）
├─ LLM選択・パラメータ調整
├─ 結果の比較表示（テキストベース）
└─ 設定管理（YAML/JSON）

見送り機能（Phase 2以降）:
├─ リッチなマークダウン描画
├─ アーティファクト管理
├─ バックグラウンド推論
├─ Web UI
└─ RAG機能
```

### 技術スタック

```typescript
- ランタイム: Node.js 18+
- 言語: TypeScript
- CLI Framework: Commander.js
- TUI: ink (React for CLI)
- DB: better-sqlite3
- HTTP Client: native fetch
- Config: cosmiconfig
- Testing: Vitest
```

### 前提条件

**必須:**

- Node.js 18+ インストール済み
- ollama インストール済み

**ollama の起動:**

- 不要（Llamune が自動起動）
- `ollama serve` を手動実行する必要なし

**確認方法:**

```bash
# ollamaがインストールされているか確認
$ ollama --version
ollama version is 0.x.x

# モデルがインストールされているか確認
$ ollama list
NAME              ID              SIZE
gemma2:9b         ...            5.4 GB
deepseek-r1:7b    ...            4.7 GB
qwen2.5:14b       ...            8.5 GB
```

**Llamune の動作:**

1. ollama の状態を確認
2. 起動していなければ自動起動
3. 処理開始

```bash
$ llamune chat

# ollama未起動の場合:
🚀 ollama を起動しています...
✅ ollama が起動しました

# ollama起動済みの場合:
# 何も表示せず即座に開始
```

---

## コマンド設計

### コマンド一覧

```bash
# メインコマンド
llamune                 # インタラクティブモード起動

# サブコマンド
llamune chat            # チャット開始
llamune compare <query> # 複数LLMで比較
llamune config          # 設定管理
llamune models          # モデル一覧表示
llamune history         # 会話履歴表示
llamune help            # ヘルプ表示
llamune version         # バージョン表示
```

### 1. メインコマンド: llamune

```bash
$ llamune

# 動作:
# 1. インタラクティブモードで起動
# 2. メニューを表示
# 3. ユーザーの選択を待つ
```

**表示例:**

```
╔═══════════════════════════════════════╗
║ Llamune v0.1.0 - CLI Edition          ║
╠═══════════════════════════════════════╣
║ 🔒 Closed Network LLM Platform        ║
║ 📊 Network Traffic: 0 MB ✅           ║
╚═══════════════════════════════════════╝

Available Models:
  ✓ gemma2:9b      (9.2B params)
  ✓ deepseek-r1:7b (7.0B params)
  ✓ qwen2.5:14b    (14.0B params)

What would you like to do?
  › Start Chat
    Compare Models
    View History
    Settings
    Exit

Use ↑↓ arrows to navigate, Enter to select
```

### 2. chat コマンド

```bash
$ llamune chat

# オプション
$ llamune chat --model gemma2:9b
$ llamune chat --temperature 0.8
$ llamune chat --continue <session-id>
```

**動作:**

```typescript
interface ChatOptions {
  model?: string; // デフォルト: gemma2:9b
  temperature?: number; // デフォルト: 0.7
  continue?: string; // 会話IDを指定して継続
}
```

**表示例:**

````
╔═══════════════════════════════════════╗
║ Chat Mode                             ║
║ Model: gemma2:9b                      ║
║ Temperature: 0.7                      ║
╚═══════════════════════════════════════╝

You: Pythonでクイックソートを実装して

AI: はい、実装します...

```python
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)
````

[Completed in 28s]

You: \_

````

**操作:**
- `/help` - ヘルプ表示
- `/model` - モデル切り替え
- `/params` - パラメータ調整
- `/save` - 会話を保存
- `/exit` - チャット終了

### 3. compare コマンド

```bash
$ llamune compare "Pythonでクイックソート"

# オプション
$ llamune compare "質問" --models gemma2:9b,qwen2.5:14b
$ llamune compare "質問" --all  # 全モデルで実行
````

**動作:**

```typescript
interface CompareOptions {
  models?: string[]; // デフォルト: 推奨3モデル
  all?: boolean; // 全てのモデル
  parallel?: boolean; // 並列実行（デフォルト: true）
}
```

**表示例:**

```
╔═══════════════════════════════════════╗
║ Comparing with 3 models...            ║
╚═══════════════════════════════════════╝

⏳ gemma2:9b      [████████░░] 80%
✓  qwen2.5:14b    [28s]
⏳ deepseek-r1:7b [████░░░░░░] 40%

─────────────────────────────────────────

╔═══════════════════════════════════════╗
║ Results                               ║
╠═══════════════════════════════════════╣
║                                       ║
║ Common Approach:                      ║
║ • 再帰的実装                          ║
║ • ピボット選択: 中央要素              ║
║                                       ║
║ Differences:                          ║
║ [1] gemma2:9b    - シンプル実装       ║
║ [2] qwen2.5:14b  - エラー処理追加     ║
║ [3] deepseek-r1  - 最適化版           ║
║                                       ║
╚═══════════════════════════════════════╝

View details:
  [1] gemma2:9b
  [2] qwen2.5:14b
  [3] deepseek-r1:7b
  [a] Show all
  [s] Save comparison
  [q] Quit

> _
```

### 4. config コマンド

```bash
$ llamune config

# サブコマンド
$ llamune config list              # 設定一覧
$ llamune config set <key> <value> # 設定変更
$ llamune config reset             # デフォルトに戻す
```

**設定項目:**

```typescript
interface Config {
  // デフォルトモデル
  defaultModel: string;

  // 推奨モデル設定
  recommendedModels: string[];

  // デフォルトパラメータ
  defaultParameters: {
    temperature: number;
    top_p: number;
    max_tokens: number;
  };

  // 表示設定
  display: {
    colors: boolean;
    timestamps: boolean;
    modelInfo: boolean;
  };

  // ollama接続
  ollamaUrl: string;
}
```

**表示例:**

```
╔═══════════════════════════════════════╗
║ Configuration                         ║
╠═══════════════════════════════════════╣
║                                       ║
║ defaultModel: gemma2:9b               ║
║ recommendedModels:                    ║
║   - gemma2:9b                         ║
║   - deepseek-r1:7b                    ║
║   - qwen2.5:14b                       ║
║                                       ║
║ defaultParameters:                    ║
║   temperature: 0.7                    ║
║   top_p: 0.9                          ║
║   max_tokens: 500                     ║
║                                       ║
║ display:                              ║
║   colors: true                        ║
║   timestamps: true                    ║
║   modelInfo: true                     ║
║                                       ║
║ ollamaUrl: http://localhost:11434    ║
║                                       ║
╚═══════════════════════════════════════╝

[e] Edit  [r] Reset  [q] Quit
```

### 5. models コマンド

```bash
$ llamune models

# サブコマンド
$ llamune models list      # インストール済みモデル
$ llamune models available # 利用可能なモデル
$ llamune models info <name> # モデル詳細
```

**表示例:**

```
╔═══════════════════════════════════════╗
║ Installed Models                      ║
╠═══════════════════════════════════════╣
║                                       ║
║ ✓ gemma2:9b                           ║
║   Size: 5.4GB                         ║
║   Parameters: 9.2B                    ║
║   Family: Gemma 2                     ║
║                                       ║
║ ✓ deepseek-r1:7b                      ║
║   Size: 4.7GB                         ║
║   Parameters: 7.0B                    ║
║   Family: DeepSeek-R1                 ║
║   Features: Reasoning, Thinking       ║
║                                       ║
║ ✓ qwen2.5:14b                         ║
║   Size: 8.5GB                         ║
║   Parameters: 14.0B                   ║
║   Family: Qwen 2.5                    ║
║                                       ║
╚═══════════════════════════════════════╝

Total: 3 models, 18.6GB
```

### 6. history コマンド

```bash
$ llamune history

# オプション
$ llamune history --limit 10
$ llamune history --model gemma2:9b
$ llamune history --search "クイックソート"
```

**表示例:**

```
╔═══════════════════════════════════════╗
║ Chat History                          ║
╠═══════════════════════════════════════╣
║                                       ║
║ [1] 2025-11-11 18:30                  ║
║     Model: gemma2:9b                  ║
║     "Pythonでクイックソート..."       ║
║     5 messages                        ║
║                                       ║
║ [2] 2025-11-11 15:20                  ║
║     Model: qwen2.5:14b                ║
║     "REST APIの実装方法..."           ║
║     12 messages                       ║
║                                       ║
║ [3] 2025-11-10 10:15                  ║
║     Comparison (3 models)             ║
║     "認証機能の実装..."               ║
║                                       ║
╚═══════════════════════════════════════╝

[v] View  [d] Delete  [e] Export  [q] Quit
```

---

## UI 設計

### ink コンポーネント構成

```typescript
src/ui/
├── App.tsx              # ルートコンポーネント
├── components/
│   ├── Header.tsx       # ヘッダー
│   ├── Menu.tsx         # メインメニュー
│   ├── Chat.tsx         # チャット画面
│   ├── Compare.tsx      # 比較画面
│   ├── Config.tsx       # 設定画面
│   ├── ModelList.tsx    # モデル一覧
│   ├── History.tsx      # 履歴画面
│   ├── ProgressBar.tsx  # プログレスバー
│   └── StatusBar.tsx    # ステータスバー
└── hooks/
    ├── useOllama.ts     # ollama接続
    ├── useDatabase.ts   # DB操作
    └── useConfig.ts     # 設定管理
```

### コンポーネント例

#### Header.tsx

```typescript
import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ version }) => (
  <Box
    borderStyle="double"
    borderColor="cyan"
    padding={1}
    flexDirection="column"
  >
    <Box justifyContent="space-between">
      <Text bold color="cyan">
        Llamune {version}
      </Text>
      <Text dimColor>CLI Edition</Text>
    </Box>
    <Box marginTop={1}>
      <Text>🔒 Closed Network LLM Platform</Text>
    </Box>
    <Box>
      <Text>📊 Network Traffic: </Text>
      <Text color="green" bold>
        0 MB ✅
      </Text>
    </Box>
  </Box>
);
```

#### Chat.tsx

```typescript
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface ChatProps {
  model: string;
  onMessage: (message: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ model, onMessage }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
    }>
  >([]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    onMessage(input);
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
  };

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" padding={1} marginBottom={1}>
        <Text>Model: </Text>
        <Text color="cyan" bold>
          {model}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <Box key={i} marginBottom={1}>
            <Text color={msg.role === "user" ? "green" : "blue"} bold>
              {msg.role === "user" ? "You" : "AI"}:
            </Text>
            <Text> {msg.content}</Text>
          </Box>
        ))}
      </Box>

      <Box>
        <Text color="green">You: </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
};
```

### カラースキーム

```typescript
const colors = {
  primary: 'cyan',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  muted: 'gray',
};

// 使用例
<Text color={colors.primary}>Llamune</Text>
<Text color={colors.success}>✓ Completed</Text>
<Text color={colors.warning}>⚠ Warning</Text>
<Text color={colors.error}>✗ Error</Text>
```

---

## データ構造

### SQLite スキーマ

```sql
-- 会話セッション
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,  -- 'chat' | 'compare'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- メッセージ
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  model_name TEXT,
  parameters TEXT,  -- JSON
  execution_time INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 比較結果
CREATE TABLE comparisons (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  models TEXT NOT NULL,  -- JSON array
  results TEXT NOT NULL,  -- JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 設定
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- インデックス
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_comparisons_session ON comparisons(session_id);
CREATE INDEX idx_sessions_updated ON sessions(updated_at DESC);
```

### TypeScript 型定義

```typescript
// セッション
interface Session {
  id: string;
  mode: "chat" | "compare";
  createdAt: number;
  updatedAt: number;
}

// メッセージ
interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  modelName?: string;
  parameters?: LLMParameters;
  executionTime?: number;
  createdAt: number;
}

// LLMパラメータ
interface LLMParameters {
  temperature: number;
  top_p: number;
  top_k: number;
  max_tokens: number;
  repeat_penalty: number;
}

// 比較結果
interface Comparison {
  id: string;
  sessionId: string;
  query: string;
  models: string[];
  results: ComparisonResult[];
  createdAt: number;
}

interface ComparisonResult {
  model: string;
  response: string;
  executionTime: number;
  parameters: LLMParameters;
}

// 設定
interface AppConfig {
  defaultModel: string;
  recommendedModels: string[];
  defaultParameters: LLMParameters;
  display: DisplayConfig;
  ollamaUrl: string;
}

interface DisplayConfig {
  colors: boolean;
  timestamps: boolean;
  modelInfo: boolean;
}
```

---

## 技術アーキテクチャ

### ディレクトリ構成

```
llamune/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── .npmignore
├── bin/
│   └── llamune.js          # CLI エントリーポイント
├── src/
│   ├── index.ts            # メイン
│   ├── commands/
│   │   ├── chat.ts
│   │   ├── compare.ts
│   │   ├── config.ts
│   │   ├── models.ts
│   │   └── history.ts
│   ├── ui/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── hooks/
│   ├── llm/
│   │   ├── ollama.ts       # ollama API
│   │   ├── executor.ts     # LLM実行
│   │   └── comparator.ts   # 比較ロジック
│   ├── storage/
│   │   ├── database.ts     # SQLite操作
│   │   └── migrations.ts   # DBマイグレーション
│   ├── config/
│   │   ├── defaults.ts     # デフォルト設定
│   │   └── loader.ts       # 設定ロード
│   └── utils/
│       ├── logger.ts
│       └── validators.ts
├── test/
│   └── ...
└── dist/                   # ビルド成果物
```

### ollama 連携

```typescript
// src/llm/ollama.ts
export class OllamaClient {
  constructor(private baseUrl: string) {}

  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    return response.json();
  }

  async listModels(): Promise<Model[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models;
  }
}

interface GenerateParams {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
  };
}
```

### データベース操作

```typescript
// src/storage/database.ts
import Database from "better-sqlite3";

export class LlamuneDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.migrate();
  }

  private migrate() {
    // スキーマ作成
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (...);
      CREATE TABLE IF NOT EXISTS messages (...);
      ...
    `);
  }

  // セッション操作
  createSession(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, mode, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(session.id, session.mode, session.createdAt, session.updatedAt);
  }

  getSession(id: string): Session | undefined {
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE id = ?");
    return stmt.get(id) as Session | undefined;
  }

  // メッセージ操作
  addMessage(message: Message): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages 
      (id, session_id, role, content, model_name, parameters, execution_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      message.id,
      message.sessionId,
      message.role,
      message.content,
      message.modelName,
      JSON.stringify(message.parameters),
      message.executionTime,
      message.createdAt
    );
  }

  getMessages(sessionId: string): Message[] {
    const stmt = this.db.prepare(
      "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at"
    );
    return stmt.all(sessionId) as Message[];
  }
}
```

---

## 開発タスク

### Week 1-2: 基盤構築

```
□ プロジェクトセットアップ
  □ npm init
  □ TypeScript設定
  □ ESLint/Prettier設定
  □ package.json整備

□ CLI基本構造
  □ Commander.jsセットアップ
  □ bin/llamune.js作成
  □ 基本コマンド登録

□ inkセットアップ
  □ 基本コンポーネント作成
  □ Header
  □ Menu
  □ レイアウト確認

□ ollama連携
  □ OllamaClient実装
  □ generate API
  □ list models API
  □ エラーハンドリング

□ データベース
  □ better-sqlite3セットアップ
  □ スキーマ作成
  □ マイグレーション
  □ 基本CRUD操作
```

### Week 3-4: コア機能

```
□ chatコマンド
  □ インタラクティブチャット実装
  □ メッセージ送受信
  □ 会話履歴保存
  □ モデル切り替え

□ compareコマンド
  □ 複数LLM実行
  □ 並列処理
  □ 結果収集
  □ 比較表示

□ UI実装
  □ Chat画面
  □ Compare画面
  □ プログレスバー
  □ エラー表示

□ パラメータ調整
  □ 設定読み込み
  □ パラメータ変更UI
  □ デフォルト値管理
```

### Week 5-6: 完成度向上

```
□ historyコマンド
  □ セッション一覧
  □ メッセージ表示
  □ 検索機能
  □ エクスポート

□ configコマンド
  □ 設定表示
  □ 設定変更
  □ バリデーション
  □ リセット機能

□ modelsコマンド
  □ モデル一覧
  □ モデル詳細
  □ ステータス表示

□ エラーハンドリング
  □ ネットワークエラー
  □ DBエラー
  □ バリデーションエラー
  □ ユーザーフレンドリーなメッセージ

□ ドキュメント
  □ README更新
  □ コマンドヘルプ
  □ 使用例
```

### Week 7: リリース準備

```
□ テスト
  □ ユニットテスト
  □ 統合テスト
  □ 手動テスト

□ パフォーマンス
  □ 起動速度確認
  □ メモリ使用量確認
  □ DB最適化

□ npm公開準備
  □ package.json最終調整
  □ .npmignore設定
  □ README整備
  □ ビルド確認

□ 社内テスト
  □ テストユーザー募集
  □ フィードバック収集
  □ バグ修正
```

---

## テスト計画

### ユニットテスト

```typescript
// test/llm/ollama.test.ts
import { describe, it, expect } from "vitest";
import { OllamaClient } from "../src/llm/ollama";

describe("OllamaClient", () => {
  it("should connect to ollama", async () => {
    const client = new OllamaClient("http://localhost:11434");
    const models = await client.listModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it("should generate response", async () => {
    const client = new OllamaClient("http://localhost:11434");
    const response = await client.generate({
      model: "gemma2:9b",
      prompt: "Hello",
    });
    expect(response.response).toBeDefined();
  });
});
```

### 統合テスト

```typescript
// test/integration/chat.test.ts
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

describe("chat command", () => {
  it("should start chat session", () => {
    const output = execSync("llamune chat --model gemma2:9b", {
      encoding: "utf-8",
      timeout: 5000,
    });
    expect(output).toContain("Chat Mode");
  });
});
```

### 手動テストチェックリスト

```
□ 基本動作
  □ llamune 起動
  □ メニュー表示
  □ 各コマンド実行

□ チャット機能
  □ メッセージ送信
  □ 返答受信
  □ 履歴保存
  □ セッション継続

□ 比較機能
  □ 複数モデル実行
  □ 結果表示
  □ 詳細表示

□ エラーハンドリング
  □ ollama未起動
  □ モデル未インストール
  □ ネットワークエラー

□ パフォーマンス
  □ 起動速度 < 1秒
  □ レスポンス速度
  □ メモリ使用量
```

---

## まとめ

### MVP 完成時の状態

```
ユーザーができること:
✅ 複数のLLMと会話
✅ LLMの回答を比較
✅ 会話履歴を確認
✅ 設定を変更
✅ モデル情報を確認

技術的な達成:
✅ Node.js + TypeScript
✅ ink によるTUI
✅ ollama連携
✅ SQLite データ管理
✅ npm配布
```

### Phase 2 への準備

```
CLI版で検証すること:
□ ユーザーは価値を感じるか？
□ どの機能が最も使われるか？
□ Web UIの必要性は？
□ パフォーマンスは十分か？
```

---

**初版作成**: 2025-11-11  
**作成者**: mop  
**バージョン**: 1.0.0
**次回レビュー**: 開発開始時
