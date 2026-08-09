import { dmRoom } from '../utils/room';

export default function Sidebar({
  currentUser,
  members,
  activeRoom,
  unread,
  onSelectChat,
  connected,
  onLogout
}) {
  const personalChats = members
    .filter((member) => member.name !== currentUser.name)
    .sort((a, b) => Number(b.online) - Number(a.online));

  const groupRoom = 'group';
  const groupUnread = unread[groupRoom] || 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-profile">
        <span className="avatar" style={{ backgroundColor: currentUser.color }}>
          {currentUser.name.charAt(0).toUpperCase()}
        </span>
        <div className="sidebar-profile-info">
          <span className="sidebar-name">{currentUser.name}</span>
          <span className="sidebar-status">You</span>
        </div>
        <button className="logout-button" onClick={onLogout} title="Leave the chat">
          Leave
        </button>
      </div>

      <div className="sidebar-section">
        <h2 className="sidebar-heading">Group</h2>
        <button
          className={`chat-list-item ${activeRoom === groupRoom ? 'active' : ''}`}
          onClick={() => onSelectChat({ type: 'group' })}
        >
          <span className="avatar avatar-small avatar-group">G</span>
          <span className="chat-list-info">
            <span className="chat-list-name">General room</span>
            <span className="chat-list-sub">Everyone in the group</span>
          </span>
          {groupUnread > 0 && <span className="chat-list-badge">{groupUnread}</span>}
        </button>

        <h2 className="sidebar-heading sidebar-heading-spaced">
          Personal <span className="online-count">({personalChats.length})</span>
        </h2>
        {personalChats.length === 0 && (
          <p className="user-list-empty">No other members yet</p>
        )}
        {personalChats.map((person) => {
          const room = dmRoom(currentUser.name, person.name);
          const roomUnread = unread[room] || 0;
          return (
            <button
              key={person.name}
              className={`chat-list-item ${activeRoom === room ? 'active' : ''}`}
              onClick={() => onSelectChat({ type: 'dm', name: person.name })}
            >
              <span className="avatar avatar-small" style={{ backgroundColor: person.color }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span className="chat-list-info">
                <span className="chat-list-name">{person.name}</span>
                <span className="chat-list-sub">
                  {person.online ? 'Online' : 'Offline'}
                </span>
              </span>
              {roomUnread > 0 && <span className="chat-list-badge">{roomUnread}</span>}
              <span className={`presence-dot ${person.online ? '' : 'presence-offline'}`} />
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        {connected ? 'Connected to chat server' : 'Server unreachable'}
      </div>
    </aside>
  );
}
