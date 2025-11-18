import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RetryModal } from './RetryModal';
import { RetryConfirmation } from './RetryConfirmation';

export function ChatWindow() {
  const { messages, currentModel, currentPresetId, models, presets, error, isRetryPending, setCurrentModel, acceptRetry, rejectRetry } = useChatStore();
  const { sendMessage, retryMessage, streamingContent, isStreaming } = useChat();
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);

  const handleRetry = (modelName: string, presetId: number | null) => {
    retryMessage(modelName, presetId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Llamune Chat
          </h1>
          {models.length > 0 && (
            <select
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              disabled={isStreaming || messages.length > 0}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={messages.length > 0 ? "モデルを変更するには New Chat で新しい会話を開始してください" : ""}
            >
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
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
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        onRetry={!isRetryPending ? () => setIsRetryModalOpen(true) : undefined}
        isStreaming={isStreaming}
      />

      {/* Retry Confirmation */}
      {isRetryPending && (
        <RetryConfirmation
          onAccept={acceptRetry}
          onReject={rejectRetry}
        />
      )}

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={isStreaming || isRetryPending} />

      {/* Retry Modal */}
      <RetryModal
        isOpen={isRetryModalOpen}
        onClose={() => setIsRetryModalOpen(false)}
        models={models}
        presets={presets}
        currentModel={currentModel}
        currentPresetId={currentPresetId}
        onRetry={handleRetry}
      />
    </div>
  );
}
