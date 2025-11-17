#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  listModels,
  ensureOllamaRunning,
  formatSize,
  formatParams,
  pullModel,
  chatWithModel,
  OllamaError,
  type ChatMessage,
} from './utils/ollama.js';
import {
  getSystemSpec,
  getRecommendedModels,
  displaySystemSpec,
  displayRecommendedModels,
} from './utils/system.js';
import {
  getLastUsedModel,
  saveLastUsedModel,
} from './utils/config.js';
import {
  saveConversation,
  listSessions,
  getSession,
  appendMessagesToSession,
} from './utils/database.js';
import * as readline from 'readline';

// ESModuleでpackage.jsonを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

// 基本設定
program
  .name('llamune')
  .description(packageJson.description)
  .version(packageJson.version, '-v, --version', 'バージョンを表示');

// メインコマンド（引数なしで実行）
program
  .action(() => {
    console.log('🔵 ✨ Llamune - Closed Network LLM Platform');
    console.log('');
    console.log('使い方:');
    console.log('  llamune [コマンド] [オプション]');
    console.log('  llmn [コマンド] [オプション]  # 短縮版');
    console.log('');
    console.log('利用可能なコマンド:');
    console.log('  ls         利用可能なモデル一覧を表示');
    console.log('  pull       モデルをダウンロード');
    console.log('  chat       チャットを開始');
    console.log('  compare    複数のLLMで比較実行');
    console.log('  config     設定を管理');
    console.log('  history    会話履歴を表示');
    console.log('');
    console.log('ヘルプを表示: llamune --help');
  });

/**
 * モデルを選択（インタラクティブ）
 */
async function selectModel(
  models: { name: string }[],
  lastUsedModel?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('利用可能なモデル:');
    console.log('');

    models.forEach((model, index) => {
      const isLast = model.name === lastUsedModel;
      const prefix = isLast ? '⭐' : '  ';
      const suffix = isLast ? ' (前回使用)' : '';
      console.log(`${prefix} ${index + 1}. ${model.name}${suffix}`);
    });

    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('モデルを選択してください (番号): ', (answer) => {
      rl.close();

      const num = parseInt(answer.trim(), 10);
      if (num >= 1 && num <= models.length) {
        resolve(models[num - 1].name);
      } else {
        console.log('');
        console.log('❌ 無効な番号です');
        reject(new Error('Invalid model selection'));
      }
    });
  });
}

/**
 * スピナーを表示
 */
function showSpinner(): NodeJS.Timeout {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  return setInterval(() => {
    process.stdout.write(`\r${frames[i]} 考え中...`);
    i = (i + 1) % frames.length;
  }, 80);
}

/**
 * スピナーを停止
 */
function stopSpinner(spinner: NodeJS.Timeout): void {
  clearInterval(spinner);
  process.stdout.write('\r\x1b[K'); // 行をクリア
}

// chat コマンド
program
  .command('chat')
  .description('チャットを開始')
  .option('-m, --model <model>', 'モデルを指定')
  .option('-c, --continue <session-id>', '過去の会話を再開')
  .action(async (options: { model?: string; continue?: string }) => {
    try {
      // Ollama の起動確認・自動起動
      const isRunning = await ensureOllamaRunning();
      if (!isRunning) {
        console.log('❌ Ollama の起動に失敗しました');
        console.log('');
        console.log('手動で起動してください:');
        console.log('  ollama serve');
        process.exit(1);
      }

      // モデル一覧を取得
      const models = await listModels();
      if (models.length === 0) {
        console.log('❌ インストール済みのモデルがありません');
        console.log('');
        console.log('モデルをインストールしてください:');
        console.log('  llamune pull gemma2:9b');
        console.log('  llmn pull gemma2:9b');
        process.exit(1);
      }

      // 会話履歴とセッションID
      let messages: ChatMessage[] = [];
      let sessionId: number | null = null;
      let selectedModel: string;

      // --continue オプションで過去の会話を再開
      if (options.continue) {
        const sid = parseInt(options.continue, 10);
        const sessionData = getSession(sid);

        if (!sessionData) {
          console.log(`❌ セッションID ${sid} が見つかりません`);
          console.log('');
          console.log('履歴を確認してください:');
          console.log('  llamune history');
          console.log('  llmn history');
          process.exit(1);
        }

        // 過去の会話を復元
        sessionId = sid;
        messages = sessionData.messages;
        selectedModel = sessionData.session.model;

        // モデルが存在するか確認
        const modelExists = models.some((m) => m.name === selectedModel);
        if (!modelExists) {
          console.log(`❌ セッションのモデル "${selectedModel}" が見つかりません`);
          console.log('');
          console.log('モデルをインストールしてください:');
          console.log(`  llamune pull ${selectedModel}`);
          console.log(`  llmn pull ${selectedModel}`);
          process.exit(1);
        }

        console.log('');
        console.log('💬 Chat モード（会話を再開）');
        console.log(`セッションID: ${sessionId}`);
        console.log(`モデル: ${selectedModel}`);
        console.log('');
        console.log('--- 過去の会話 ---');
        console.log('');

        // 過去の会話を表示
        messages.forEach((msg) => {
          if (msg.role === 'user') {
            console.log(`You: ${msg.content}`);
          } else {
            console.log(`AI: ${msg.content}`);
          }
          console.log('');
        });

        console.log('--- 会話の続きを開始 ---');
        console.log('');
      } else {
        // 新規会話
        // モデルを選択
        if (options.model) {
          // -m オプションで指定された場合
          const modelExists = models.some((m) => m.name === options.model);
          if (!modelExists) {
            console.log(`❌ モデル "${options.model}" が見つかりません`);
            console.log('');
            console.log('利用可能なモデル:');
            models.forEach((m) => console.log(`  - ${m.name}`));
            process.exit(1);
          }
          selectedModel = options.model;
        } else {
          // オプション未指定の場合、インタラクティブに選択
          try {
            const lastUsedModel = getLastUsedModel();
            selectedModel = await selectModel(models, lastUsedModel);
          } catch {
            // 無効な選択の場合は終了
            process.exit(1);
          }
        }

        // 選択したモデルを保存
        saveLastUsedModel(selectedModel);

        console.log('');
        console.log('💬 Chat モード');
        console.log(`モデル: ${selectedModel}`);
        console.log('');
      }

      console.log('終了するには "exit" または "quit" と入力してください');
      console.log('---');
      console.log('');

      // 初期のメッセージ数を記録（会話再開の場合）
      const initialMessageCount = messages.length;

      // Readline インターフェース
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'You: ',
      });

      rl.prompt();

      rl.on('line', async (input: string) => {
        const userInput = input.trim();

        // 終了コマンド
        if (userInput === 'exit' || userInput === 'quit') {
          rl.close();
          return;
        }

        // 空入力は無視
        if (!userInput) {
          rl.prompt();
          return;
        }

        // ユーザーメッセージを追加
        messages.push({
          role: 'user',
          content: userInput,
        });

        // AI の応答を取得
        console.log('');
        const spinner = showSpinner();

        let fullResponse = '';
        let isFirstChunk = true;

        try {
          await chatWithModel(selectedModel!, messages, (chunk) => {
            // 最初のチャンクでスピナーを停止
            if (isFirstChunk) {
              stopSpinner(spinner);
              process.stdout.write('AI: ');
              isFirstChunk = false;
            }
            fullResponse += chunk;
            process.stdout.write(chunk);
          });

          // アシスタントの応答を履歴に追加
          messages.push({
            role: 'assistant',
            content: fullResponse,
          });

          process.stdout.write('\n\n');
        } catch (error) {
          stopSpinner(spinner);
          console.error('\n');
          if (error instanceof OllamaError) {
            console.error('❌ エラー:', error.message);
          } else {
            console.error('❌ 予期しないエラーが発生しました');
          }
          console.log('');
        }

        rl.prompt();
      });

      rl.on('close', () => {
        console.log('');

        // 新しいメッセージがある場合のみ保存
        const newMessages = messages.slice(initialMessageCount);
        if (newMessages.length > 0) {
          try {
            if (sessionId !== null) {
              // 既存セッションに追加
              appendMessagesToSession(sessionId, newMessages);
              console.log(`💾 会話を保存しました (ID: ${sessionId})`);
            } else {
              // 新規セッション作成
              const newSessionId = saveConversation(selectedModel, messages);
              console.log(`💾 会話を保存しました (ID: ${newSessionId})`);
            }
          } catch (error) {
            console.log('⚠️  会話の保存に失敗しました');
          }
        }

        console.log('👋 チャットを終了します');
        process.exit(0);
      });
    } catch (error) {
      if (error instanceof OllamaError) {
        console.error('❌ エラー:', error.message);
      } else {
        console.error('❌ 予期しないエラーが発生しました');
      }
      process.exit(1);
    }
  });

// compare コマンド（後で実装）
program
  .command('compare')
  .description('複数のLLMで比較実行')
  .argument('<query>', '比較するクエリ')
  .option('-m, --models <models...>', '比較するモデル（複数指定可能）')
  .action((query, options) => {
    console.log('📊 Compare モードを起動します...');
    console.log('クエリ:', query);
    console.log('モデル:', options.models || '全モデル');
    console.log('');
    console.log('⚠️  このコマンドは開発中です');
  });

// config コマンド（後で実装）
program
  .command('config')
  .description('設定を管理')
  .option('--list', '現在の設定を表示')
  .option('--set <key=value>', '設定値を変更')
  .action((options) => {
    console.log('⚙️  Config モードを起動します...');
    console.log('');
    console.log('⚠️  このコマンドは開発中です');
  });

// モデル一覧表示の共通処理
async function showModelList() {
  try {
    console.log('📦 利用可能なモデル:');
    console.log('');

    // Ollama の起動確認・自動起動
    const isRunning = await ensureOllamaRunning();
    if (!isRunning) {
      console.log('❌ Ollama の起動に失敗しました');
      console.log('');
      console.log('手動で起動してください:');
      console.log('  ollama serve');
      process.exit(1);
    }

    // モデル一覧を取得
    const models = await listModels();

    if (models.length === 0) {
      console.log('⚠️  インストール済みのモデルがありません');
      console.log('');
      console.log('🎉 Llamune へようこそ！');
      console.log('');

      // システムスペックを取得して表示
      const spec = getSystemSpec();
      displaySystemSpec(spec);

      // 推奨モデルを表示
      const recommended = getRecommendedModels(spec);
      displayRecommendedModels(recommended);

      return;
    }

    // モデル一覧を表示
    models.forEach((model) => {
      const params = formatParams(model);
      const size = formatSize(model.size);
      console.log(`  ✓ ${model.name.padEnd(20)} (${params}, ${size})`);
    });

    console.log('');
    console.log(`合計: ${models.length} モデル`);
  } catch (error) {
    if (error instanceof OllamaError) {
      console.error('❌ エラー:', error.message);
    } else {
      console.error('❌ 予期しないエラーが発生しました');
    }
    process.exit(1);
  }
}

// ls コマンド
program.command('ls').description('利用可能なモデル一覧を表示').action(showModelList);

// models コマンド（後方互換性のためのエイリアス）
program.command('models', { hidden: true }).action(showModelList);

// pull コマンド
program
  .command('pull')
  .description('モデルをダウンロード')
  .argument('[model]', 'モデル名（例: gemma2:9b）')
  .action(async (modelName?: string) => {
    try {
      // Ollama の起動確認・自動起動
      const isRunning = await ensureOllamaRunning();
      if (!isRunning) {
        console.log('❌ Ollama の起動に失敗しました');
        console.log('');
        console.log('手動で起動してください:');
        console.log('  ollama serve');
        process.exit(1);
      }

      // モデル名が指定されていない場合は推奨モデルを表示
      if (!modelName) {
        console.log('📥 モデルをダウンロードします');
        console.log('');

        const spec = getSystemSpec();
        displaySystemSpec(spec);

        const recommended = getRecommendedModels(spec);
        console.log('🎯 推奨モデル:');
        console.log('');
        recommended.forEach((model, index) => {
          const badge = index === 0 ? '⭐' : '  ';
          console.log(`${badge} ${model.name} - ${model.description}`);
        });
        console.log('');
        console.log('使い方:');
        console.log(`  llamune pull ${recommended[0].name}`);
        console.log(`  llmn pull ${recommended[0].name}`);
        return;
      }

      // モデルをプル
      await pullModel(modelName);
      console.log('');
      console.log('✅ インストール完了！');
      console.log('');
      console.log('次のコマンドで確認できます:');
      console.log('  llamune ls');
      console.log('  llmn ls');
    } catch (error) {
      if (error instanceof OllamaError) {
        console.error('❌ エラー:', error.message);
      } else {
        console.error('❌ 予期しないエラーが発生しました');
      }
      process.exit(1);
    }
  });

// history コマンド
program
  .command('history')
  .description('会話履歴を表示')
  .option('-n, --limit <number>', '表示する履歴数', '10')
  .action((options) => {
    try {
      const limit = parseInt(options.limit, 10);
      const sessions = listSessions(limit);

      if (sessions.length === 0) {
        console.log('📜 会話履歴がありません');
        console.log('');
        console.log('チャットを開始して会話を保存しましょう:');
        console.log('  llamune chat');
        console.log('  llmn chat');
        return;
      }

      console.log('📜 会話履歴:');
      console.log('');

      sessions.forEach((session) => {
        const date = new Date(session.created_at);
        const formattedDate = date.toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        // プレビューを最大50文字に制限
        const preview = session.preview
          ? session.preview.length > 50
            ? session.preview.substring(0, 50) + '...'
            : session.preview
          : '(空の会話)';

        console.log(`  ID: ${session.id}`);
        console.log(`  日時: ${formattedDate}`);
        console.log(`  モデル: ${session.model}`);
        console.log(`  メッセージ数: ${session.message_count}`);
        console.log(`  内容: ${preview}`);
        console.log('');
      });

      console.log(`合計: ${sessions.length} 件の会話`);
    } catch (error) {
      console.error('❌ 履歴の取得に失敗しました');
      console.error(error);
      process.exit(1);
    }
  });

// recommend コマンド
program
  .command('recommend')
  .description('推奨モデルを表示')
  .action(() => {
    try {
      console.log('🎯 推奨モデル');
      console.log('');

      // システムスペックを取得
      const spec = getSystemSpec();
      displaySystemSpec(spec);

      // 推奨モデルを表示
      const recommended = getRecommendedModels(spec);
      displayRecommendedModels(recommended);
    } catch (error) {
      console.error('❌ 推奨モデルの取得に失敗しました');
      console.error(error);
      process.exit(1);
    }
  });

// コマンドをパース
program.parse(process.argv);
