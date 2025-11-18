import { SessionList } from './components/Session/SessionList';
import { ChatWindow } from './components/Chat/ChatWindow';

function App() {
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
