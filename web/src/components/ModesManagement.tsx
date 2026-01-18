/**
 * モード管理コンポーネント
 */

import { useState, useEffect } from 'react';
import { getModes, deleteMode } from '../api/client';
import type { Mode } from '../types';
import { ModeForm } from './ModeForm';
import './ModesManagement.css';

export function ModesManagement({ onNavigateToChat }: { onNavigateToChat: () => void }) {
  const [modes, setModes] = useState<Mode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMode, setEditingMode] = useState<Mode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadModes();
  }, []);

  async function loadModes() {
    try {
      setLoading(true);
      setError(null);
      const data = await getModes();
      setModes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modes');
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingMode(null);
    setShowForm(true);
  }

  function handleEdit(mode: Mode) {
    setEditingMode(mode);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingMode(null);
  }

  async function handleFormSuccess() {
    setShowForm(false);
    setEditingMode(null);
    await loadModes();
  }

  async function handleDelete(id: number) {
    try {
      setError(null);
      await deleteMode(id);
      await loadModes();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mode');
    }
  }

  if (loading) {
    return (
      <div className="modes-management">
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modes-management">
      <div className="modes-header">
        <div className="modes-header-left">
          <button className="btn-back" onClick={onNavigateToChat}>
            ← チャットに戻る
          </button>
          <h2>モード管理</h2>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          新しいモードを作成
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="modes-table-container">
        <table className="modes-table">
          <thead>
            <tr>
              <th>アイコン</th>
              <th>表示名</th>
              <th>説明</th>
              <th>デフォルト</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {modes.map((mode) => (
              <tr key={mode.id}>
                <td className="mode-icon">{mode.icon || '🤖'}</td>
                <td className="mode-display-name">{mode.display_name}</td>
                <td className="mode-description">
                  {mode.description || '-'}
                </td>
                <td className="mode-default">
                  {mode.is_default ? '✓' : ''}
                </td>
                <td className="mode-actions">
                  <button
                    className="btn-small btn-secondary"
                    onClick={() => handleEdit(mode)}
                  >
                    編集
                  </button>
                  {!mode.is_default && (
                    <>
                      {deleteConfirm === mode.id ? (
                        <div className="delete-confirm">
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleDelete(mode.id)}
                          >
                            確認
                          </button>
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-small btn-danger"
                          onClick={() => setDeleteConfirm(mode.id)}
                        >
                          削除
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {modes.length === 0 && (
          <div className="empty-state">
            <p>モードがありません</p>
          </div>
        )}
      </div>

      {showForm && (
        <ModeForm
          mode={editingMode}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
