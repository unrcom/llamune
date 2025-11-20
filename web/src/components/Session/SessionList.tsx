import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { fetchSessions, fetchSession, updateSessionTitle } from '../../utils/api';
import type { Session } from '../../types';

export function SessionList() {
  const { currentSessionId, setCurrentSession, setMessages, resetChat, setSessions } = useChatStore();
  const [sessions, setLocalSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetchSessions();
      setLocalSessions(response.sessions);
      setSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const response = await fetchSession(sessionId);
      setCurrentSession(sessionId);
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // currentSessionIdが変更されたら（新しいセッションが作成されたら）一覧を更新
  useEffect(() => {
    if (currentSessionId) {
      loadSessions();
    }
  }, [currentSessionId]);

  const handleNewChat = () => {
    resetChat();
  };

  const startEditing = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditingTitle(session.title || session.preview || '');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveTitle = async () => {
    if (editingId === null) return;

    try {
      await updateSessionTitle(editingId, editingTitle);
      setLocalSessions(sessions.map(s =>
        s.id === editingId ? { ...s, title: editingTitle } : s
      ));
      setSessions(sessions.map(s =>
        s.id === editingId ? { ...s, title: editingTitle } : s
      ));
    } catch (error) {
      console.error('Failed to update title:', error);
    } finally {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + 新しいチャット
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
            セッションがありません
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => editingId !== session.id && loadSession(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer group ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {editingId === session.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveTitle}
                    className="w-full text-sm font-medium bg-white dark:bg-gray-800 border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium truncate flex-1">
                      {session.title || session.preview || 'New Chat'}
                    </div>
                    <button
                      onClick={(e) => startEditing(session, e)}
                      className="opacity-0 group-hover:opacity-100 ml-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                      title="タイトルを編集"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {session.message_count} messages • {session.model}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
