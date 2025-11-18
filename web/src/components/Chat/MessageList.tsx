import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
}

export function MessageList({ messages, streamingContent }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-3xl rounded-lg px-4 py-3 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}
          >
            {message.role === 'assistant' && message.model && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {message.model}
              </div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-3xl rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <div className="animate-pulse">▋</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
