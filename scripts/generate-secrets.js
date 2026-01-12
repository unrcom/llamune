#!/usr/bin/env node

/**
 * シークレットキー（JWT_SECRET, ENCRYPTION_KEY）を自動生成して .env ファイルに追加するスクリプト
 */

import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ENV_FILE = resolve(process.cwd(), '.env');

function generateSecret() {
  // 32バイト（256ビット）のランダムキーを生成
  return randomBytes(32).toString('base64');
}

function setupSecrets() {
  let envContent = '';
  let updated = false;
  
  // .envファイルが存在する場合は読み込む
  if (existsSync(ENV_FILE)) {
    envContent = readFileSync(ENV_FILE, 'utf8');
  } else {
    console.error('❌ Error: .env file not found. Please run: cp .env.example .env');
    process.exit(1);
  }
  
  // JWT_SECRETの処理
  const defaultJwtSecret = 'your-jwt-secret-here';
  if (envContent.includes(`JWT_SECRET=${defaultJwtSecret}`) || 
      envContent.match(/JWT_SECRET=\s*$/m)) {
    const newJwtSecret = generateSecret();
    if (envContent.includes(`JWT_SECRET=${defaultJwtSecret}`)) {
      envContent = envContent.replace(`JWT_SECRET=${defaultJwtSecret}`, `JWT_SECRET=${newJwtSecret}`);
    } else {
      envContent = envContent.replace(/JWT_SECRET=.*$/m, `JWT_SECRET=${newJwtSecret}`);
    }
    console.log('🔑 Generated new JWT_SECRET and updated .env');
    updated = true;
  } else if (envContent.includes('JWT_SECRET=') && envContent.match(/JWT_SECRET=.+/m)) {
    console.log('✅ JWT_SECRET already exists in .env');
  }
  
  // ENCRYPTION_KEYの処理
  const defaultEncryptionKey = 'your-32-byte-hex-encryption-key-here';
  if (envContent.includes(`ENCRYPTION_KEY=${defaultEncryptionKey}`) ||
      (envContent.includes('ENCRYPTION_KEY=') && envContent.match(/ENCRYPTION_KEY=\s*$/m))) {
    const newEncryptionKey = generateSecret();
    if (envContent.includes(`ENCRYPTION_KEY=${defaultEncryptionKey}`)) {
      envContent = envContent.replace(`ENCRYPTION_KEY=${defaultEncryptionKey}`, `ENCRYPTION_KEY=${newEncryptionKey}`);
    } else {
      envContent = envContent.replace(/ENCRYPTION_KEY=.*$/m, `ENCRYPTION_KEY=${newEncryptionKey}`);
    }
    console.log('🔐 Generated new ENCRYPTION_KEY and updated .env');
    updated = true;
  } else if (envContent.includes('ENCRYPTION_KEY=') && envContent.match(/ENCRYPTION_KEY=.+/m)) {
    console.log('✅ ENCRYPTION_KEY already exists in .env');
  }
  
  // ファイルに書き込み
  if (updated) {
    writeFileSync(ENV_FILE, envContent, 'utf8');
    console.log('⚠️  IMPORTANT: Keep this .env file safe and never commit it to Git!');
  } else {
    console.log('✅ All secrets are already configured in .env');
  }
}

// 実行
try {
  setupSecrets();
} catch (error) {
  console.error('❌ Error generating secrets:', error);
  process.exit(1);
}
