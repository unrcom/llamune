import express from 'express';
import cors from 'cors';
import { authenticate } from './middleware/auth.js';
import modelsRouter from './routes/models.js';
import presetsRouter from './routes/presets.js';
import systemRouter from './routes/system.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());

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
