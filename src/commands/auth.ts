/**
 * 認証コマンド (login, logout, whoami)
 */

import * as readline from 'readline';
import {
  saveAuthTokens,
  loadAuthTokens,
  deleteAuthTokens,
  isLoggedIn,
  registerApi,
  loginApi,
  logoutApi,
  getMeApi,
} from '../utils/auth-client.js';

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
 * ログインコマンド
 */
export async function loginCommand(): Promise<void> {
  try {
    // 既にログイン済みかチェック
    if (isLoggedIn()) {
      const tokens = loadAuthTokens();
      console.log(`⚠️  Already logged in as ${tokens?.user.username}`);
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

    // ログインAPI呼び出し
    const tokens = await loginApi(username, password);

    // トークンを保存
    saveAuthTokens(tokens);

    console.log('✅ Logged in successfully');
    console.log('');
    console.log(`👤 User: ${tokens.user.username} (${tokens.user.role})`);
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
 * ユーザー登録コマンド
 */
export async function registerCommand(): Promise<void> {
  try {
    // 既にログイン済みかチェック
    if (isLoggedIn()) {
      const tokens = loadAuthTokens();
      console.log(`⚠️  Already logged in as ${tokens?.user.username}`);
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

    // パスワード入力
    const password = await readPassword('Password: ');
    rl.close();

    if (!password) {
      console.error('❌ Password is required');
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

    // ユーザー登録API呼び出し（デフォルトで'user'ロール）
    const tokens = await registerApi(username, password, 'user');

    // トークンを保存
    saveAuthTokens(tokens);

    console.log('✅ User registered successfully');
    console.log('');
    console.log(`👤 User: ${tokens.user.username} (${tokens.user.role})`);
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
 * ログアウトコマンド
 */
export async function logoutCommand(): Promise<void> {
  try {
    // ログインしているかチェック
    if (!isLoggedIn()) {
      console.log('⚠️  Not logged in');
      return;
    }

    const tokens = loadAuthTokens();
    if (!tokens) {
      console.log('⚠️  Not logged in');
      return;
    }

    console.log('🔄 Logging out...');

    // サーバーにログアウトリクエスト
    try {
      await logoutApi(tokens.refreshToken, tokens.accessToken);
    } catch (error) {
      // サーバーエラーは無視してローカルトークンは削除
    }

    // ローカルのトークンを削除
    deleteAuthTokens();

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

    const tokens = loadAuthTokens();
    if (!tokens) {
      console.log('⚠️  Not logged in');
      return;
    }

    console.log('🔄 Fetching user information...');
    console.log('');

    // サーバーからユーザー情報を取得
    try {
      const userInfo = await getMeApi(tokens.accessToken);

      console.log('👤 Current User:');
      console.log('');
      console.log(`  Username: ${userInfo.username}`);
      console.log(`  Role: ${userInfo.role}`);
      console.log(`  User ID: ${userInfo.id}`);
      console.log(`  Created: ${new Date(userInfo.created_at).toLocaleString()}`);
      console.log('');
      console.log(`  Token stored at: ~/.llamune/auth.json`);
    } catch (error) {
      // トークンが期限切れの可能性
      console.error('❌ Failed to fetch user info (token may be expired)');
      console.log('');
      console.log('再ログインしてください: llamune logout && llamune login');
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error('❌ Error fetching user info');
    }
    process.exit(1);
  }
}
