import React, { useEffect, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { fetchSessions, fetchSession } from '../../utils/api';
import type { Session } from '../../types';

export function SessionList() {
  const { currentSessionId, setCurrentSession, setMessages, resetChat, setSessions } = useChatStore();
  const [sessions, setLocalSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

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
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-sm font-medium truncate">
                  {session.preview || 'New Chat'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {session.message_count} messages • {session.model}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
