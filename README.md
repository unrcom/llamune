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

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Deno, Supabase (PostgreSQL, Auth, Edge Functions)
- **LLM Engine**: ollama
- **Vector DB**: pgvector (RAG 用)

## 📚 ドキュメント

### サービス仕様・設計

- [サービス仕様書](./docs/llamune-service-specification.md) - 包括的な仕様
- [パラメータテストガイド](./docs/llm-parameters-testing-guide.md) - 7 つのパラメータ
- [LLM ファイルとファインチューニング](./docs/llm-files-and-finetuning.md)
- [Ollama 操作マニュアル](./docs/ollama-operations.md)

### モデルテスト結果

| モデル         | パラメータ数 | 思考プロセス | 推論速度 | 品質   | レポート                                        |
| -------------- | ------------ | ------------ | -------- | ------ | ----------------------------------------------- |
| gemma2:9b      | 9.2B         | ❌           | 52 秒    | 最高   | [詳細](./docs/reasoning-test-gemma2-9b.md)      |
| deepseek-r1:7b | 7.0B         | ✅           | 78 秒    | 不安定 | [詳細](./docs/reasoning-test-deepseek-r1-7b.md) |
| qwen2.5:14b    | 14.0B        | ❌           | 70 秒    | 高     | [詳細](./docs/reasoning-test-qwen2-5.md)        |
| phi3.5         | 3.8B         | ❌           | 91 秒    | 高     | [詳細](./docs/reasoning-test-phi3-5.md)         |

_推論速度は 16GB M1 Mac での複雑な Reasoning タスクでの実測値_

## 🚀 現在の状況

**フェーズ**: 準備完了 → MVP 開発開始予定

### 完了

- ✅ ドメイン取得 (llamune.com)
- ✅ 4 つの LLM モデルテスト完了
- ✅ サービス仕様書作成
- ✅ 技術ドキュメント整備
- ✅ パラメータテストガイド作成

### 次のステップ

- 🔜 MacBook Air M4 32GB 導入（2025-11-11 受取予定）
- 🔜 gemma2:27b パラメータテスト実施
- 🔜 MVP 開発開始（Reasoning Mode）
- 🔜 Supabase 環境構築

## 💻 開発環境

### 必要な環境

- **ハードウェア**: Apple Silicon Mac (M1 以降)、32GB RAM 推奨
- **OS**: macOS 14.0 以降
- **Node.js**: 18.x 以降
- **Deno**: 1.40 以降
- **ollama**: 最新版

### セットアップ

（現在開発中のため、後日追加予定）

```bash
# 準備中
```

## 🗓️ ロードマップ

| フェーズ    | 期間              | 内容                            | 状況        |
| ----------- | ----------------- | ------------------------------- | ----------- |
| **Phase 0** | 2025-11           | 準備・調査・ドキュメント作成    | ✅ 完了     |
| **Phase 1** | 2025-12 ~ 2026-01 | MVP 開発（Reasoning Mode）      | 🔜 開始予定 |
| **Phase 2** | 2026 Q1           | 社内展開・実運用開始            | 📋 計画中   |
| **Phase 3** | 2026 Q2-Q3        | 高度な機能追加（LLM 評価、RAG） | 📋 計画中   |
| **Phase 4** | 2026 Q4~          | ドメイン特化・PoC               | 📋 計画中   |
| **Phase 5** | 2027~             | スケール・SaaS 化検討           | 📋 計画中   |

### Phase 1 詳細（7 週間）

```
Week 1-2: 基盤構築
  - Supabase プロジェクト作成
  - Next.js セットアップ
  - データベーススキーマ実装
  - 認証機能

Week 3-4: コア機能
  - 会話UI実装
  - LLM実行機能
  - メッセージ送受信
  - レスポンシブ対応

Week 5-6: 拡張機能
  - パラメータ調整UI
  - アーティファクト機能
  - 運営推奨設定
  - バックグラウンド実行

Week 7: テスト・調整
  - 動作テスト
  - パフォーマンスチューニング
  - MVP リリース
```

## 🎨 デザインコンセプト

- **縦長レイアウト**: 会話の流れを重視
- **ダッシュボード**: 「外部通信: なし ✅」を常時表示
- **アーティファクト**: 時系列で成果物を管理
- **ダークモード**: デフォルトで目に優しい

## 🔐 セキュリティ

- 完全クローズドネットワーク環境
- データは一切外部に送信されない
- Supabase Row Level Security (RLS)
- HTTPS/WebSocket over TLS

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

**最終更新**: 2025-11-11  
**作成者**: mop & Claude Sonnet 4.5  
**バージョン**: 0.1.0
