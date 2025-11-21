import { useEffect, useState } from 'react';
import { SessionList } from './components/Session/SessionList';
import { ChatWindow } from './components/Chat/ChatWindow';
import { ModelManager } from './components/Models/ModelManager';
import { Login } from './components/Auth/Login';
import { useChatStore } from './store/chatStore';
import { useAuthStore } from './store/authStore';
import { fetchModels, fetchPresets } from './utils/api';

function App() {
  const setModels = useChatStore((state) => state.setModels);
  const setPresets = useChatStore((state) => state.setPresets);
  const mobileView = useChatStore((state) => state.mobileView);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 認証済みの場合のみデータを読み込む
    if (!isAuthenticated) return;

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
  }, [isAuthenticated, setModels, setPresets]);

  useEffect(() => {
    // モバイル判定
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 未認証の場合はログイン画面を表示
  if (!isAuthenticated) {
    return <Login />;
  }

  // 認証済みの場合はメインアプリを表示
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - デスクトップではSessionList/ModelManagerを切り替え、モバイルではビューに応じて表示 */}
      {isMobile ? (
        // モバイル：ビューに応じて表示切り替え
        <>
          {mobileView === 'list' && <SessionList />}
          {mobileView === 'models' && <ModelManager />}
        </>
      ) : (
        // デスクトップ：SessionListまたはModelManagerを左側に表示
        <>
          {mobileView === 'models' ? <ModelManager /> : <SessionList />}
        </>
      )}

      {/* Main Chat Area - デスクトップでは常に表示、モバイルではchatビューの時のみ表示 */}
      {(!isMobile || mobileView === 'chat') && (
        <div className="flex-1 flex flex-col">
          <ChatWindow />
        </div>
      )}
    </div>
  );
}

export default App;
