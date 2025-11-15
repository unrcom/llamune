# Llamune (ラムネ/ラミューン)

クローズドネットワーク環境で複数のローカル LLM を比較・活用するプラットフォーム

[![Status](https://img.shields.io/badge/status-in%20development-yellow)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## 🎯 概要

Llamune は、機密情報を外部に送信せず、複数のローカル LLM を活用できるプラットフォームです。

### 解決する 3 つの課題

1. **機密情報の保護**: 完全クローズド環境でデータを外部に送信しない
2. **LLM の偏りの発見**: 複数モデルで推論し、誤りや偏りに気づく
3. **業務への特化**: RAG/ファインチューニングでドメイン知識を注入

## ✨ 主要機能

- 🔒 **完全クローズド**: 外部通信ゼロ、データは完全にローカル
- 🤖 **複数 LLM 対応**: gemma2, deepseek-r1, qwen2.5, phi3.5 など
- 🔄 **バックグラウンド推論**: メイン会話を妨げず並列実行
- 📊 **四半期更新**: 日本のビジネスに最適化された推奨設定
- 🎨 **2 モード構造**: Reasoning モード + ドメイン特化モード

## 🛠️ 技術スタック

### Phase 1: CLI 版（MVP）

- **ランタイム**: Node.js 18+
- **言語**: TypeScript
- **UI**: ink (React for CLI)
- **データベース**: better-sqlite3 (SQLite)
- **LLM Engine**: ollama
- **ビルド**: TypeScript Compiler

### Phase 2: ハイブリッド版（将来）

- **CLI**: 上記を継続
- **Web**: Next.js 14
  - Frontend: React, TypeScript, Tailwind CSS
  - Backend: Supabase (PostgreSQL, Auth)
  - LLM Engine: ollama (サーバーサイド)
  - Vector DB: pgvector (RAG 用)

## 📖 ユースケース

Llamune は様々な業務シーンで活用できます：

- 💻 [**安全な Vibe Coding**](./docs/vibe-coding-with-llamune.md) - 複数 LLM でコード生成・比較し、セキュリティと品質を向上
- 🤔 **意思決定支援** - 複数の視点から分析（準備中）
- 📝 **ドキュメント作成** - 多角的なレビュー（準備中）
- 🏢 **業界特化モード** - 会計監査、法律、医療など（準備中）

## 📚 ドキュメント

### サービス仕様・設計

- [**CLI 版 仕様書**](./docs/llamune-cli-specification.md) - ⭐ Phase 1 実装仕様
- [サービス仕様書](./docs/llamune-service-specification.md) - プロジェクト全体のビジョン（Web 版前提）
- [パラメータテストガイド](./docs/llm-parameters-testing-guide.md) - 7 つのパラメータ
- [LLM ファイルとファインチューニング](./docs/llm-files-and-finetuning.md)
- [Ollama 操作マニュアル](./docs/ollama-operations.md)

### モデルテスト結果

| モデル         | パラメータ数 | 思考プロセス | 推論速度 | 品質   | レポート                                        |
| -------------- | ------------ | ------------ | -------- | ------ | ----------------------------------------------- |
| gemma2:9b      | 9.2B         | ❌           | 52 秒    | 最高   | [詳細](./docs/reasoning-test-gemma2-9b.md)      |
| deepseek-r1:7b | 7.0B         | ✅           | 78 秒    | 不安定 | [詳細](./docs/reasoning-test-deepseek-r1-7b.md) |
| qwen2.5:14b    | 14.0B        | ❌           | 70 秒    | 高     | [詳細](./docs/reasoning-test-qwen2-5.md)        |
| phi3.5         | 3.8B         | ❌           | 91 秒    | 限定的 | [詳細](./docs/reasoning-test-phi3-5.md)         |

_推論速度は 16GB M1 Mac での複雑な Reasoning タスクでの実測値_

## 🚀 現在の状況

**フェーズ**: 準備完了 → CLI 版 MVP 開発開始予定

### 完了

- ✅ ドメイン取得 (llamune.com)
- ✅ 4 つの LLM モデルテスト完了
- ✅ サービス仕様書作成
- ✅ 技術ドキュメント整備
- ✅ パラメータテストガイド作成
- ✅ 技術選定完了（Node.js + ink）

### 次のステップ

- 🔜 MacBook Air M4 32GB 導入（2025-11-11 受取予定）
- 🔜 npm 配布と ink の実験
- 🔜 CLI 版 MVP 開発開始
- 🔜 プロジェクト初期セットアップ

## 💻 開発環境

### 必要な環境

- **ハードウェア**: Apple Silicon Mac (M1 以降)、16GB RAM 以上推奨
- **OS**: macOS 14.0 以降
- **Node.js**: 18.x 以降
- **ollama**: 最新版（Llamune が自動起動）

### インストール（ユーザー向け）

```bash
# 1. Node.jsがインストール済みであることを確認
node --version

# 2. ollamaをインストール
brew install ollama  # macOS
# または https://ollama.com からダウンロード

# 3. モデルをダウンロード
ollama pull gemma2:9b
ollama pull deepseek-r1:7b
ollama pull qwen2.5:14b

# 4. Llamuneをインストール
npm install -g llamune

# 5. 実行
llamune
```

> **注**: `ollama serve` を実行する必要はありません。  
> Llamune が必要に応じて自動的に ollama を起動します。

### 開発セットアップ（コントリビューター向け）

```bash
# リポジトリクローン
git clone https://github.com/unrcom/llamune.git
cd llamune

# 依存関係インストール
npm install

# 開発モードで実行
npm run dev
```

## 🗓️ ロードマップ

| フェーズ      | 期間              | 内容                         | 状況        |
| ------------- | ----------------- | ---------------------------- | ----------- |
| **Phase 0**   | 2025-11           | 準備・調査・ドキュメント作成 | ✅ 完了     |
| **Phase 1**   | 2025-12 ~ 2026-01 | CLI 版 MVP 開発              | 🔜 開始予定 |
| **Phase 1.5** | 2026-01 ~ 2026-02 | 社内運用・フィードバック     | 📋 計画中   |
| **Phase 2**   | 2026-02 ~ 2026-03 | CLI 版 MVP の機能拡張        | 📋 計画中   |
| **Phase 3**   | 2026 Q4~          | ドメイン特化・PoC            | 📋 計画中   |

### Phase 1 詳細（CLI 版 MVP - 7 週間）

```
Week 1-2: 基盤構築
  - Node.js + TypeScript セットアップ
  - ink による CLI UI
  - ollama 連携
  - SQLite データベース

Week 3-4: コア機能
  - 複数LLM実行
  - 会話履歴管理
  - 結果比較表示
  - パラメータ調整

Week 5-6: 完成度向上
  - エラーハンドリング
  - 設定管理
  - ドキュメント
  - テスト

Week 7: リリース準備
  - npm公開準備
  - README整備
  - 社内テスト

成果物: llamune@0.1.0 (CLI版)
```

## 🎨 デザインコンセプト

- **縦長レイアウト**: 会話の流れを重視
- **ダッシュボード**: 「外部通信: なし ✅」を常時表示
- **アーティファクト**: 時系列で成果物を管理
- **ダークモード**: デフォルトで目に優しい

## 🔐 セキュリティ

- 完全クローズドネットワーク環境
- データは一切外部に送信されない

## 🤝 コントリビューション

現在は開発初期段階のため、外部からのコントリビューションは受け付けておりません。

## 📝 ライセンス

MIT License

## 📧 お問い合わせ

- **Web**: [llamune.com](https://llamune.com)
- **GitHub**: [github.com/unrcom/llamune](https://github.com/unrcom/llamune)

## 🙏 謝辞

このプロジェクトは以下の素晴らしいオープンソースプロジェクトを活用しています：

- [ollama](https://github.com/ollama/ollama) - ローカル LLM 実行環境
- [Supabase](https://supabase.com) - バックエンドプラットフォーム
- [Next.js](https://nextjs.org) - React フレームワーク
- Google Gemma, DeepSeek, Qwen, Phi - LLM モデル

---

**初版作成**: 2025-11-11  
**作成者**: mop
**バージョン**: 1.0.0
