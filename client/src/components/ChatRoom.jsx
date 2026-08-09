import { useState } from 'react';
import useChat from '../hooks/useChat';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import MembersModal from './MembersModal';

export default function ChatRoom({ user, onLogout, onUserUpdate }) {
  const [notice, setNotice] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [userColor, setUserColor] = useState(user.color);

  const { messages, members, typingUsers, connected, sendMessage, notifyTyping } = useChat(
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
  const onlineCount = members.filter((member) => member.online).length;

  return (
    <div className="chat-layout">
      <Sidebar
        currentUser={currentUser}
        members={members}
        connected={connected}
        onLogout={onLogout}
      />

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <h1 className="chat-title">General room</h1>
            <span className="chat-subtitle">
              {connected ? `${onlineCount} online in the room` : 'Reconnecting...'}
            </span>
          </div>
          <div className="chat-header-actions">
            <button
              className="info-button"
              onClick={() => setShowMembers(true)}
              title="Group info"
              aria-label="Group info"
            >
              i
            </button>
            <span className={`status-pill ${connected ? 'status-online' : 'status-offline'}`}>
              {connected ? `Connected` : 'Offline'}
            </span>
          </div>
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

      {showMembers && (
        <MembersModal
          members={members}
          currentUserName={user.name}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
