# llamune

閉域LLMを使ったハイブリッド検索システム。

## システム構成

- **バックエンド**: FastAPI（port 8000）
- **フロントエンド**: React/Vite（nginx経由、port 80）
- **Embedding**: BAAI/bge-m3
- **LLM**: mlx-community/Qwen2.5-7B-Instruct-4bit
- **VectorDB**: ChromaDB

## 起動手順

    pm2 start llamune-back
    nginx
    pm2 list

## 停止手順

    pm2 stop llamune-back
    nginx -s stop

## 再起動手順

    pm2 restart llamune-back
    nginx -s reload

## アクセス

| 環境 | URL |
|---|---|
| Mac mini本体 | http://localhost |
| 同一ネットワーク | http://192.168.x.x |
| Tailscale経由 | http://100.85.2.86 |

## APIキー

.env ファイルで管理（要エンジニア）。

| ユーザー | キー |
|---|---|
| admin | key-llamune-admin |
| demo | key-llamune-demo |

## ディレクトリ構成

    llamune/
    ├── back/
    │   ├── app/
    │   │   ├── main.py           FastAPIエントリーポイント
    │   │   ├── rag.py            RAGコアロジック
    │   │   ├── auth.py           APIキー認証
    │   │   ├── dataset.py        データセット管理
    │   │   ├── prompt_manager.py プロンプト管理
    │   │   └── dummy_data.py     病院・薬局ダミーデータ
    │   ├── prompts/              プロンプトテキストファイル
    │   ├── chroma_db_drug/       ChromaDB（gitignore）
    │   ├── .env                  APIキー設定（gitignore）
    │   ├── requirements.txt
    │   └── start.sh
    ├── web/
    │   ├── src/
    │   │   ├── App.tsx           メインアプリ
    │   │   ├── DatasetPage.tsx   データセット管理画面
    │   │   ├── PromptPage.tsx    プロンプト管理画面
    │   │   └── api.ts            APIクライアント
    │   └── dist/                 ビルド成果物（gitignore）
    └── nginx/
        └── llamune.conf          nginx設定
