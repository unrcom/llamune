# llamune セットアップ手順

このドキュメントでは、llamune を新しい macOS 環境にゼロからセットアップする手順を説明します。

## 前提条件

- macOS（Apple Silicon）
- インターネット接続
- GitHub アカウント（リポジトリへのアクセス権限）

## 1. 前提ソフトウェアのインストール

### Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール後、PATH を通します。

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Git

```bash
brew install git
```

Git のユーザー情報を設定します。

```bash
git config --global user.name "your-name"
git config --global user.email "your-email@example.com"
```

### Docker Desktop

```bash
brew install --cask docker
```

インストール後、Docker Desktop を起動し、初期設定を完了させてください。

```bash
open /Applications/Docker.app
```

### Node.js（nvm 経由）

Node.js は nvm（Node Version Manager）経由で LTS 版をインストールします。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc
nvm install --lts
```

### Python

```bash
brew install python
```

### cloudflared

```bash
brew install cloudflared
```

## 2. リポジトリのクローン

```bash
git clone https://github.com/unrcom/llamune.git
cd llamune
```

## 3. データベースの起動

### 環境変数の設定

ルートディレクトリに `.env` ファイルを作成します。

```bash
cp .env.example .env
```

`.env` を編集し、データベースの認証情報を設定してください。

```
POSTGRES_USER=llmn
POSTGRES_PASSWORD=llmn
POSTGRES_DB=llmndb
```

> ⚠️ 本番環境では `POSTGRES_PASSWORD` を必ず安全な値に変更してください。

### Docker Compose の起動

Docker Desktop が起動していることを確認してから実行してください。

```bash
docker compose up -d
```

PostgreSQL がポート 5434 で起動します。

起動確認：

```bash
docker compose ps
```

`llmn_db` コンテナが `running` 状態であることを確認してください。

## 4. データベースマイグレーション

```bash
cd llmn_db
npm install
```

`.env` ファイルを作成します。

```bash
cp .env.example .env
```

`.env` を編集し、接続情報を設定してください（ポートは 5434）。

```
DATABASE_URL=postgres://llmn:llmn@localhost:5434/llmndb
```

マイグレーションを実行します。

```bash
npm run migrate:up
```

```bash
cd ..
```

## 5. バックエンドのセットアップ

```bash
cd back
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`.env` ファイルを作成します。

```bash
cp .env.example .env
```

`.env` を編集してください。`DATABASE_URL` のスキーマは `postgresql://` を使用し、`JWT_SECRET` を安全な値に変更してください。

```
DATABASE_URL=postgresql://llmn:llmn@localhost:5434/llmndb
JWT_SECRET=your-secret-key-here
JWT_EXPIRE_MINUTES=60
CHROMA_DB_DIR=/path/to/llamune/chroma_db
ADAPTER_DIR=/path/to/llamune/adapters
```

> ⚠️ バックエンド（SQLAlchemy）では `postgresql://` を使用してください。`postgres://` ではエラーになります。
> 💡 `CHROMA_DB_DIR` と `ADAPTER_DIR` はデータの保存先です。llamune リポジトリ内の任意のパスを指定してください。

### 初期ユーザーの作成

```bash
python create_user.py <ユーザー名> <パスワード> --admin
```

## 6. フロントエンドのビルド

フロントエンドはビルドして静的ファイルを生成します。バックエンドが静的ファイルを配信します。

```bash
cd ../web
npm install
npm run build
```

ビルドが成功すると `web/dist/` ディレクトリが生成されます。

> 💡 フロントエンドのコードを変更した場合は `npm run build` を再実行してください。

## 7. バックエンドの起動

```bash
cd ../back
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

バックエンドがポート 8000 で起動し、フロントエンドの静的ファイルも配信します。

## 8. 動作確認

ブラウザで http://localhost:8000 にアクセスし、作成したユーザーでログインできることを確認してください。

## 停止方法

バックエンドのターミナルで `Ctrl+C` で停止します。

データベースの停止：

```bash
docker compose down
```

データベースのデータは Docker ボリュームに保持されるため、再起動してもデータは失われません。

## ユーザー管理

ユーザーはコマンドラインで作成します。

```bash
cd ~/dev/llamune/back
source .venv/bin/activate

# 一般ユーザー作成
python create_user.py <username> <password>

# 管理者ユーザー作成
python create_user.py <username> <password> --admin
```

管理者のみプロジェクト・モデル・FTデータ・訓練ジョブの管理が可能です。
