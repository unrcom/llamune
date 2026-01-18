/**
 * Llamune Web アプリケーション
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { Chat } from './components/Chat';
import { ModesManagement } from './components/ModesManagement';
import './App.css';

type Page = 'chat' | 'modes';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('chat');

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <nav className="app-nav">
        <div className="nav-brand">Llamune</div>
        <div className="nav-links">
          <button
            className={`nav-link ${currentPage === 'chat' ? 'active' : ''}`}
            onClick={() => setCurrentPage('chat')}
          >
            💬 チャット
          </button>
          <button
            className={`nav-link ${currentPage === 'modes' ? 'active' : ''}`}
            onClick={() => setCurrentPage('modes')}
          >
            ⚙️ モード管理
          </button>
        </div>
        <div className="nav-user">
          <span className="user-name">{user.username}</span>
          <button className="btn-logout" onClick={logout}>
            ログアウト
          </button>
        </div>
      </nav>
      <main className="app-main">
        {currentPage === 'chat' && <Chat />}
        {currentPage === 'modes' && <ModesManagement />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
