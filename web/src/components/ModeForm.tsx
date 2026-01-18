/**
 * モード作成・編集フォームコンポーネント
 */

import { useState, useEffect } from 'react';
import { createMode, updateMode } from '../api/client';
import type { Mode } from '../types';
import './ModeForm.css';

// アイコン選択肢
const ICON_OPTIONS = [
  { value: '💻', label: '💻 コーディング' },
  { value: '🤖', label: '🤖 AI・ロボット' },
  { value: '✍️', label: '✍️ ライティング' },
  { value: '🎨', label: '🎨 クリエイティブ' },
  { value: '📊', label: '📊 分析・データ' },
  { value: '🔬', label: '🔬 研究・学術' },
  { value: '💼', label: '💼 ビジネス' },
  { value: '🎓', label: '🎓 教育・学習' },
  { value: '🌍', label: '🌍 翻訳・言語' },
  { value: '🎮', label: '🎮 ゲーム' },
  { value: '📚', label: '📚 読書・文学' },
  { value: '🎵', label: '🎵 音楽' },
  { value: '🏃', label: '🏃 健康・フィットネス' },
  { value: '🍳', label: '🍳 料理・レシピ' },
  { value: '🛠️', label: '🛠️ エンジニアリング' },
  { value: '💡', label: '💡 アイデア・創造' },
  { value: '📱', label: '📱 テクノロジー' },
  { value: '🎯', label: '🎯 目標・計画' },
  { value: '⚡', label: '⚡ 効率化' },
  { value: '🌟', label: '🌟 その他' },
];

interface ModeFormProps {
  mode: Mode | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModeForm({ mode, onClose, onSuccess }: ModeFormProps) {
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    icon: '',
    systemPrompt: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode) {
      setFormData({
        displayName: mode.display_name,
        description: mode.description || '',
        icon: mode.icon || '',
        systemPrompt: mode.system_prompt || '',
      });
    }
  }, [mode]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode) {
        // 編集
        await updateMode(mode.id, {
          displayName: formData.displayName,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          systemPrompt: formData.systemPrompt || undefined,
        });
      } else {
        // 新規作成
        await createMode({
          displayName: formData.displayName,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          systemPrompt: formData.systemPrompt || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mode');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode ? 'モードを編集' : '新しいモードを作成'}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="mode-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="displayName">
              表示名 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              required
              placeholder="例: 一般的な対話"
              readOnly={mode?.is_default === 1}
              disabled={mode?.is_default === 1}
              className={mode?.is_default === 1 ? 'readonly-field' : ''}
            />
            <small>
              {mode?.is_default === 1 
                ? 'デフォルトモードの表示名は変更できません' 
                : 'ユーザーに表示される名前'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="icon">アイコン</label>
            <select
              id="icon"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              className="icon-select"
            >
              <option value="">選択してください</option>
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>モードを識別するアイコン</small>
          </div>

          <div className="form-group">
            <label htmlFor="description">説明</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="このモードの簡単な説明"
            />
          </div>

          <div className="form-group">
            <label htmlFor="systemPrompt">システムプロンプト</label>
            <textarea
              id="systemPrompt"
              name="systemPrompt"
              value={formData.systemPrompt}
              onChange={handleChange}
              rows={10}
              placeholder="このモードで使用するシステムプロンプトを入力してください"
              className="code-textarea"
            />
            <small>
              LLMに送信される初期指示。空の場合はデフォルトの動作になります。
            </small>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              キャンセル
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '保存中...' : mode ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
