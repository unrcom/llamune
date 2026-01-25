/**
 * 暗号化ユーティリティ
 * AES-256-GCM を使用してデータを暗号化・復号
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// デフォルトの暗号化キー（固定）
const DEFAULT_ENCRYPTION_KEY = '40685fd53d8eb3b1e921f974d806fc800233fe75eda796aef4ed3964ba5b9238';

/**
 * 暗号化キーを取得
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY;

  // 64文字の16進数文字列を32バイトのBufferに変換
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // それ以外の場合はSHA-256でハッシュ化して32バイトにする
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * テキストを暗号化
 * @param plaintext 平文
 * @returns 暗号化された文字列（base64エンコード: iv:authTag:ciphertext）
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // iv:authTag:ciphertext の形式で返す
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * 暗号化されたテキストを復号
 * @param encryptedText 暗号化された文字列
 * @returns 復号された平文
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 暗号化キーを生成（初回セットアップ用）
 * @returns 64文字の16進数文字列
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
