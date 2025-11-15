#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
    console.log('🦙 Llamune - Closed Network LLM Platform');
    console.log('');
    console.log('使い方:');
    console.log('  llamune [コマンド] [オプション]');
    console.log('');
    console.log('利用可能なコマンド:');
    console.log('  chat       チャットを開始');
    console.log('  compare    複数のLLMで比較実行');
    console.log('  config     設定を管理');
    console.log('  models     利用可能なモデル一覧を表示');
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

// models コマンド（後で実装）
program
  .command('models')
  .description('利用可能なモデル一覧を表示')
  .action(() => {
    console.log('📦 利用可能なモデル:');
    console.log('');
    console.log('  ✓ gemma2:9b      (9.2B params)');
    console.log('  ✓ deepseek-r1:7b (7.0B params)');
    console.log('  ✓ qwen2.5:14b    (14.0B params)');
    console.log('');
    console.log('⚠️  このリストは仮データです');
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
