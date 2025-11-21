/**
 * 認証コマンド (register, login, logout, whoami)
 * CLI 専用：データベース直接アクセス（API サーバー不要）
 */

import * as readline from 'readline';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import {
  createUser,
  getUserByUsername,
  getUserById,
  type User,
} from '../utils/database.js';
import { hashPassword, verifyPassword, validatePassword, validateUsername } from '../utils/password.js';

const CLI_AUTH_DIR = join(homedir(), '.llamune');
const CLI_AUTH_FILE = join(CLI_AUTH_DIR, 'current-user.json');

/**
 * 現在のユーザー情報（CLI 専用）
 */
interface CurrentUser {
  id: number;
  username: string;
  role: string;
}

/**
 * 現在のユーザー情報を保存
 */
function saveCurrentUser(user: CurrentUser): void {
  try {
    if (!existsSync(CLI_AUTH_DIR)) {
      mkdirSync(CLI_AUTH_DIR, { recursive: true });
    }
    writeFileSync(CLI_AUTH_FILE, JSON.stringify(user, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save user info: ${error}`);
  }
}

/**
 * 現在のユーザー情報を読み込み
 */
function loadCurrentUser(): CurrentUser | null {
  try {
    if (!existsSync(CLI_AUTH_FILE)) {
      return null;
    }
    const content = readFileSync(CLI_AUTH_FILE, 'utf-8');
    return JSON.parse(content) as CurrentUser;
  } catch (error) {
    return null;
  }
}

/**
 * 現在のユーザー情報を削除
 */
function deleteCurrentUser(): void {
  try {
    if (existsSync(CLI_AUTH_FILE)) {
      unlinkSync(CLI_AUTH_FILE);
    }
  } catch (error) {
    throw new Error(`Failed to delete user info: ${error}`);
  }
}

/**
 * ログインしているかチェック
 */
function isLoggedIn(): boolean {
  return loadCurrentUser() !== null;
}

/**
 * パスワード入力（非表示）
 */
function readPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // パスワード入力時はエコーバックしない
    const stdin = process.stdin;
    (stdin as any).setRawMode(true);

    let password = '';

    process.stdout.write(prompt);

    stdin.on('data', (char: Buffer) => {
      const str = char.toString('utf8');

      switch (str) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          (stdin as any).setRawMode(false);
          stdin.pause();
          rl.close();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.stdout.write('\n');
          process.exit(0);
          break;
        case '\u007f': // Backspace
        case '\b': // Backspace (Windows)
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += str;
          process.stdout.write('*');
          break;
      }
    });
  });
}

/**
 * ユーザー登録コマンド
 */
export async function registerCommand(): Promise<void> {
  try {
    // 既にログイン済みかチェック
    if (isLoggedIn()) {
      const currentUser = loadCurrentUser();
      console.log(`⚠️  Already logged in as ${currentUser?.username}`);
      console.log('');
      console.log('新しいユーザーを登録する前にログアウトしてください: llamune logout');
      return;
    }

    console.log('📝 Llamune User Registration');
    console.log('');

    // ユーザー名入力
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const username = await new Promise<string>((resolve) => {
      rl.question('Username: ', (answer) => {
        resolve(answer.trim());
      });
    });

    if (!username) {
      rl.close();
      console.error('❌ Username is required');
      process.exit(1);
    }

    // ユーザー名バリデーション
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      rl.close();
      console.error(`❌ ${usernameValidation.error}`);
      process.exit(1);
    }

    // ユーザー名の重複チェック
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      rl.close();
      console.error('❌ Username already exists');
      process.exit(1);
    }

    // パスワード入力
    const password = await readPassword('Password: ');
    rl.close();

    if (!password) {
      console.error('❌ Password is required');
      process.exit(1);
    }

    // パスワードバリデーション
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ ${passwordValidation.error}`);
      process.exit(1);
    }

    // パスワード確認
    const passwordConfirm = await readPassword('Confirm Password: ');

    if (password !== passwordConfirm) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    console.log('');
    console.log('🔄 Creating user...');

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザーを作成（デフォルトで 'user' ロール）
    const userId = createUser(username, passwordHash, 'user');

    // 現在のユーザーとして保存
    saveCurrentUser({
      id: userId,
      username: username,
      role: 'user',
    });

    console.log('✅ User registered successfully');
    console.log('');
    console.log(`👤 User: ${username} (user)`);
    console.log('');
    console.log('これで llamune コマンドが使用できます。');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Registration failed: ${error.message}`);
    } else {
      console.error('❌ Registration failed');
    }
    process.exit(1);
  }
}

/**
 * ログインコマンド
 */
export async function loginCommand(): Promise<void> {
  try {
    // 既にログイン済みかチェック
    if (isLoggedIn()) {
      const currentUser = loadCurrentUser();
      console.log(`⚠️  Already logged in as ${currentUser?.username}`);
      console.log('');
      console.log('ログアウトするには: llamune logout');
      return;
    }

    console.log('🔐 Llamune Login');
    console.log('');

    // ユーザー名入力
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const username = await new Promise<string>((resolve) => {
      rl.question('Username: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (!username) {
      console.error('❌ Username is required');
      process.exit(1);
    }

    // パスワード入力
    const password = await readPassword('Password: ');

    if (!password) {
      console.error('❌ Password is required');
      process.exit(1);
    }

    console.log('');
    console.log('🔄 Logging in...');

    // ユーザーを取得
    const user = getUserByUsername(username);
    if (!user) {
      console.error('❌ Invalid username or password');
      process.exit(1);
    }

    // パスワードを検証
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      console.error('❌ Invalid username or password');
      process.exit(1);
    }

    // 現在のユーザーとして保存
    saveCurrentUser({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    console.log('✅ Logged in successfully');
    console.log('');
    console.log(`👤 User: ${user.username} (${user.role})`);
    console.log('');
    console.log('これで llamune コマンドが使用できます。');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Login failed: ${error.message}`);
    } else {
      console.error('❌ Login failed');
    }
    process.exit(1);
  }
}

/**
 * ログアウトコマンド
 */
export async function logoutCommand(): Promise<void> {
  try {
    // ログインしているかチェック
    if (!isLoggedIn()) {
      console.log('⚠️  Not logged in');
      return;
    }

    const currentUser = loadCurrentUser();
    if (!currentUser) {
      console.log('⚠️  Not logged in');
      return;
    }

    console.log('🔄 Logging out...');

    // ローカルのユーザー情報を削除
    deleteCurrentUser();

    console.log('✅ Logged out successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Logout failed: ${error.message}`);
    } else {
      console.error('❌ Logout failed');
    }
    process.exit(1);
  }
}

/**
 * whoamiコマンド
 */
export async function whoamiCommand(): Promise<void> {
  try {
    // ログインしているかチェック
    if (!isLoggedIn()) {
      console.log('⚠️  Not logged in');
      console.log('');
      console.log('ログインするには: llamune login');
      return;
    }

    const currentUser = loadCurrentUser();
    if (!currentUser) {
      console.log('⚠️  Not logged in');
      return;
    }

    // データベースから最新のユーザー情報を取得
    const user = getUserById(currentUser.id);
    if (!user) {
      console.error('❌ User not found (user may have been deleted)');
      console.log('');
      console.log('ログアウトしてください: llamune logout');
      process.exit(1);
    }

    console.log('👤 Current User:');
    console.log('');
    console.log(`  Username: ${user.username}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
    console.log(`  Stored at: ${CLI_AUTH_FILE}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error('❌ Error fetching user info');
    }
    process.exit(1);
  }
}

/**
 * 現在のユーザーIDを取得（他のコマンドから使用）
 */
export function getCurrentUserId(): number | undefined {
  const currentUser = loadCurrentUser();
  return currentUser?.id;
}
