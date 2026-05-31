# ラムネクラブ 運用ガイド

ラムネクラブは llamune を外部ユーザーに試用してもらうための限定公開環境です。
5プロジェクトを曜日で時分割して運用します。

## 構成

| プロジェクト | サブドメイン | バックエンドポート | DBポート | 曜日（目安） |
|---|---|---|---|---|
| bb | bb.llamune.com | 8001 | 5435 | 月曜 |
| c3 | c3.llamune.com | 8002 | 5436 | 火曜 |
| ds | ds.llamune.com | 8003 | 5437 | 水曜 |
| ew | ew.llamune.com | 8004 | 5438 | 木曜 |
| r2 | r2.llamune.com | 8005 | 5439 | 金曜 |

## 認証フロー

アクセス時は2段階の認証が必要です。

1. **Cloudflare Access**：メールアドレスにワンタイムPINを送信
2. **llamune ログイン**：ID / パスワードでアプリにログイン

## 起動手順

### 1. Cloudflare Tunnel の起動

```bash
cloudflared tunnel --config ~/.cloudflared/llamune-rag.yml run
```

別ターミナルで起動したままにしてください。

### 2. データベースの起動

```bash
cd ~/dev/llamune
docker compose up -d
```

### 3. バックエンドの起動（プロジェクトごとに1つずつ）

各プロジェクトはディレクトリを共有し、ポートと環境変数（DBポート）だけ変えて起動します。

**bb（ポート 8001）：**

```bash
cd ~/dev/llamune/back
source .venv/bin/activate
DATABASE_URL=postgresql://llmn:llmn@localhost:5435/llmndb uvicorn app.main:app --port 8001
```

**c3（ポート 8002）：**

```bash
DATABASE_URL=postgresql://llmn:llmn@localhost:5435/llmndb uvicorn app.main:app --port 8002
```

**ds（ポート 8003）：**

```bash
DATABASE_URL=postgresql://llmn:llmn@localhost:5436/llmndb uvicorn app.main:app --port 8003
```

**ew（ポート 8004）：**

```bash
DATABASE_URL=postgresql://llmn:llmn@localhost:5437/llmndb uvicorn app.main:app --port 8004
```

**r2（ポート 8005）：**

```bash
DATABASE_URL=postgresql://llmn:llmn@localhost:5438/llmndb uvicorn app.main:app --port 8005
```

> 💡 プロジェクトの切り替え時は、前のバックエンドを `Ctrl+C` で停止してから次を起動してください。MLXモデルのメモリ解放のため、同時起動は避けてください。

## 停止手順

### バックエンドの停止

各ターミナルで `Ctrl+C`

### Cloudflare Tunnel の停止

cloudflared のターミナルで `Ctrl+C`

### データベースの停止

```bash
cd ~/dev/llamune
docker compose down
```

## 通常の llamune（開発用・ポート 8000）の起動

ラムネクラブとは別に、開発用として通常の llamune を起動する場合：

```bash
cd ~/dev/llamune/back
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

ブラウザで http://localhost:8000 にアクセスします（外部公開なし）。

## ユーザー管理

各プロジェクトのユーザーは、対応するDBに対して作成します。

**例：bbプロジェクトにユーザーを作成する場合：**

```bash
cd ~/dev/llamune/back
source .venv/bin/activate
DATABASE_URL=postgresql://llmn:llmn@localhost:5435/llmndb python create_user.py <username> <password>
```

## Cloudflare Access のユーザー管理

各サブドメインへのアクセス許可は Cloudflare ダッシュボードで管理します。

1. https://dash.cloudflare.com → llamune.com → Access → アプリケーション
2. 対象アプリケーション（例：`c3`）を選択
3. ポリシー `allow-email` を編集してメールアドレスを追加・削除

## Cloudflare Tunnel 設定ファイル

`~/.cloudflared/llamune-rag.yml`

```yaml
tunnel: <your-tunnel-id>
credentials-file: ~/.cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: bb.llamune.com
    service: http://localhost:8001
  - hostname: c3.llamune.com
    service: http://localhost:8002
  - hostname: ds.llamune.com
    service: http://localhost:8003
  - hostname: ew.llamune.com
    service: http://localhost:8004
  - hostname: r2.llamune.com
    service: http://localhost:8005
  - service: http_status:404
```
