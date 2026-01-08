/**
 * Llamune - ローカルLLMコーディング支援プラットフォーム
 */

import { initDatabase, getAllModes } from './utils/database.js';

console.log('🦙 Llamune starting...');

// データベース初期化
console.log('📦 Initializing database...');
const db = initDatabase();
db.close();
console.log('✅ Database initialized');

// デフォルトモードの確認
console.log('📋 Default modes:');
const modes = getAllModes();
modes.forEach(mode => {
  console.log(`  ${mode.icon} ${mode.display_name} (${mode.name})`);
});

console.log('');
console.log('🎉 Llamune ready!');
