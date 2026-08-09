export default function Sidebar({ currentUser, members, connected, onLogout }) {
  const onlineUsers = members.filter((member) => member.online);

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
        <h2 className="sidebar-heading">
          Online <span className="online-count">({onlineUsers.length})</span>
        </h2>
        <ul className="user-list">
          {onlineUsers.map((person) => (
            <li key={person.name} className="user-list-item">
              <span className="avatar avatar-small" style={{ backgroundColor: person.color }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span className="user-list-name">
                {person.name}
                {person.name === currentUser.name ? ' (you)' : ''}
              </span>
              <span className="presence-dot" />
            </li>
          ))}
          {onlineUsers.length === 0 && (
            <li className="user-list-empty">No one is online right now</li>
          )}
        </ul>
      </div>

      <div className="sidebar-footer">
        {connected ? 'Connected to chat server' : 'Server unreachable'}
      </div>
    </aside>
  );
}
