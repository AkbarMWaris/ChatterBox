import { useState } from 'react';
import { formatTime } from '../utils/formatTime';

export default function MessageBubble({ message, isOwn }) {
  const [viewing, setViewing] = useState(false);
  const readByEveryone = message.status === 'read';

  return (
    <div className={`message-row ${isOwn ? 'own' : ''}`}>
      {!isOwn && (
        <span className="avatar avatar-small" style={{ backgroundColor: message.user.color }}>
          {message.user.name.charAt(0).toUpperCase()}
        </span>
      )}

      <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
        {!isOwn && <div className="message-sender">{message.user.name}</div>}
        {message.type === 'image' && (
          <img
            className="message-image"
            src={message.file.url}
            alt={message.file.name || 'image'}
            onClick={() => setViewing(true)}
          />
        )}
        {message.type === 'video' && (
          <video
            className="message-video"
            src={message.file.url}
            controls
            preload="metadata"
          />
        )}
        {message.text && <div className="message-text">{message.text}</div>}
        <div className="message-meta">
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span
              className={`read-status ${readByEveryone ? 'read' : ''}`}
              title={readByEveryone ? 'Read by everyone' : 'Delivered'}
            >
              {'\u2713\u2713'}
            </span>
          )}
        </div>
      </div>

      {viewing && (
        <div className="message-lightbox" onClick={() => setViewing(false)}>
          <div className="message-lightbox-card" onClick={(event) => event.stopPropagation()}>
            <img className="message-lightbox-img" src={message.file.url} alt={message.file.name} />
            <div className="message-lightbox-bar">
              <span className="message-lightbox-name">{message.file.name}</span>
              <a
                className="lightbox-button"
                href={`${message.file.url}?download=1`}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
              <button
                className="lightbox-button"
                onClick={() => setViewing(false)}
                aria-label="Close preview"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
