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
  OllamaError,
} from './utils/ollama.js';
import {
  getSystemSpec,
  getRecommendedModels,
  displaySystemSpec,
  displayRecommendedModels,
} from './utils/system.js';

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

// chat コマンド（後で実装）
program
  .command('chat')
  .description('チャットを開始')
  .option('-m, --model <model>', 'モデルを指定', 'gemma2:9b')
  .option('-t, --temperature <temp>', '温度パラメータ', '0.7')
  .option('-c, --continue <session-id>', '会話を継続')
  .action((options) => {
    console.log('💬 Chat モードを起動します...');
    console.log('モデル:', options.model);
    console.log('Temperature:', options.temperature);
    console.log('');
    console.log('⚠️  このコマンドは開発中です');
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

// history コマンド（後で実装）
program
  .command('history')
  .description('会話履歴を表示')
  .option('-n, --limit <number>', '表示する履歴数', '10')
  .action((options) => {
    console.log('📜 会話履歴を表示します...');
    console.log('表示件数:', options.limit);
    console.log('');
    console.log('⚠️  このコマンドは開発中です');
  });

// コマンドをパース
program.parse(process.argv);
