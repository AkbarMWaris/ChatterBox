import { formatTime } from '../utils/formatTime';

export default function MessageBubble({ message, isOwn }) {
  const readByOthers = message.status === 'read';

  return (
    <div className={`message-row ${isOwn ? 'own' : ''}`}>
      {!isOwn && (
        <span className="avatar avatar-small" style={{ backgroundColor: message.user.color }}>
          {message.user.name.charAt(0).toUpperCase()}
        </span>
      )}

      <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
        {!isOwn && <div className="message-sender">{message.user.name}</div>}
        <div className="message-text">{message.text}</div>
        <div className="message-meta">
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span className="read-status" title={readByOthers ? 'Read' : 'Delivered'}>
              {readByOthers ? '\u2713\u2713' : '\u2713'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
