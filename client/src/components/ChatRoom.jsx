import { useState } from 'react';
import useChat from '../hooks/useChat';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatRoom({ user, onLogout, onUserUpdate }) {
  const [notice, setNotice] = useState(null);
  const [userColor, setUserColor] = useState(user.color);

  const { messages, onlineUsers, typingUsers, connected, sendMessage, notifyTyping } = useChat(
    user,
    (message) => setNotice(message),
    (color) => {
      setUserColor(color);
      onUserUpdate({ ...user, color });
    }
  );

  function handleSend(text) {
    const ok = sendMessage(text);
    if (!ok) setNotice('Not connected to the server yet, please wait a second');
  }

  const currentUser = { ...user, color: userColor };

  return (
    <div className="chat-layout">
      <Sidebar
        currentUser={currentUser}
        onlineUsers={onlineUsers}
        connected={connected}
        onLogout={onLogout}
      />

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <h1 className="chat-title">General room</h1>
            <span className="chat-subtitle">
              {connected ? 'Everyone can see this room' : 'Reconnecting...'}
            </span>
          </div>
          <span className={`status-pill ${connected ? 'status-online' : 'status-offline'}`}>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </header>

        {notice && (
          <div className="banner">
            <span>{notice}</span>
            <button className="banner-close" onClick={() => setNotice(null)}>
              x
            </button>
          </div>
        )}

        <MessageList
          messages={messages}
          typingUsers={typingUsers}
          currentUserName={user.name}
        />
        <MessageInput onSend={handleSend} onTyping={notifyTyping} disabled={!connected} />
      </main>
    </div>
  );
}
