/**
 * システムスペック検出ユーティリティ
 */

import os from 'os';
import {
  getRecommendedModelsByMemory,
  initializeDefaultRecommendedModels,
  type RecommendedModel as DBRecommendedModel,
} from './database.js';

/**
 * システムスペック情報
 */
export interface SystemSpec {
  totalMemoryGB: number;
  cpuCores: number;
  platform: string;
  arch: string;
}

/**
 * 推奨モデル情報（表示用）
 */
export interface RecommendedModel {
  name: string;
  size: string;
  description: string;
  priority: number;
}

/**
 * システムスペックを取得
 */
export function getSystemSpec(): SystemSpec {
  const totalMemoryBytes = os.totalmem();
  const totalMemoryGB = Math.round(totalMemoryBytes / (1024 ** 3));
  const cpuCores = os.cpus().length;
  const platform = os.platform();
  const arch = os.arch();

  return {
    totalMemoryGB,
    cpuCores,
    platform,
    arch,
  };
}

/**
 * スペックに応じた推奨モデルを取得（データベースから）
 */
export function getRecommendedModels(spec: SystemSpec): RecommendedModel[] {
  const { totalMemoryGB } = spec;

  // データベースが未初期化の場合は初期化
  initializeDefaultRecommendedModels();

  // データベースから推奨モデルを取得
  const dbModels = getRecommendedModelsByMemory(totalMemoryGB);

  // 表示用の形式に変換
  return dbModels.map((model) => ({
    name: model.model_name,
    size: model.model_size,
    description: model.description,
    priority: model.priority,
  }));
}

/**
 * システムスペックを表示
 */
export function displaySystemSpec(spec: SystemSpec): void {
  console.log('💻 システムスペック:');
  console.log(`  メモリ: ${spec.totalMemoryGB} GB`);
  console.log(`  CPU: ${spec.cpuCores} コア`);
  console.log(`  プラットフォーム: ${spec.platform} (${spec.arch})`);
  console.log('');
}

/**
 * 推奨モデルを表示
 */
export function displayRecommendedModels(models: RecommendedModel[]): void {
  console.log('🎯 あなたのマシンに最適なモデル:');
  console.log('');

  models.forEach((model, index) => {
    const badge = index === 0 ? '⭐ 最推奨' : `  推奨${index + 1}`;
    console.log(`${badge}`);
    console.log(`  名前: ${model.name}`);
    console.log(`  サイズ: ${model.size}`);
    console.log(`  説明: ${model.description}`);
    console.log('');
  });

  console.log('インストール方法:');
  console.log(`  llamune pull ${models[0].name}`);
  console.log(`  または: llmn pull ${models[0].name}`);
  console.log('');
}
