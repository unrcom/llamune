import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticate } from './middleware/auth.js';
import modelsRouter from './routes/models.js';
import presetsRouter from './routes/presets.js';
import systemRouter from './routes/system.js';
import chatRouter from './routes/chat.js';

// package.json を読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());

// API メタ情報（認証不要）
app.get('/api', (req, res) => {
  res.json({
    name: 'Llamune API',
    version: packageJson.version,
    description: packageJson.description,
    platform: 'Closed Network LLM Platform',
    endpoints: {
      models: {
        list: 'GET /api/models',
        pull: 'POST /api/models/pull',
        delete: 'DELETE /api/models',
        recommended: 'GET /api/models/recommended',
      },
      chat: {
        sendMessage: 'POST /api/chat/messages',
        retry: 'POST /api/chat/retry',
        listSessions: 'GET /api/chat/sessions',
        getSession: 'GET /api/chat/sessions/:id',
        rewind: 'DELETE /api/chat/sessions/:id/rewind',
        switchModel: 'PUT /api/chat/sessions/:id/model',
      },
      system: {
        spec: 'GET /api/system/spec',
        health: 'GET /api/system/health',
      },
      presets: {
        list: 'GET /api/presets',
      },
    },
    documentation: {
      main: 'https://github.com/unrcom/llamune/blob/main/docs/API_SPECIFICATION.md',
      chat: 'https://github.com/unrcom/llamune/blob/main/docs/API_CHAT_ENDPOINTS.md',
      setup: 'https://github.com/unrcom/llamune/blob/main/docs/SETUP.md',
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer {API_KEY}',
      setup: 'See docs/SETUP.md for configuration',
    },
  });
});

// 認証ミドルウェアを全エンドポイントに適用
app.use('/api', authenticate);

// ルーティング
app.use('/api/models', modelsRouter);
app.use('/api/presets', presetsRouter);
app.use('/api/system', systemRouter);
app.use('/api/chat', chatRouter);

// ヘルスチェック（認証不要）
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Llamune API Server running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api`);
});
