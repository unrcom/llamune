# Llamune サービス仕様書

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [解決する課題](#解決する課題)
3. [コアコンセプト](#コアコンセプト)
4. [機能要件](#機能要件)
5. [UI/UX 設計](#uiux設計)
6. [技術アーキテクチャ](#技術アーキテクチャ)
7. [開発ロードマップ](#開発ロードマップ)
8. [運営戦略](#運営戦略)

---

## プロジェクト概要

### 基本情報

```
プロジェクト名: Llamune (ラムネ/ラミューン)
ドメイン: llamune.com (取得済み)
GitHub: https://github.com/unrcom/llamune
タグライン: クローズドネットワークで複数のローカルLLMを比較・活用するプラットフォーム
```

### ターゲットユーザー

**組織単位:**

- 業種、業界を問わない企業・団体
- 部門、チーム単位での導入
- 機密情報を扱う組織
- データガバナンスを重視する組織

**具体例:**

- IT 企業の開発チーム
- 会計監査法人
- 物販・EC 事業者
- 法律事務所
- 医療機関
- 製造業の設計部門

### ビジョン

**短期（MVP）:**
日本のビジネスにおいて「頼りになる推論モデル」を見つけ、活用できるプラットフォームを提供

**中期（1-2 年）:**
各業界・ドメインに特化した LLM 活用環境を、ユーザーとの共創（PoC）により構築

**長期（3-5 年）:**
企業の知的資産をセキュアに活用し、業務効率を劇的に向上させる AI プラットフォームのスタンダードになる

---

## 解決する課題

### 1. 機密情報の漏洩リスク

**課題:**

```
一般的なクラウドLLMサービス:
- 入力データが外部サーバーに送信される
- 学習データに使われる可能性
- 情報漏洩のリスク
- コンプライアンス違反の懸念
```

**Llamune の解決策:**

```
完全なクローズドネットワーク環境:
✅ データは一切外部に送信されない
✅ 通信量ゼロを可視化（ダッシュボード）
✅ オンプレミス or VPC内での運用
✅ 企業のセキュリティポリシーに準拠
```

### 2. 単一 LLM の誤りや偏り

**課題:**

```
単一のLLMに依存:
- 回答の誤りに気づきにくい
- モデル固有の偏りが影響
- 専門分野での精度にバラつき
- 「それっぽい」誤答を信じてしまう
```

**Llamune の解決策:**

```
複数LLMによるクロスチェック:
✅ 同じ質問を複数モデルで推論
✅ 回答の違いから誤りを発見
✅ モデル間の比較で偏りを可視化
✅ 用途に応じた最適モデルの選択
```

### 3. 汎用 LLM の限界

**課題:**

```
業務特化の知識不足:
- 社内用語が理解できない
- 業界特有の文脈を理解できない
- 過去の事例が参照できない
- ドメイン知識が不足
```

**Llamune の解決策:**

```
3段階の知識注入:
✅ レベル1: 追加プロンプト（手軽）
✅ レベル2: RAG（大量ドキュメント）
✅ レベル3: ファインチューニング（ドメイン特化）

→ 業務に最適化されたLLM環境を構築
```

---

## コアコンセプト

### 1. 完全クローズド環境

```
┌─────────────────────────────────┐
│    企業ネットワーク（閉域）      │
│                                 │
│  ┌───────────────────────┐      │
│  │  Llamune Server       │      │
│  │  - ollama             │      │
│  │  - LLMモデル群        │      │
│  │  - ベクトルDB         │      │
│  └───────────────────────┘      │
│           ↕                     │
│  ┌───────────────────────┐      │
│  │  ユーザーブラウザ     │      │
│  └───────────────────────┘      │
│                                 │
└─────────────────────────────────┘
         ↕ 通信量: 0 MB
      インターネット
```

### 完全クローズド環境

**重要な演出:**

- ダッシュボードに「外部通信: なし ✅」を常時表示
- データがローカル内でのみ処理されていることを視覚的に証明
- ユーザーの安心感を醸成

### 2. 2 モード構造

```
┌──────────────────────────────────────┐
│         Llamune                      │
├──────────────────────────────────────┤
│                                      │
│  [Reasoning Mode]  [ドメインモード]  │
│       ↑                ↑             │
│    全組織共通      業界特化          │
│      (MVP)       (PoC構築)           │
│                                      │
└──────────────────────────────────────┘
```

#### Reasoning Mode（共通・MVP）

**目的:**
フリーワードでの会話を通じて、問題解決や意思決定を支援

**特徴:**

- 自然な会話形式
- 複数 LLM による多角的な推論
- パラメータの柔軟な調整
- アーティファクトの時系列管理
- バックグラウンド推論

**使用例:**

```
【ユーザー】
「新規事業のアイデアを考えたい。
年間売上5億円、社員50名のIT企業です。」

【Llamune (gemma2:9b)】
現状分析から始めましょう...
[会話が続く]

【バックグラウンド】
・deepseek-r1:7b でも推論中...
・qwen2.5:14b でも推論中...
```

#### ドメインモード（業界特化）

**目的:**
特定業界・用途に最適化された専用環境

**カスタマイズ例:**

| 組織     | モード名           | 特化機能                   |
| -------- | ------------------ | -------------------------- |
| IT 企業  | コーディングモード | Modelfile 構築、コード生成 |
| 監査法人 | 監査モード         | 規程チェック、証跡管理     |
| 物販     | EC 支援モード      | 商品説明生成、FAQ 作成     |
| 法律     | リーガルモード     | 判例検索、契約書レビュー   |

**構築方法:**

1. PoC（概念実証）からスタート
2. ユーザーと共創で機能定義
3. 段階的に実装・最適化
4. 業界固有の知識を注入

### 3. 四半期ごとの最適化

```
運営による継続的改善:

2025 Q4 ──→ 2026 Q1 ──→ 2026 Q2 ──→ ...
   ↓           ↓           ↓
推奨LLM更新  推奨LLM更新  推奨LLM更新
実行順最適化  実行順最適化  実行順最適化
```

**更新内容:**

- 新しい LLM モデルの追加
- 推奨モデルの変更
- 実行順序の最適化
- パラメータプリセットの更新
- 日本語品質の向上

**データドリブンな改善:**

```
3ヶ月間のデータ収集:
├─ 使用頻度
├─ ユーザー評価
├─ タスク別成功率
├─ 推論速度
└─ メモリ効率

↓ 分析

次四半期の推奨設定を決定
```

---

## 機能要件

### MVP 機能（Reasoning Mode）

#### 1. 基本的な会話機能

**機能:**

- テキストベースの対話
- 複数ターンの会話
- 会話履歴の保存・参照
- マークダウン形式の表示

**技術要件:**

```typescript
interface Conversation {
  id: string;
  mode: "reasoning" | "domain";
  messages: Message[];
  artifacts: Artifact[];
  settings: LLMSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelName?: string;
  timestamp: Date;
}
```

#### 2. LLM 選択・実行機能

**2.1 運営推奨設定**

```typescript
interface RecommendedSettings {
  version: string; // "2025-Q4"
  quarter: string; // "2025 Q4"
  models: ModelConfig[];
  executionOrder: string[];
  concurrentLimit: number;
  updatedAt: Date;
  changelog: string;
}

interface ModelConfig {
  name: string; // "gemma2:9b"
  priority: number; // 1, 2, 3...
  purpose: string; // "メイン推論"
  parameters: {
    temperature: number;
    top_p: number;
    // ...
  };
}

// 例: 2025 Q4版
const recommendedQ4 = {
  version: "2025-Q4",
  quarter: "2025 Q4",
  models: [
    {
      name: "gemma2:9b",
      priority: 1,
      purpose: "メイン推論（高品質・高速）",
      parameters: { temperature: 0.8, top_p: 0.9 },
    },
    {
      name: "deepseek-r1:7b",
      priority: 2,
      purpose: "Reasoning特化",
      parameters: { temperature: 0.8, top_p: 0.9 },
    },
    {
      name: "qwen2.5:14b",
      priority: 3,
      purpose: "汎用・バランス型",
      parameters: { temperature: 0.8, top_p: 0.9 },
    },
  ],
  executionOrder: ["gemma2:9b", "deepseek-r1:7b", "qwen2.5:14b"],
  concurrentLimit: 2,
  updatedAt: "2025-10-01",
};
```

**動作:**

```
1. ユーザーがプロンプト送信
   ↓
2. メインLLM (priority=1) が即座に推論・回答表示
   ↓
3. バックグラウンドで設定数まで並列実行
   concurrentLimit=2 の場合:
   - priority=2 のモデルも同時実行
   - priority=3 は待機
   ↓
4. 完了したら通知
   「他のLLMからも回答が届きました」
   [表示する] [無視する]
```

**2.2 ユーザーカスタム設定**

```typescript
interface UserSettings {
  userId: string;
  useRecommended: boolean; // true: 推奨設定, false: カスタム
  customModels?: string[]; // カスタム時のモデルリスト
  concurrentLimit?: number;
  parameters?: LLMParameters;
}

// 例: カスタム設定
const userCustom = {
  userId: "user123",
  useRecommended: false,
  customModels: ["phi3.5", "gemma2:27b", "qwq:32b"],
  concurrentLimit: 3,
  parameters: {
    temperature: 0.5,
    top_p: 0.95,
  },
};
```

**優先順位:**

```
ユーザーカスタム設定 > 運営推奨設定

useRecommended = false の場合:
→ カスタム設定を使用
→ 四半期更新の影響を受けない
→ ただし「新しい推奨設定があります」通知は表示
```

**2.3 四半期更新の通知**

```typescript
interface QuarterlyUpdate {
  newVersion: string;
  oldVersion: string;
  changes: string[];
  newModels: string[];
  deprecatedModels: string[];
  performanceImprovements: string;
}

// UI表示
┌─────────────────────────────────┐
│ 🎉 新しい推奨設定 (2026 Q1)     │
├─────────────────────────────────┤
│ 主な変更:                       │
│ ✨ gemma2:27b を追加            │
│ ✨ qwq:32b (Reasoning特化)追加  │
│ 🔧 実行順序を最適化             │
│ ⚡ 推論速度 15%向上             │
│                                 │
│ カスタム設定を使用中のため、    │
│ 自動では適用されません。        │
│                                 │
│ [詳細] [今すぐ適用] [このまま] │
└─────────────────────────────────┘
```

#### 3. パラメータ調整機能

**スライダー UI（Amazon Bedrock 風）:**

```typescript
interface LLMParameters {
  temperature: number; // 0.0 - 2.0
  top_p: number; // 0.0 - 1.0
  top_k: number; // 1 - 100
  max_tokens: number; // 50 - 4096
  repeat_penalty: number; // 1.0 - 2.0
}

// プリセット
const presets = {
  code: {
    temperature: 0.2,
    top_p: 0.9,
    max_tokens: 1000,
    description: "コード生成：正確で一貫したコード",
  },
  general: {
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 500,
    description: "一般：バランスの取れた回答",
  },
  creative: {
    temperature: 1.2,
    top_p: 0.95,
    max_tokens: 2000,
    description: "創作：創造的で多様な表現",
  },
};
```

**UI コンポーネント:**

```tsx
<ParameterPanel>
  <Slider
    label="Temperature"
    min={0}
    max={2}
    step={0.1}
    value={temperature}
    hint="決定的 ←──→ 創造的"
  />

  <Slider label="Top P" min={0} max={1} step={0.05} value={topP} />

  <PresetButtons>
    <Button onClick={() => applyPreset("code")}>コード生成</Button>
    <Button onClick={() => applyPreset("general")}>一般</Button>
    <Button onClick={() => applyPreset("creative")}>創作</Button>
  </PresetButtons>
</ParameterPanel>
```

#### 4. アーティファクト機能

**概念:**
会話の中で生成された成果物（コード、ドキュメント、データ等）を時系列で管理

**データ構造:**

```typescript
interface Artifact {
  id: string;
  conversationId: string;
  type: "code" | "markdown" | "json" | "csv" | "other";
  title: string;
  content: string;
  language?: string; // code type の場合
  createdAt: Date;
  messageId: string; // 元になったメッセージ
}

// 例
const artifact: Artifact = {
  id: "art_001",
  conversationId: "conv_123",
  type: "code",
  title: "quick_sort.py",
  content: "def quick_sort(arr):\n  ...",
  language: "python",
  createdAt: new Date(),
  messageId: "msg_456",
};
```

**UI 表示:**

```
会話フロー:
┌────────────────────────┐
│ User: ソート実装して   │
└────────────────────────┘
         ↓
┌────────────────────────┐
│ AI: こちらです         │
│                        │
│ ┌──────────────────┐   │
│ │ 📄 Artifact #1   │   │ ← タイムスタンプ付き
│ │ quick_sort.py    │   │
│ │ [表示] [コピー]  │   │
│ └──────────────────┘   │
└────────────────────────┘
         ↓
┌────────────────────────┐
│ User: 高速化できる？   │
└────────────────────────┘
         ↓
┌────────────────────────┐
│ AI: Timsortで...       │
│                        │
│ ┌──────────────────┐   │
│ │ 📄 Artifact #2   │   │
│ │ optimized.py     │   │
│ │ [表示] [コピー]  │   │
│ └──────────────────┘   │
└────────────────────────┘
```

#### 5. バックグラウンド推論

**機能:**
メインの会話を妨げずに、他の LLM で同時に推論を実行

**動作フロー:**

```
[ユーザー入力]
     ↓
[メインLLM: 即座に回答]
     ↓ (表示)
[ユーザーが回答を見ている間]
     ↓
[バックグラウンド]
├─ LLM B で同じプロンプト実行
└─ LLM C で同じプロンプト実行
     ↓
[完了通知]
└─ 「他の2つのLLMからも回答があります」
```

**UI 表示:**

```
┌─────────────────────────────────┐
│ 💬 会話中                       │
│                                 │
│ [gemma2:9b の回答が表示]        │
│                                 │
├─────────────────────────────────┤
│ 🔄 バックグラウンド実行中:      │
│                                 │
│ ⏳ deepseek-r1:7b               │
│    推論中... 15秒経過           │
│                                 │
│ ⏳ qwen2.5:14b                  │
│    推論中... 18秒経過           │
│                                 │
│ [すべて中断]                    │
└─────────────────────────────────┘
```

**完了後:**

```
┌─────────────────────────────────┐
│ ✅ 他のLLMからも回答が届きました │
├─────────────────────────────────┤
│ ・deepseek-r1:7b                │
│ ・qwen2.5:14b                   │
│                                 │
│ [すべて表示] [個別に見る] [無視]│
└─────────────────────────────────┘
```

**ユーザー操作:**

- **中断:** バックグラウンド実行を停止
- **表示:** 完了した回答を見る
- **無視:** 回答を見ずに会話を続ける

#### 6. モデル切り替え

**「別の LLM で試す」機能:**

```
現在: gemma2:9b で回答中
↓
[別のLLMで試す ▼]
  ├─ deepseek-r1:7b (Reasoning)
  ├─ qwen2.5:14b (汎用)
  ├─ phi3.5 (軽量)
  └─ gemma2:27b (高性能)

選択 → 同じプロンプトで再実行
```

**実装:**

```typescript
async function retryWithDifferentModel(
  prompt: string,
  currentModel: string,
  newModel: string
) {
  // 現在の会話コンテキストを保持
  const context = getCurrentContext();

  // 新しいモデルで実行
  const response = await ollama.generate({
    model: newModel,
    prompt: prompt,
    context: context,
  });

  // 結果を比較表示
  return {
    original: { model: currentModel, response: originalResponse },
    alternative: { model: newModel, response: response },
  };
}
```

### 将来機能（Post-MVP）

#### 1. LLM 評価機能

**目的:**
LLM の回答を別の LLM に評価させ、品質を向上

**フロー:**

```
[ユーザー質問]
     ↓
[LLM A が回答]
     ↓
[LLM B が評価]
     ├─ 矛盾の指摘
     ├─ 誤りの可能性
     ├─ 不適切な表現
     └─ 改善提案
     ↓
[評価結果を表示]
     ↓
[必要なら再生成]
```

**評価プロンプト例:**

```
以下の回答を評価してください：

【質問】
{original_question}

【回答】
{llm_response}

【評価項目】
1. 事実の正確性
2. 論理の一貫性
3. 網羅性
4. 表現の適切さ
5. 具体的な改善点

各項目について、問題点と改善案を提示してください。
```

**UI 表示:**

```
┌─────────────────────────────────┐
│ [gemma2:9b の回答]              │
│ ...                             │
│                                 │
│ [評価を見る] ← クリック         │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 📊 qwen2.5:14b による評価       │
├─────────────────────────────────┤
│ ✅ 事実の正確性: 高             │
│ ⚠️  論理の一貫性: 中            │
│    → 3段落目で矛盾があります    │
│ ✅ 網羅性: 高                   │
│ ⚠️  表現: やや専門的すぎる      │
│                                 │
│ [改善版を生成] [無視]           │
└─────────────────────────────────┘
```

#### 2. Web 検索統合

**目的:**
claude.ai のように、LLM が必要に応じて最新情報を検索

**動作:**

```typescript
interface WebSearchConfig {
  enabled: boolean;
  allowedDomains: string[]; // 閉域内の許可ドメイン
  searchEngine: "internal" | "limited_external";
}

// 例: 社内イントラネット検索
const searchConfig = {
  enabled: true,
  allowedDomains: [
    "intranet.company.com",
    "docs.company.com",
    "wiki.company.com",
  ],
  searchEngine: "internal",
};
```

**フロー:**

```
[ユーザー質問]
「2025年Q3の売上実績は？」
     ↓
[LLM判断]
"最新データが必要 → 検索実行"
     ↓
[社内イントラ検索]
→ 売上レポートを発見
     ↓
[検索結果を元に回答生成]
```

**UI 表示:**

```
┌─────────────────────────────────┐
│ AI: 検索して確認します...       │
│                                 │
│ 🔍 社内イントラを検索中         │
│ → "2025 Q3 売上" で検索         │
│ → 3件のドキュメントを発見       │
│                                 │
│ 参照元:                         │
│ 📄 2025Q3売上レポート.pdf       │
│ 📄 財務サマリー_202510.xlsx     │
│                                 │
│ [結果]                          │
│ 2025年Q3の売上は...            │
└─────────────────────────────────┘
```

#### 3. 業務知識注入（RAG/ファインチューニング）

**レベル 1: 追加プロンプト**

```typescript
interface AdditionalContext {
  type: "manual";
  content: string;
  scope: "session" | "permanent";
}

// 使用例
const context: AdditionalContext = {
  type: "manual",
  content: `
    社内用語:
    - OKR: 目標と主要な結果
    - 1on1: 上司と部下の定期面談
    - Retro: ふりかえり会議
  `,
  scope: "session",
};
```

**レベル 2: RAG（Retrieval-Augmented Generation）**

```typescript
interface RAGConfig {
  type: 'rag';
  vectorDB: 'pgvector' | 'chroma';
  embeddingModel: string;
  documents: Document[];
}

interface Document {
  id: string;
  title: string;
  content: string;
  metadata: {
    department?: string;
    date?: Date;
    author?: string;
    tags?: string[];
  };
}

// 動作フロー
async function ragQuery(userQuery: string) {
  // 1. ユーザーの質問をベクトル化
  const queryVector = await embed(userQuery);

  // 2. 関連ドキュメントを検索
  const relevantDocs = await vectorDB.search(queryVector, limit: 5);

  // 3. ドキュメントをコンテキストに追加
  const context = relevantDocs.map(doc => doc.content).join('\n\n');

  // 4. LLMに渡す
  const prompt = `
    以下のドキュメントを参考に回答してください：

    ${context}

    質問：${userQuery}
  `;

  return await llm.generate(prompt);
}
```

**レベル 3: ファインチューニング**

```typescript
interface FineTuningConfig {
  type: "fine-tuning";
  baseModel: string;
  trainingData: TrainingData[];
  platform: "google-colab" | "local";
  epochs: number;
  learningRate: number;
}

interface TrainingData {
  instruction: string;
  input: string;
  output: string;
}

// 例: 会計監査特化モデル
const auditTrainingData = [
  {
    instruction: "監査手続きを説明して",
    input: "棚卸資産の実査について",
    output: "棚卸資産の実査は...",
  },
  // ... 数千件のデータ
];
```

**UI:**

```
┌─────────────────────────────────┐
│ 業務知識の注入                  │
├─────────────────────────────────┤
│ ○ レベル1: 追加プロンプト      │
│   手動で情報を追加              │
│   [テキストを入力]              │
│                                 │
│ ○ レベル2: RAG                 │
│   ドキュメントをアップロード    │
│   [ファイル選択]                │
│   対象: 📄 5件のPDF             │
│                                 │
│ ○ レベル3: ファインチューニング│
│   モデルを再学習（高度）        │
│   [Google Colabで実行]          │
│                                 │
└─────────────────────────────────┘
```

#### 4. コード生成モード（Modelfile 構築型）

**コンセプト:**
会話しながら仕様を収集 → Modelfile に蓄積 → 一発でコード生成

**フロー:**

```
【ステップ1: 要件ヒアリング】
AI: 「どんなアプリを作りますか？」
User: 「タスク管理アプリ」
AI: 「データベースは？」
User: 「Supabase」
AI: 「認証方式は？」
User: 「メール認証」
...

↓ Modelfileに蓄積

【ステップ2: Modelfile完成】
FROM codeqwen:7b
PARAMETER temperature 0.2
SYSTEM """
プロジェクト: タスク管理アプリ
技術スタック:
- Frontend: Next.js
- Backend: Supabase
- Auth: Email
スキーマ:
  users (id, email, name)
  tasks (id, user_id, title, status, due_date)

機能要件:
1. ユーザー登録・ログイン
2. タスクCRUD
3. 期限管理
...
"""

【ステップ3: 一発生成】
ollama create task-app-generator -f Modelfile
ollama run task-app-generator "すべてのコードを生成"

↓

出力:
- /app/page.tsx
- /app/tasks/page.tsx
- /lib/supabase.ts
- /components/TaskList.tsx
- supabase/migrations/001_initial.sql
...
```

**UI:**

```
┌─────────────────────────────────┐
│ コード生成モード                │
├─────────────────────────────────┤
│ 📋 収集済み情報:                │
│ ✅ アプリ種類: タスク管理       │
│ ✅ DB: Supabase                 │
│ ✅ 認証: Email                  │
│ ✅ 画面: 5画面                  │
│ ⏳ デザイン: 未定               │
│                                 │
│ [Modelfileを表示]               │
│ [情報を追加]                    │
│ [コード生成] ← 準備OK           │
└─────────────────────────────────┘
```

---

## UI/UX 設計

### 基本レイアウト（縦長）

```
┌─────────────────────────────────────┐
│ ╔═══════════════════════════════╗   │ ← ダッシュボード
│ ║ Llamune                       ║   │   (固定ヘッダー)
│ ║ Mode: Reasoning               ║   │
│ ║ 通信量: 0 MB ✅               ║   │
│ ║ アクティブLLM: 2/5            ║   │
│ ║ [設定] [ヘルプ]               ║   │
│ ╚═══════════════════════════════╝   │
├─────────────────────────────────────┤
│                                     │
│ 💬 会話エリア（スクロール可能）     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ User                            │ │
│ │ Pythonでクイックソートを実装    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ AI (gemma2:9b)                  │ │
│ │ はい、実装します...             │ │
│ │                                 │ │
│ │ ┌─────────────────────────┐     │ │
│ │ │ 📄 Artifact #1          │     │ │
│ │ │ quick_sort.py           │     │ │
│ │ │ 2025-11-08 10:30       │     │ │
│ │ │ [表示] [コピー] [DL]   │     │ │
│ │ └─────────────────────────┘     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ User                            │ │
│ │ もっと高速化できますか？        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ AI (gemma2:9b)                  │ │
│ │ Timsortを使うことで...          │ │
│ │                                 │ │
│ │ ┌─────────────────────────┐     │ │
│ │ │ 📄 Artifact #2          │     │ │
│ │ │ optimized_sort.py       │     │ │
│ │ │ 2025-11-08 10:32       │     │ │
│ │ │ [表示] [コピー] [DL]   │     │ │
│ │ └─────────────────────────┘     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔄 バックグラウンド実行中       │ │
│ │                                 │ │
│ │ ⏳ deepseek-r1:7b              │ │
│ │    推論中... 25秒               │ │
│ │                                 │ │
│ │ ⏳ qwen2.5:14b                 │ │
│ │    推論中... 28秒               │ │
│ │                                 │ │
│ │ [すべて中断]                    │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ 📝 入力エリア（固定フッター）       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ メッセージを入力...             │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [送信] [⚙️パラメータ] [🔄別のLLM] │
│                                     │
└─────────────────────────────────────┘
```

### ダッシュボード詳細

```
╔═══════════════════════════════════════════╗
║ 🔷 Llamune                                ║
╠═══════════════════════════════════════════╣
║ モード: [Reasoning ▼] [コーディング]    ║
║                                           ║
║ 💾 通信量: 0 MB ✅                        ║
║    ↑                                      ║
║    クローズド環境を視覚的に証明           ║
║                                           ║
║ 🤖 アクティブLLM: 2/5                     ║
║    ・gemma2:9b (メイン)                   ║
║    ・deepseek-r1:7b (バックグラウンド)    ║
║                                           ║
║ ⚙️ [LLM設定] [パラメータ] [ヘルプ]       ║
╚═══════════════════════════════════════════╝
```

**通信量ゼロの演出:**

```typescript
// リアルタイム更新（常にゼロ）
<NetworkUsage>
  <Icon>✅</Icon>
  <Label>通信量:</Label>
  <Value animate={true}>0 MB</Value>
  <Tooltip>
    すべての処理はローカルで実行されています。
    データは外部に送信されていません。
  </Tooltip>
</NetworkUsage>
```

### LLM 設定画面

```
┌───────────────────────────────────────────┐
│ LLM設定                                   │
├───────────────────────────────────────────┤
│                                           │
│ ◉ 運営推奨設定 (2025 Q4版)                │
│                                           │
│   日本のビジネスに最適化された            │
│   LLMの組み合わせです                     │
│                                           │
│   📊 推奨LLM:                             │
│   ┌─────────────────────────────────────┐ │
│   │ 1️⃣ gemma2:9b                        │ │
│   │    目的: メイン推論                  │ │
│   │    特徴: 高品質・高速                │ │
│   ├─────────────────────────────────────┤ │
│   │ 2️⃣ deepseek-r1:7b                   │ │
│   │    目的: Reasoning特化               │ │
│   │    特徴: 思考プロセス可視化          │ │
│   ├─────────────────────────────────────┤ │
│   │ 3️⃣ qwen2.5:14b                      │ │
│   │    目的: 汎用・バランス              │ │
│   │    特徴: 幅広いタスクに対応          │ │
│   └─────────────────────────────────────┘ │
│                                           │
│   ⚙️ 実行設定:                            │
│   同時実行数:                             │
│   [1] [2] [3] [4] [5]                    │
│        └●┘                                │
│                                           │
│   実行順序:                               │
│   メイン → Reasoning → 汎用              │
│                                           │
│   💡 ヒント:                              │
│   同時実行数を増やすと、複数の視点から    │
│   回答を得られますが、メモリを多く消費    │
│   します。2-3が推奨です。                 │
│                                           │
│   [詳細を見る]                            │
│                                           │
├───────────────────────────────────────────┤
│ ○ カスタム設定                            │
│   [自分で選択する]                        │
│                                           │
│   利用可能なLLM（ローカルにインストール済み）│
│   ┌─────────────────────────────────────┐ │
│   │ ☑ gemma2:9b         5.4GB          │ │
│   │ ☑ gemma2:27b        16GB  (推奨32GB)│ │
│   │ □ qwen2.5:14b       8.5GB          │ │
│   │ ☑ deepseek-r1:7b    4.7GB          │ │
│   │ □ phi3.5            2.2GB          │ │
│   │ □ qwq:32b           19GB  (要32GB) │ │
│   └─────────────────────────────────────┘ │
│                                           │
│   [新しいLLMをインストール]               │
│                                           │
│   同時実行数: [3]                         │
│                                           │
│   [カスタム設定を保存]                    │
│                                           │
└───────────────────────────────────────────┘
```

### パラメータ調整画面

```
┌─────────────────────────────────────────┐
│ パラメータ設定                          │
├─────────────────────────────────────────┤
│                                         │
│ Temperature                             │
│ ━━━━━━━━●━━━━ 0.8                      │
│ 決定的 ←─────→ 創造的                  │
│                                         │
│ 💡 現在の設定:                          │
│    バランスの取れた回答                 │
│    一般的な会話に最適                   │
│                                         │
├─────────────────────────────────────────┤
│ Top P                                   │
│ ━━━━━━━━━━●━ 0.9                       │
│                                         │
│ 💡 累積確率90%までの候補から選択        │
│                                         │
├─────────────────────────────────────────┤
│ Max Tokens                              │
│ ━━━━━●━━━━━━ 500                       │
│ 50 ←─────────→ 4096                    │
│                                         │
│ 💡 約400単語程度の回答                  │
│                                         │
├─────────────────────────────────────────┤
│ プリセット（よく使う設定）:             │
│                                         │
│ ┌────────────┐ ┌────────────┐          │
│ │コード生成  │ │   一般     │          │
│ │temp: 0.2   │ │ temp: 0.7  │          │
│ │正確・一貫  │ │ バランス   │          │
│ └────────────┘ └────────────┘          │
│                                         │
│ ┌────────────┐ ┌────────────┐          │
│ │   創作     │ │技術文書    │          │
│ │temp: 1.2   │ │ temp: 0.5  │          │
│ │創造的・多様│ │ 正確・専門 │          │
│ └────────────┘ └────────────┘          │
│                                         │
├─────────────────────────────────────────┤
│ [デフォルトに戻す] [保存]               │
│                                         │
└─────────────────────────────────────────┘
```

### モバイル対応

```
スマートフォン縦持ち:

┌─────────────────┐
│ ╔═════════════╗ │
│ ║ Llamune     ║ │
│ ║ 通信量: 0MB ║ │
│ ║ [☰]         ║ │
│ ╚═════════════╝ │
├─────────────────┤
│                 │
│ 💬 会話         │
│                 │
│ User: ...       │
│                 │
│ AI: ...         │
│ [Artifact]      │
│                 │
│ User: ...       │
│                 │
├─────────────────┤
│ 📝 [入力欄]     │
│                 │
│ [送信] [⚙]     │
└─────────────────┘
```

---

## 技術アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────┐
│                  ユーザー                        │
│              (ブラウザ / アプリ)                 │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────┐
│         フロントエンド (Next.js)                 │
│  ┌─────────────────────────────────────────┐    │
│  │ - React コンポーネント                  │    │
│  │ - Tailwind CSS                          │    │
│  │ - Zustand (状態管理)                    │    │
│  │ - リアルタイム通信 (WebSocket)          │    │
│  └─────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────┘
                    │ REST API / WebSocket
┌───────────────────▼─────────────────────────────┐
│       バックエンド (Deno / Supabase)             │
│  ┌─────────────────────────────────────────┐    │
│  │ Edge Functions (Deno)                   │    │
│  │ - /api/chat                             │    │
│  │ - /api/llm/execute                      │    │
│  │ - /api/artifacts                        │    │
│  └───────────┬─────────────────────────────┘    │
│              │                                   │
│  ┌───────────▼─────────────────────────────┐    │
│  │ Supabase PostgreSQL                     │    │
│  │ - conversations                         │    │
│  │ - messages                              │    │
│  │ - artifacts                             │    │
│  │ - user_settings                         │    │
│  │ - pgvector (RAG用)                      │    │
│  └─────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│          LLMエンジン層 (ollama)                  │
│  ┌─────────────────────────────────────────┐    │
│  │ ollama サーバー                         │    │
│  │ - モデル管理                            │    │
│  │ - 推論実行                              │    │
│  │ - コンテキスト管理                      │    │
│  └───────────┬─────────────────────────────┘    │
│              │                                   │
│  ┌───────────▼─────────────────────────────┐    │
│  │ ローカルLLMモデル                       │    │
│  │ - gemma2:9b                             │    │
│  │ - gemma2:27b                            │    │
│  │ - deepseek-r1:7b                        │    │
│  │ - qwen2.5:14b                           │    │
│  │ - phi3.5                                │    │
│  │ - (その他)                              │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### データベーススキーマ

```sql
-- ユーザー（Supabase Authが管理）
-- users テーブルは自動生成

-- 会話
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL, -- 'reasoning', 'coding', etc.
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メッセージ
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  model_name VARCHAR(100), -- 'gemma2:9b', etc.
  parameters JSONB, -- LLMパラメータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- アーティファクト
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'code', 'markdown', etc.
  title VARCHAR(255),
  content TEXT NOT NULL,
  language VARCHAR(50), -- code typeの場合
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザー設定
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  use_recommended BOOLEAN DEFAULT true,
  custom_models JSONB, -- ["gemma2:9b", "phi3.5"]
  concurrent_limit INTEGER DEFAULT 2,
  default_parameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 運営推奨設定（履歴）
CREATE TABLE recommended_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL, -- '2025-Q4'
  quarter VARCHAR(20) NOT NULL,
  settings JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAG用: ベクトル検索
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536), -- OpenAI ada-002の次元数
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ベクトル検索用インデックス
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

### API 設計

#### エンドポイント一覧

```typescript
// チャット
POST   /api/chat              // メッセージ送信
GET    /api/conversations     // 会話一覧取得
GET    /api/conversations/:id // 会話詳細取得
DELETE /api/conversations/:id // 会話削除

// LLM実行
POST   /api/llm/execute       // LLM実行
POST   /api/llm/execute-batch // バッチ実行（複数LLM）
POST   /api/llm/cancel        // 実行キャンセル

// アーティファクト
GET    /api/artifacts/:id     // アーティファクト取得
POST   /api/artifacts         // アーティファクト作成

// 設定
GET    /api/settings          // ユーザー設定取得
PUT    /api/settings          // ユーザー設定更新
GET    /api/settings/recommended // 運営推奨設定取得

// RAG
POST   /api/documents         // ドキュメントアップロード
POST   /api/documents/search  // ベクトル検索
```

#### 詳細仕様

**POST /api/chat**

```typescript
// リクエスト
interface ChatRequest {
  conversationId?: string; // 新規ならnull
  message: string;
  modelName?: string; // 指定なければ推奨設定
  parameters?: LLMParameters;
  backgroundModels?: string[]; // バックグラウンド実行
}

// レスポンス
interface ChatResponse {
  conversationId: string;
  messageId: string;
  response: string;
  artifacts?: Artifact[];
  backgroundJobs?: BackgroundJob[];
}

interface BackgroundJob {
  id: string;
  modelName: string;
  status: "pending" | "running" | "completed" | "failed";
  estimatedTime?: number;
}
```

**POST /api/llm/execute**

```typescript
// リクエスト
interface LLMExecuteRequest {
  model: string;
  prompt: string;
  parameters: LLMParameters;
  context?: string[]; // 会話コンテキスト
}

// レスポンス
interface LLMExecuteResponse {
  response: string;
  executionTime: number; // ms
  tokensUsed: number;
  modelInfo: {
    name: string;
    version: string;
    size: string;
  };
}
```

**POST /api/llm/execute-batch**

```typescript
// リクエスト
interface BatchExecuteRequest {
  models: string[]; // ["gemma2:9b", "qwen2.5:14b"]
  prompt: string;
  parameters: LLMParameters;
  concurrent: number; // 同時実行数
}

// レスポンス (WebSocket)
interface BatchExecuteResponse {
  jobId: string;
  results: {
    [modelName: string]: {
      status: "pending" | "running" | "completed" | "failed";
      response?: string;
      executionTime?: number;
      error?: string;
    };
  };
}
```

### WebSocket 通信（リアルタイム）

```typescript
// 接続
const ws = new WebSocket("wss://llamune.com/ws/chat");

// イベント
interface WSMessage {
  type: "chat" | "background-complete" | "error" | "status";
  data: any;
}

// 例: バックグラウンド完了通知
ws.send({
  type: "background-complete",
  data: {
    jobId: "job_123",
    modelName: "deepseek-r1:7b",
    response: "...",
    executionTime: 25000,
  },
});
```

### セキュリティ

```typescript
// Row Level Security (RLS)
-- 各ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can only access their own data"
ON conversations
FOR ALL
USING (auth.uid() = user_id);

// 認証
- Supabase Auth (Email/Password)
- セッション管理
- JWTトークン

// 通信
- HTTPS必須
- WebSocket over TLS
- CORS設定（閉域内のみ）
```

---

## 開発ロードマップ

### フェーズ 0: 準備（完了）

**期間:** 2025-11-01 ~ 2025-11-08

**成果物:**

- ✅ ドメイン取得 (llamune.com)
- ✅ GitHub リポジトリ作成
- ✅ LLM テスト完了（4 モデル）
- ✅ ドキュメント作成
  - ollama-operations.md
  - reasoning-test-\*.md
  - llm-files-and-finetuning.md
  - llm-parameters-testing-guide.md
  - llamune-service-specification.md

**環境:**

- M1 Mac 16GB（テスト環境）
- MacBook Air M4 32GB 発注済み（本番開発環境）

### フェーズ 1: MVP 開発（Reasoning Mode）

**期間:** 2025-11-11 ~ 2025-12-31（7 週間）

**Week 1-2: 基盤構築**

```
□ Supabase プロジェクト作成
□ Next.js プロジェクトセットアップ
□ データベーススキーマ実装
□ 認証機能実装
□ ollama連携API実装
```

**Week 3-4: コア機能**

```
□ 会話UI実装
□ LLM実行機能
□ メッセージ送受信
□ 会話履歴管理
□ レスポンシブ対応
```

**Week 5-6: 拡張機能**

```
□ パラメータ調整UI
□ アーティファクト機能
□ 運営推奨設定機能
□ LLM選択・切り替え
□ バックグラウンド実行
```

**Week 7: テスト・調整**

```
□ 動作テスト
□ パフォーマンスチューニング
□ UI/UX改善
□ ドキュメント整備
□ MVP リリース
```

**成果物:**

- Reasoning Mode 稼働
- 基本的な LLM 比較機能
- ダッシュボード（通信量ゼロ表示）

### フェーズ 2: 社内展開（2026 Q1）

**期間:** 2026-01-01 ~ 2026-03-31

**目標:**
自社での実運用開始、フィードバック収集

**タスク:**

```
□ 社内環境にデプロイ
□ チームメンバーへのトレーニング
□ 実業務での活用開始
□ フィードバック収集・分析
□ 改善実施
□ 運営推奨設定の最適化（2026 Q1版作成）
```

**KPI:**

- アクティブユーザー: 10 名
- 会話数: 500 回
- ユーザー満足度: 4.0/5.0

### フェーズ 3: 高度な機能（2026 Q2-Q3）

**期間:** 2026-04-01 ~ 2026-09-30

**機能追加:**

```
□ LLM評価機能
□ RAG機能（レベル2）
□ Web検索統合
□ コード生成モード（基本版）
□ パフォーマンス最適化
□ 運営推奨設定 2026 Q2版
□ 運営推奨設定 2026 Q3版
```

**目標:**
本格的な業務活用、生産性向上の実証

### フェーズ 4: ドメイン特化（2026 Q4~）

**期間:** 2026-10-01 ~

**PoC 開始:**

```
□ 外部企業とのPoC（1-2社）
□ ドメイン特化モードの構築
  - 会計監査モード（監査法人）
  - EC支援モード（物販）
  - など
□ カスタマイズ機能の実装
□ ファインチューニング機能
```

**目標:**

- 他社での導入事例創出
- ドメイン特化の有効性実証
- ビジネスモデルの確立

### フェーズ 5: スケール（2027~）

**展開:**

- 複数業界での導入
- SaaS 化検討
- エンタープライズ機能追加
- パートナープログラム

---

## 運営戦略

### 四半期更新サイクル

```
┌──────────────────────────────────────┐
│        3ヶ月サイクル                 │
├──────────────────────────────────────┤
│ Month 1-2: データ収集・分析          │
│  ├─ 使用統計                         │
│  ├─ ユーザーフィードバック           │
│  ├─ 新モデル評価                     │
│  └─ ベンチマーク実行                 │
│                                      │
│ Month 3: 次四半期準備                │
│  ├─ 推奨設定策定                     │
│  ├─ テスト実施                       │
│  ├─ ドキュメント作成                 │
│  └─ リリース準備                     │
│                                      │
│ Quarter Start: 配信                  │
│  └─ 全ユーザーに通知                 │
└──────────────────────────────────────┘
```

### データ収集項目

```typescript
interface UsageMetrics {
  modelUsage: {
    [modelName: string]: {
      count: number;
      averageExecutionTime: number;
      successRate: number;
      userRating: number;
    };
  };

  taskPerformance: {
    coding: ModelPerformance[];
    reasoning: ModelPerformance[];
    documentation: ModelPerformance[];
    // ...
  };

  userFeedback: {
    thumbsUp: number;
    thumbsDown: number;
    comments: string[];
  };
}
```

### 品質評価基準

**自動評価:**

- 推論速度
- メモリ使用量
- エラー率

**人間評価:**

- 回答の正確性（5 段階）
- 日本語の自然さ（5 段階）
- 有用性（5 段階）

**ベンチマーク:**

- JGLUE（日本語理解）
- JSQuAD（質問応答）
- 独自の業務タスク

### コミュニティ構築

**フィードバックループ:**

```
ユーザー → フィードバック → 分析 → 改善 → リリース → ユーザー
```

**情報発信:**

- 四半期レポート
- モデル比較記事
- ベストプラクティス共有
- ユースケース紹介

---

## まとめ

### Llamune の価値

1. **セキュリティ:** 完全クローズド環境での運用
2. **品質:** 複数 LLM による多角的な検証
3. **カスタマイズ:** 業務に特化した環境構築
4. **進化:** 四半期ごとの継続的な最適化

### 次のステップ

**即座に:**

- MacBook Air M4 32GB 受取（3 日後）
- gemma2:27b パラメータテスト実行

**1-2 週間:**

- MVP 開発開始
- Supabase 環境構築

**1-2 ヶ月:**

- Reasoning Mode MVP 完成
- 社内での試験運用開始

**3 ヶ月:**

- 本格運用
- フィードバック収集

**6 ヶ月:**

- 拡張機能追加
- 外部 PoC 開始

---

**最終更新:** 2025-11-11
**作成者:** mop & Claude Sonnet 4.5
**バージョン:** 1.0  
**次回レビュー:** MVP 完成時
