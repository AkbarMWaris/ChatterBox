import { useEffect, useState } from 'react';
import useChat from '../hooks/useChat';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import MembersModal from './MembersModal';
import { dmRoom } from '../utils/room';

export default function ChatRoom({ user, onLogout, onUserUpdate }) {
  const [notice, setNotice] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [userColor, setUserColor] = useState(user.color);
  // { type: 'group' } or { type: 'dm', name: 'Alice' }
  const [chat, setChat] = useState({ type: 'group' });

  const { messages, members, typingUsers, unread, connected, sendMessage, notifyTyping, openRoom } =
    useChat(
      user,
      (message) => setNotice(message),
      (color) => {
        setUserColor(color);
        onUserUpdate({ ...user, color });
      }
    );

  const isDm = chat.type === 'dm';
  const activeRoom = isDm ? dmRoom(user.name, chat.name) : 'group';
  const dmMember = isDm ? members.find((m) => m.name === chat.name) : null;
  const onlineCount = members.filter((member) => member.online).length;

  useEffect(() => {
    openRoom(activeRoom);
  }, [activeRoom]);

  function handleSend(text, attachment) {
    const ok = sendMessage(text, isDm ? chat.name : null, attachment);
    if (!ok) setNotice('Not connected to the server yet, please wait a second');
  }

  function handleTyping(isTyping) {
    notifyTyping(isTyping, isDm ? chat.name : null);
  }

  const currentUser = { ...user, color: userColor };

  return (
    <div className="chat-layout">
      <Sidebar
        currentUser={currentUser}
        members={members}
        activeRoom={activeRoom}
        unread={unread}
        onSelectChat={setChat}
        connected={connected}
        onLogout={onLogout}
      />

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <h1 className="chat-title">{isDm ? chat.name : 'General room'}</h1>
            <span className="chat-subtitle">
              {isDm
                ? dmMember?.online
                  ? 'Online'
                  : `Last seen ${dmMember ? new Date(dmMember.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                : connected
                  ? `${onlineCount} online in the room`
                  : 'Reconnecting...'}
            </span>
          </div>
          <div className="chat-header-actions">
            {!isDm && (
              <button
                className="info-button"
                onClick={() => setShowMembers(true)}
                title="Group info"
                aria-label="Group info"
              >
                i
              </button>
            )}
            <span className={`status-pill ${connected ? 'status-online' : 'status-offline'}`}>
              {connected ? 'Connected' : 'Offline'}
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

        <MessageInput
          key={activeRoom}
          onSend={handleSend}
          onTyping={handleTyping}
          onUploadError={(msg) => setNotice(msg)}
          disabled={!connected}
        />
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
