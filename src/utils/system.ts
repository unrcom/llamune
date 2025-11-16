/**
 * システムスペック検出ユーティリティ
 */

import os from 'os';

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
 * 推奨モデル情報
 */
export interface RecommendedModel {
  name: string;
  size: string;
  description: string;
  priority: number; // 1が最優先
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
 * スペックに応じた推奨モデルを取得
 */
export function getRecommendedModels(spec: SystemSpec): RecommendedModel[] {
  const { totalMemoryGB } = spec;

  // RAM 8GB以下
  if (totalMemoryGB <= 8) {
    return [
      {
        name: 'gemma2:2b',
        size: '1.6 GB',
        description: '軽量で高速。低スペックPCに最適',
        priority: 1,
      },
      {
        name: 'qwen2.5:3b',
        size: '2.0 GB',
        description: 'コンパクトながら高性能',
        priority: 2,
      },
    ];
  }

  // RAM 16GB
  if (totalMemoryGB <= 16) {
    return [
      {
        name: 'gemma2:9b',
        size: '5.4 GB',
        description: 'バランス型。品質と速度を両立',
        priority: 1,
      },
      {
        name: 'qwen2.5:7b',
        size: '4.7 GB',
        description: '日本語性能が高い',
        priority: 2,
      },
    ];
  }

  // RAM 32GB以上
  return [
    {
      name: 'qwen2.5:14b',
      size: '8.5 GB',
      description: '高性能。複雑なタスクに対応',
      priority: 1,
    },
    {
      name: 'deepseek-r1:7b',
      size: '4.7 GB',
      description: '推論特化。思考プロセスを表示',
      priority: 2,
    },
    {
      name: 'gemma2:9b',
      size: '5.4 GB',
      description: 'バランス型。汎用性が高い',
      priority: 3,
    },
  ];
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
