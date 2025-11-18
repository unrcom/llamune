import { useEffect } from 'react';
import { SessionList } from './components/Session/SessionList';
import { ChatWindow } from './components/Chat/ChatWindow';
import { useChatStore } from './store/chatStore';
import { fetchModels } from './utils/api';

function App() {
  const setModels = useChatStore((state) => state.setModels);

  useEffect(() => {
    // モデル一覧を取得
    const loadModels = async () => {
      try {
        const { models } = await fetchModels();
        setModels(models);
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, [setModels]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <SessionList />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatWindow />
      </div>
    </div>
  );
}

export default App;
