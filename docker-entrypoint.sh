#!/bin/bash
set -e

echo "🚀 Starting llamune backend setup..."

# データベースディレクトリの確認
echo "📁 Checking database directory..."
mkdir -p /root/.llamune

# .envファイルがない場合は作成
if [ ! -f /root/.llamune/.env ]; then
  echo "📝 Creating .env file..."
  cp .env.example /root/.llamune/.env
fi

# シークレットキーの確認と生成
echo "🔑 Checking secrets..."
ENV_FILE=/root/.llamune/.env node scripts/generate-secrets.js

# .envファイルを読み込む（OLLAMA_API_URLとENCRYPTION_KEYは除外）
export $(cat /root/.llamune/.env | grep -v '^#' | grep -v 'OLLAMA_API_URL' | grep -v 'ENCRYPTION_KEY' | xargs)

# Ollamaの起動を待つ
echo "⏳ Waiting for Ollama to be ready..."
until curl -s ${OLLAMA_API_URL}/api/tags > /dev/null 2>&1; do
  echo "   Ollama is not ready yet. Retrying in 10 seconds..."
  sleep 10
done
echo "✅ Ollama is ready!"

echo "🎉 Setup complete! Starting API server..."
echo ""

# 渡されたコマンドを実行
exec "$@"
