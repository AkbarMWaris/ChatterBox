import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { dayLabel } from '../utils/formatTime';

export default function MessageList({ messages, typingUsers, currentUserName }) {
  const endRef = useRef(null);
  const containerRef = useRef(null);

  // only auto-scroll when the user is already near the bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers.length]);

  let lastDay = '';

  return (
    <div className="message-list" ref={containerRef}>
      {messages.map((message) => {
        if (message.type === 'join' || message.type === 'leave') {
          return (
            <div key={message.text + message.type} className="system-notice">
              {message.text}
            </div>
          );
        }

        const day = dayLabel(message.createdAt);
        const showDivider = day !== lastDay;
        lastDay = day;

        return (
          <div key={message.id}>
            {showDivider && <div className="day-divider">{day}</div>}
            <MessageBubble
              message={message}
              isOwn={message.user.name === currentUserName}
            />
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="typing-row">
          <TypingIndicator names={typingUsers} />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
