/**
 * Rate Limiting ミドルウェア
 * ブルートフォース攻撃対策
 */

import rateLimit from 'express-rate-limit';

/**
 * ログインエンドポイント用のRate Limiter
 * 15分間に5回まで
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回
  message: {
    error: 'Too many login attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // IPアドレスベースで制限
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});

/**
 * ユーザー登録エンドポイント用のRate Limiter
 * 1時間に3回まで
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3, // 最大3回
  message: {
    error: 'Too many registration attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});

/**
 * パスワード変更エンドポイント用のRate Limiter
 * 1時間に5回まで
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 5, // 最大5回
  message: {
    error: 'Too many password change attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});

/**
 * 一般的なAPI用のRate Limiter
 * 15分間に100回まで
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100回
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});
