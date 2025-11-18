import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../types';

const API_BASE_URL = '/api';

export function useChat() {
  const {
    currentSessionId,
    currentModel,
    messages,
    addMessage,
    setCurrentSession,
    setIsStreaming,
    setError,
  } = useChatStore();

  const [streamingContent, setStreamingContent] = useState('');

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      role: 'user',
      content,
    };
    addMessage(userMessage);
    setIsStreaming(true);
    setError(null);
    setStreamingContent('');

    try {
      const response = await fetch(`${API_BASE_URL}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          content,
          modelName: currentModel,
          history: currentSessionId ? undefined : messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6);
          console.log('📥 SSE data:', data);

          try {
            if (data === '[DONE]') break;

            const parsed = JSON.parse(data);
            console.log('📦 Parsed SSE:', parsed);

            if (parsed.content) {
              fullContent = parsed.content;
              setStreamingContent(fullContent);
              console.log('📝 Streaming content updated:', fullContent.substring(0, 50));
            } else if (parsed.sessionId) {
              setCurrentSession(parsed.sessionId);
              fullContent = parsed.fullContent;
              console.log('✅ Done! Session:', parsed.sessionId, 'Full content length:', fullContent?.length);
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', e);
          }
        }
      }

      // アシスタントメッセージを追加
      console.log('💬 Adding assistant message, content length:', fullContent?.length);
      const assistantMessage: Message = {
        role: 'assistant',
        content: fullContent,
        model: currentModel,
      };
      addMessage(assistantMessage);
      setStreamingContent('');
    } catch (error) {
      console.error('Send message error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    sendMessage,
    streamingContent,
    isStreaming: useChatStore((state) => state.isStreaming),
  };
}
