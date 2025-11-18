import { useEffect } from 'react';
import { SessionList } from './components/Session/SessionList';
import { ChatWindow } from './components/Chat/ChatWindow';
import { useChatStore } from './store/chatStore';
import { fetchModels, fetchPresets } from './utils/api';

function App() {
  const setModels = useChatStore((state) => state.setModels);
  const setPresets = useChatStore((state) => state.setPresets);

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

    // プリセット一覧を取得
    const loadPresets = async () => {
      try {
        const { presets } = await fetchPresets();
        setPresets(presets);
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    };

    loadModels();
    loadPresets();
  }, [setModels, setPresets]);

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
