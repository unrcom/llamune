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
  type ChatParameters,
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
  getSessionMessagesWithTurns,
  logicalDeleteMessagesAfterTurn,
  getAllParameterPresets,
  type ParameterPreset,
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
 * パラメータプリセットを選択（インタラクティブ）
 */
async function selectPreset(presets: ParameterPreset[]): Promise<ParameterPreset> {
  return new Promise((resolve, reject) => {
    console.log('パラメータプリセットを選択:');
    console.log('');

    presets.forEach((preset, index) => {
      const description = preset.description ? ` - ${preset.description}` : '';
      console.log(`  ${index + 1}. ${preset.display_name}${description}`);
    });

    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('プリセットを選択してください (番号): ', (answer) => {
      rl.close();

      const num = parseInt(answer.trim(), 10);
      if (num >= 1 && num <= presets.length) {
        resolve(presets[num - 1]);
      } else {
        console.log('');
        console.log('❌ 無効な番号です');
        reject(new Error('Invalid preset selection'));
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
      let selectedParameters: ChatParameters | undefined = undefined;

      // /retry で保留中の回答
      let pendingRetry: { response: string; model: string; previousResponse: ChatMessage } | null = null;

      // /rewind で保留中の巻き戻し
      let pendingRewind: { sessionId: number | null; turnNumber: number } | null = null;

      // /retry のモデル選択待ち
      let pendingRetryModelSelection = false;

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

        // プリセットを選択
        const presets = getAllParameterPresets();
        if (presets.length > 0) {
          try {
            const selectedPreset = await selectPreset(presets);
            console.log('');
            console.log(`✅ プリセット: ${selectedPreset.display_name}`);

            // パラメータを設定（nullでないものだけ）
            selectedParameters = {};
            if (selectedPreset.temperature !== null) selectedParameters.temperature = selectedPreset.temperature;
            if (selectedPreset.top_p !== null) selectedParameters.top_p = selectedPreset.top_p;
            if (selectedPreset.top_k !== null) selectedParameters.top_k = selectedPreset.top_k;
            if (selectedPreset.repeat_penalty !== null) selectedParameters.repeat_penalty = selectedPreset.repeat_penalty;
            if (selectedPreset.num_ctx !== null) selectedParameters.num_ctx = selectedPreset.num_ctx;
          } catch {
            // プリセット選択失敗の場合は終了
            process.exit(1);
          }
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
            const modelName = msg.model || selectedModel;
            console.log(`AI (${modelName}): ${msg.content}`);
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

        // プリセットを選択
        const presets = getAllParameterPresets();
        if (presets.length > 0) {
          console.log('');
          try {
            const selectedPreset = await selectPreset(presets);
            console.log('');
            console.log(`✅ プリセット: ${selectedPreset.display_name}`);

            // パラメータを設定（nullでないものだけ）
            selectedParameters = {};
            if (selectedPreset.temperature !== null) selectedParameters.temperature = selectedPreset.temperature;
            if (selectedPreset.top_p !== null) selectedParameters.top_p = selectedPreset.top_p;
            if (selectedPreset.top_k !== null) selectedParameters.top_k = selectedPreset.top_k;
            if (selectedPreset.repeat_penalty !== null) selectedParameters.repeat_penalty = selectedPreset.repeat_penalty;
            if (selectedPreset.num_ctx !== null) selectedParameters.num_ctx = selectedPreset.num_ctx;
          } catch {
            // プリセット選択失敗の場合は終了
            process.exit(1);
          }
        }

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

        // /retry のモデル選択待ち処理
        if (pendingRetryModelSelection) {
          const modelNumber = parseInt(userInput, 10);

          if (isNaN(modelNumber) || modelNumber < 1 || modelNumber > models.length) {
            console.log('');
            console.log('❌ 有効な番号を入力してください');
            console.log('');
            rl.prompt();
            return;
          }

          const retryModel = models[modelNumber - 1].name;

          // 最後のメッセージがアシスタントでない場合
          if (messages.length === 0 || messages[messages.length - 1].role !== 'assistant') {
            console.log('');
            console.log('❌ 再実行する回答がありません');
            console.log('');
            pendingRetryModelSelection = false;
            rl.prompt();
            return;
          }

          console.log('');
          console.log(`🔄 ${retryModel} で再実行します...`);
          console.log('');

          const retrySpinner = showSpinner();
          let retryResponse = '';
          let retryFirstChunk = true;

          // 最後のアシスタントの応答を保存（後で復元できるように）
          const previousResponse = messages[messages.length - 1];

          // 一時的にアシスタントの応答を削除して再実行
          messages.pop();

          try {
            await chatWithModel(retryModel, messages, (chunk) => {
              if (retryFirstChunk) {
                stopSpinner(retrySpinner);
                process.stdout.write(`AI (${retryModel}): `);
                retryFirstChunk = false;
              }
              retryResponse += chunk;
              process.stdout.write(chunk);
            }, selectedParameters);

            process.stdout.write('\n\n');

            // 保留中の回答として保存（まだmessagesには追加しない）
            pendingRetry = {
              response: retryResponse,
              model: retryModel,
              previousResponse: previousResponse,
            };

            const previousModelName = previousResponse.model || 'previous model';
            console.log('💡 この回答を採用しますか？');
            console.log(`  yes, y  - 採用 (${retryModel} の回答を採用する)`);
            console.log(`  no, n   - 破棄 (${previousModelName} の回答を採用する)`);
            console.log('');
          } catch (error) {
            stopSpinner(retrySpinner);
            console.error('\n');
            if (error instanceof OllamaError) {
              console.error('❌ エラー:', error.message);
            } else {
              console.error('❌ 予期しないエラーが発生しました');
            }
            console.log('');
            // エラーの場合は元の応答を復元
            messages.push(previousResponse);
          }

          // モデル選択待ち状態を解除
          pendingRetryModelSelection = false;

          rl.prompt();
          return;
        }

        // yes/no の簡易入力処理（スラッシュなしでも認識）
        const lowerInput = userInput.toLowerCase();
        if (lowerInput === 'yes' || lowerInput === 'y') {
          // /yes の処理を実行
          // /retry の採用
          if (pendingRetry) {
            // 新しい回答を採用
            messages.push({
              role: 'assistant',
              content: pendingRetry.response,
              model: pendingRetry.model,
            });

            console.log('');
            console.log(`✅ ${pendingRetry.model} の回答を採用しました`);
            console.log('');

            // 保留中の回答をクリア
            pendingRetry = null;

            rl.prompt();
            return;
          }

          // /rewind の実行
          if (pendingRewind) {
            let deletedCount = 0;

            // セッションがある場合は DB も更新
            if (pendingRewind.sessionId !== null) {
              deletedCount = logicalDeleteMessagesAfterTurn(
                pendingRewind.sessionId,
                pendingRewind.turnNumber
              );
            } else {
              // 新規会話の場合は削除されるメッセージ数を計算
              const keepCount = pendingRewind.turnNumber * 2;
              deletedCount = messages.length - keepCount;
            }

            // メモリ上の messages 配列も更新
            const keepCount = pendingRewind.turnNumber * 2;
            messages = messages.slice(0, keepCount);

            console.log('');
            console.log(`✅ 会話 #${pendingRewind.turnNumber} まで巻き戻しました`);
            console.log(`削除されたメッセージ: ${deletedCount}件`);
            console.log('');

            // 保留中の巻き戻しをクリア
            pendingRewind = null;

            rl.prompt();
            return;
          }

          // 保留中の操作がない場合は通常メッセージとして処理
        }

        if (lowerInput === 'no' || lowerInput === 'n') {
          // /no の処理を実行
          // /retry のキャンセル
          if (pendingRetry) {
            // 前の回答を復元
            messages.push(pendingRetry.previousResponse);

            console.log('');
            console.log(`✅ ${pendingRetry.previousResponse.model || 'previous'} の回答を維持しました`);
            console.log('');

            // 保留中の回答をクリア
            pendingRetry = null;

            rl.prompt();
            return;
          }

          // /rewind のキャンセル
          if (pendingRewind) {
            console.log('');
            console.log('✅ 巻き戻しをキャンセルしました');
            console.log('');

            // 保留中の巻き戻しをクリア
            pendingRewind = null;

            rl.prompt();
            return;
          }

          // 保留中の操作がない場合は通常メッセージとして処理
        }

        // スラッシュコマンド処理
        if (userInput.startsWith('/')) {
          const parts = userInput.split(/\s+/);
          const command = parts[0].toLowerCase();
          const args = parts.slice(1);

          switch (command) {
            case '/help':
              console.log('');
              console.log('📖 コマンド一覧:');
              console.log('');
              console.log('  /retry          - 最後の質問を別のモデルで再実行（対話的選択）');
              console.log('  yes, y, /yes    - retry の回答を採用');
              console.log('  no, n, /no      - retry の回答を破棄');
              console.log('  /switch <model> - モデルを切り替え');
              console.log('  /models         - 利用可能なモデル一覧');
              console.log('  /current        - 現在のモデルを表示');
              console.log('  /params         - パラメータを表示・調整');
              console.log('  /history        - 現在の会話履歴を表示');
              console.log('  /rewind <番号>  - 指定した往復まで巻き戻し');
              console.log('  /help           - このヘルプを表示');
              console.log('  exit, quit      - チャットを終了');
              console.log('');
              rl.prompt();
              return;

            case '/current':
              console.log('');
              console.log(`📦 現在のモデル: ${selectedModel}`);
              console.log('');
              rl.prompt();
              return;

            case '/params':
              console.log('');
              console.log('⚙️  現在のパラメータ設定:');
              console.log('');
              console.log(`  temperature:     ${selectedParameters?.temperature ?? 'デフォルト'}`);
              console.log(`  top_p:           ${selectedParameters?.top_p ?? 'デフォルト'}`);
              console.log(`  top_k:           ${selectedParameters?.top_k ?? 'デフォルト'}`);
              console.log(`  repeat_penalty:  ${selectedParameters?.repeat_penalty ?? 'デフォルト'}`);
              console.log(`  num_ctx:         ${selectedParameters?.num_ctx ?? 'デフォルト'}`);
              console.log('');
              console.log('💡 パラメータの説明:');
              console.log('  temperature     - ランダム性 (0.0-2.0, 低いほど決定的)');
              console.log('  top_p           - 確率しきい値 (0.0-1.0)');
              console.log('  top_k           - 候補数の制限 (1-100)');
              console.log('  repeat_penalty  - 繰り返し抑制 (1.0-2.0)');
              console.log('  num_ctx         - コンテキスト長 (512-8192)');
              console.log('');
              console.log('変更するには、次のように入力してください:');
              console.log('  temperature=0.5');
              console.log('  top_p=0.9');
              console.log('');
              console.log('プリセットから選択するには:');
              const allPresets = getAllParameterPresets();
              allPresets.forEach((p, i) => {
                console.log(`  preset=${i + 1}  - ${p.display_name}`);
              });
              console.log('');
              rl.prompt();
              return;

            case '/models':
              console.log('');
              console.log('📦 利用可能なモデル:');
              models.forEach((m) => {
                const current = m.name === selectedModel ? ' ⭐' : '';
                console.log(`  - ${m.name}${current}`);
              });
              console.log('');
              rl.prompt();
              return;

            case '/switch':
              if (args.length === 0) {
                console.log('');
                console.log('❌ モデル名を指定してください: /switch <model>');
                console.log('');
                rl.prompt();
                return;
              }

              const newModel = args[0];
              const modelExists = models.some((m) => m.name === newModel);
              if (!modelExists) {
                console.log('');
                console.log(`❌ モデル "${newModel}" が見つかりません`);
                console.log('');
                console.log('利用可能なモデル:');
                models.forEach((m) => console.log(`  - ${m.name}`));
                console.log('');
                rl.prompt();
                return;
              }

              selectedModel = newModel;
              saveLastUsedModel(selectedModel);
              console.log('');
              console.log(`✅ モデルを ${selectedModel} に切り替えました`);
              console.log('');
              rl.prompt();
              return;

            case '/retry':
              if (messages.length === 0) {
                console.log('');
                console.log('❌ 再実行する質問がありません');
                console.log('');
                rl.prompt();
                return;
              }

              // 最後のメッセージがアシスタントでない場合
              if (messages[messages.length - 1].role !== 'assistant') {
                console.log('');
                console.log('❌ 再実行する回答がありません');
                console.log('');
                rl.prompt();
                return;
              }

              if (args.length === 0) {
                // 引数なしの場合、モデル選択画面を表示
                console.log('');
                console.log('利用可能なモデル:');
                console.log('');
                models.forEach((model, index) => {
                  const isLast = model.name === selectedModel;
                  const prefix = isLast ? '⭐' : '  ';
                  const suffix = isLast ? ' (現在使用中)' : '';
                  console.log(`${prefix} ${index + 1}. ${model.name}${suffix}`);
                });
                console.log('');
                console.log('モデルを選択してください (番号): ');

                // モデル選択待ち状態にする
                pendingRetryModelSelection = true;

                rl.prompt();
                return;
              }

              const retryModel = args[0];
              const retryModelExists = models.some((m) => m.name === retryModel);
              if (!retryModelExists) {
                console.log('');
                console.log(`❌ モデル "${retryModel}" が見つかりません`);
                console.log('');
                console.log('利用可能なモデル:');
                models.forEach((m) => console.log(`  - ${m.name}`));
                console.log('');
                rl.prompt();
                return;
              }

              console.log('');
              console.log(`🔄 ${retryModel} で再実行します...`);
              console.log('');

              const retrySpinner = showSpinner();
              let retryResponse = '';
              let retryFirstChunk = true;

              // 最後のアシスタントの応答を保存（後で復元できるように）
              const previousResponse = messages[messages.length - 1];

              // 一時的にアシスタントの応答を削除して再実行
              messages.pop();

              try {
                await chatWithModel(retryModel, messages, (chunk) => {
                  if (retryFirstChunk) {
                    stopSpinner(retrySpinner);
                    process.stdout.write(`AI (${retryModel}): `);
                    retryFirstChunk = false;
                  }
                  retryResponse += chunk;
                  process.stdout.write(chunk);
                }, selectedParameters);

                process.stdout.write('\n\n');

                // 保留中の回答として保存（まだmessagesには追加しない）
                pendingRetry = {
                  response: retryResponse,
                  model: retryModel,
                  previousResponse: previousResponse,
                };

                const previousModelName = previousResponse.model || 'previous model';
                console.log('💡 この回答を採用しますか？');
                console.log(`  yes, y  - 採用 (${retryModel} の回答を採用する)`);
                console.log(`  no, n   - 破棄 (${previousModelName} の回答を採用する)`);
                console.log('');
              } catch (error) {
                stopSpinner(retrySpinner);
                console.error('\n');
                if (error instanceof OllamaError) {
                  console.error('❌ エラー:', error.message);
                } else {
                  console.error('❌ 予期しないエラーが発生しました');
                }
                console.log('');
                // エラーの場合は元の応答を復元
                messages.push(previousResponse);
              }

              rl.prompt();
              return;

            case '/yes':
              // /retry の採用
              if (pendingRetry) {
                // 新しい回答を採用
                messages.push({
                  role: 'assistant',
                  content: pendingRetry.response,
                  model: pendingRetry.model,
                });

                console.log('');
                console.log(`✅ ${pendingRetry.model} の回答を採用しました`);
                console.log('');

                // 保留中の回答をクリア
                pendingRetry = null;

                rl.prompt();
                return;
              }

              // /rewind の実行
              if (pendingRewind) {
                let yesDeletedCount = 0;

                // セッションがある場合は DB も更新
                if (pendingRewind.sessionId !== null) {
                  yesDeletedCount = logicalDeleteMessagesAfterTurn(
                    pendingRewind.sessionId,
                    pendingRewind.turnNumber
                  );
                } else {
                  // 新規会話の場合は削除されるメッセージ数を計算
                  const yesKeepCount = pendingRewind.turnNumber * 2;
                  yesDeletedCount = messages.length - yesKeepCount;
                }

                // メモリ上の messages 配列も更新
                const keepCount = pendingRewind.turnNumber * 2;
                messages = messages.slice(0, keepCount);

                console.log('');
                console.log(`✅ 会話 #${pendingRewind.turnNumber} まで巻き戻しました`);
                console.log(`削除されたメッセージ: ${yesDeletedCount}件`);
                console.log('');

                // 保留中の巻き戻しをクリア
                pendingRewind = null;

                rl.prompt();
                return;
              }

              console.log('');
              console.log('❌ 実行する操作がありません');
              console.log('');
              rl.prompt();
              return;

            case '/no':
              // /retry のキャンセル
              if (pendingRetry) {
                // 前の回答を復元
                messages.push(pendingRetry.previousResponse);

                console.log('');
                console.log(`✅ ${pendingRetry.previousResponse.model || 'previous'} の回答を維持しました`);
                console.log('');

                // 保留中の回答をクリア
                pendingRetry = null;

                rl.prompt();
                return;
              }

              // /rewind のキャンセル
              if (pendingRewind) {
                console.log('');
                console.log('✅ 巻き戻しをキャンセルしました');
                console.log('');

                // 保留中の巻き戻しをクリア
                pendingRewind = null;

                rl.prompt();
                return;
              }

              console.log('');
              console.log('❌ キャンセルする操作がありません');
              console.log('');
              rl.prompt();
              return;

            case '/history':
              console.log('');
              console.log('📜 現在の会話履歴:');
              console.log('');

              // 往復単位でメッセージを取得して表示
              let historyTurns;

              if (sessionId) {
                // セッションがある場合はDBから取得
                historyTurns = getSessionMessagesWithTurns(sessionId);
              } else {
                // 新規会話の場合はメモリから往復を作成
                historyTurns = [];
                for (let i = 0; i < messages.length; i += 2) {
                  if (i + 1 < messages.length && messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
                    historyTurns.push({
                      turnNumber: Math.floor(i / 2) + 1,
                      user: messages[i],
                      assistant: messages[i + 1],
                    });
                  }
                }
              }

              if (historyTurns.length === 0) {
                console.log('  会話履歴がありません');
              } else {
                historyTurns.forEach((turn) => {
                  console.log(`[${turn.turnNumber}] You: ${turn.user.content}`);
                  const aiModel = turn.assistant.model || selectedModel;
                  const aiPreview = turn.assistant.content.length > 50
                    ? turn.assistant.content.substring(0, 50) + '...'
                    : turn.assistant.content;
                  console.log(`    AI (${aiModel}): ${aiPreview}`);
                  console.log('');
                });
              }

              console.log(`合計: ${historyTurns.length} 往復`);
              console.log('');

              rl.prompt();
              return;

            case '/rewind':
              if (args.length === 0) {
                console.log('');
                console.log('❌ 巻き戻す往復番号を指定してください: /rewind <番号>');
                console.log('');
                rl.prompt();
                return;
              }

              const rewindTurn = parseInt(args[0], 10);
              if (isNaN(rewindTurn) || rewindTurn < 1) {
                console.log('');
                console.log('❌ 有効な往復番号を指定してください');
                console.log('');
                rl.prompt();
                return;
              }

              // 現在の往復数を取得
              let rewindCurrentTurns;
              if (sessionId) {
                // セッションがある場合は DB から取得
                rewindCurrentTurns = getSessionMessagesWithTurns(sessionId);
              } else {
                // 新規会話の場合はメモリから往復を作成
                rewindCurrentTurns = [];
                for (let i = 0; i < messages.length; i += 2) {
                  if (i + 1 < messages.length && messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
                    rewindCurrentTurns.push({
                      turnNumber: Math.floor(i / 2) + 1,
                      user: messages[i],
                      assistant: messages[i + 1],
                    });
                  }
                }
              }

              if (rewindTurn >= rewindCurrentTurns.length) {
                console.log('');
                console.log(`❌ 往復 #${rewindTurn} は存在しません（現在: ${rewindCurrentTurns.length} 往復）`);
                console.log('');
                rl.prompt();
                return;
              }

              // 削除される往復数を計算
              const deletedTurns = rewindCurrentTurns.length - rewindTurn;

              console.log('');
              console.log(`⏪ 会話 #${rewindTurn} まで巻き戻します`);
              console.log(`削除される往復: #${rewindTurn + 1}〜#${rewindCurrentTurns.length} (${deletedTurns}往復)`);
              console.log('');
              console.log('この操作を実行しますか？');
              console.log('  yes, y - 巻き戻しを実行');
              console.log('  no, n  - キャンセル');
              console.log('');

              // 巻き戻し情報を保存
              pendingRewind = { sessionId, turnNumber: rewindTurn };

              rl.prompt();
              return;

            default:
              console.log('');
              console.log(`❌ 不明なコマンド: ${command}`);
              console.log('ヘルプを表示するには /help と入力してください');
              console.log('');
              rl.prompt();
              return;
          }
        }

        // パラメータ変更処理（key=value 形式）
        if (userInput.includes('=')) {
          const [key, value] = userInput.split('=').map((s) => s.trim());

          // プリセット選択
          if (key === 'preset') {
            const presetNum = parseInt(value, 10);
            const allPresets = getAllParameterPresets();

            if (isNaN(presetNum) || presetNum < 1 || presetNum > allPresets.length) {
              console.log('');
              console.log('❌ 無効なプリセット番号です');
              console.log('');
              rl.prompt();
              return;
            }

            const preset = allPresets[presetNum - 1];
            selectedParameters = {};
            if (preset.temperature !== null) selectedParameters.temperature = preset.temperature;
            if (preset.top_p !== null) selectedParameters.top_p = preset.top_p;
            if (preset.top_k !== null) selectedParameters.top_k = preset.top_k;
            if (preset.repeat_penalty !== null) selectedParameters.repeat_penalty = preset.repeat_penalty;
            if (preset.num_ctx !== null) selectedParameters.num_ctx = preset.num_ctx;

            console.log('');
            console.log(`✅ プリセット「${preset.display_name}」を適用しました`);
            console.log('');
            rl.prompt();
            return;
          }

          // 個別パラメータ変更
          const validParams = ['temperature', 'top_p', 'top_k', 'repeat_penalty', 'num_ctx'];
          if (validParams.includes(key)) {
            const numValue = parseFloat(value);

            if (isNaN(numValue)) {
              console.log('');
              console.log('❌ 無効な値です（数値を入力してください）');
              console.log('');
              rl.prompt();
              return;
            }

            // バリデーション
            if (key === 'temperature' && (numValue < 0 || numValue > 2)) {
              console.log('');
              console.log('❌ temperature は 0.0 〜 2.0 の範囲で指定してください');
              console.log('');
              rl.prompt();
              return;
            }

            if (key === 'top_p' && (numValue < 0 || numValue > 1)) {
              console.log('');
              console.log('❌ top_p は 0.0 〜 1.0 の範囲で指定してください');
              console.log('');
              rl.prompt();
              return;
            }

            if (key === 'top_k' && (numValue < 1 || numValue > 100)) {
              console.log('');
              console.log('❌ top_k は 1 〜 100 の範囲で指定してください');
              console.log('');
              rl.prompt();
              return;
            }

            if (key === 'repeat_penalty' && (numValue < 1 || numValue > 2)) {
              console.log('');
              console.log('❌ repeat_penalty は 1.0 〜 2.0 の範囲で指定してください');
              console.log('');
              rl.prompt();
              return;
            }

            if (key === 'num_ctx' && (numValue < 512 || numValue > 8192)) {
              console.log('');
              console.log('❌ num_ctx は 512 〜 8192 の範囲で指定してください');
              console.log('');
              rl.prompt();
              return;
            }

            // パラメータを更新
            if (!selectedParameters) {
              selectedParameters = {};
            }

            (selectedParameters as any)[key] = numValue;

            console.log('');
            console.log(`✅ ${key} を ${numValue} に設定しました`);
            console.log('');
            rl.prompt();
            return;
          }
        }

        // 通常のメッセージ処理
        // もしモデル選択待ち状態の場合は、キャンセル
        if (pendingRetryModelSelection) {
          console.log('');
          console.log('ℹ️  モデル選択をキャンセルしました');
          console.log('');
          pendingRetryModelSelection = false;
        }

        // もし保留中の回答がある場合は、元の回答を復元
        if (pendingRetry) {
          messages.push(pendingRetry.previousResponse);
          console.log('');
          console.log(`ℹ️  保留中の回答を破棄し、${pendingRetry.previousResponse.model || 'previous'} の回答を維持しました`);
          console.log('');
          pendingRetry = null;
        }

        // もし保留中の巻き戻しがある場合は、キャンセル
        if (pendingRewind) {
          console.log('');
          console.log('ℹ️  巻き戻しをキャンセルしました');
          console.log('');
          pendingRewind = null;
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
              process.stdout.write(`AI (${selectedModel}): `);
              isFirstChunk = false;
            }
            fullResponse += chunk;
            process.stdout.write(chunk);
          }, selectedParameters);

          // アシスタントの応答を履歴に追加（モデル名も記録）
          messages.push({
            role: 'assistant',
            content: fullResponse,
            model: selectedModel,
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
      console.log('');
      console.log('💡 会話を再開するには:');
      console.log('  llamune chat --continue <ID>');
      console.log('  llmn chat --continue <ID>');
      console.log('');
      console.log('例: llmn chat --continue 1');
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
