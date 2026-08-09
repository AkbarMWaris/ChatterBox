import { formatTime } from '../utils/formatTime';

export default function MembersModal({ members, currentUserName, onClose }) {
  const onlineCount = members.filter((member) => member.online).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Group members</h3>
          <button className="modal-close" onClick={onClose}>
            x
          </button>
        </div>
        <p className="modal-subtitle">
          {members.length} member{members.length === 1 ? '' : 's'} · {onlineCount} online
        </p>

        <ul className="modal-member-list">
          {members.map((person) => (
            <li key={person.name} className="modal-member">
              <span className="avatar avatar-small" style={{ backgroundColor: person.color }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
              <div className="modal-member-info">
                <span className="modal-member-name">
                  {person.name}
                  {person.name === currentUserName ? ' (you)' : ''}
                </span>
                <span className="modal-member-status">
                  {person.online
                    ? 'Online'
                    : `Last seen ${formatTime(person.lastSeen)}`}
                </span>
              </div>
              <span className={`presence-dot ${person.online ? '' : 'presence-offline'}`} />
            </li>
          ))}
          {members.length === 0 && (
            <li className="modal-member-empty">No one has joined yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}
