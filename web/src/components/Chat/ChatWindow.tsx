import React from 'react';
import { useChatStore } from '../../store/chatStore';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatWindow() {
  const { messages, currentModel, error } = useChatStore();
  const { sendMessage, streamingContent, isStreaming } = useChat();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Llamune Chat
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Model: {currentModel}
            </p>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              <span className="text-sm">生成中...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 px-4 py-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} streamingContent={streamingContent} />

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
