import { useRef, useState } from 'react';

export default function MessageInput({ onSend, onTyping, disabled }) {
  const [text, setText] = useState('');
  const wasTyping = useRef(false);
  const typingTimer = useRef(null);

  function notifyTyping(isTyping) {
    if (isTyping === wasTyping.current) return;
    wasTyping.current = isTyping;
    onTyping(isTyping);
  }

  function handleChange(event) {
    const value = event.target.value;
    setText(value);
    notifyTyping(value.length > 0);

    // stop the "typing" state 1.5s after the last keystroke
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => notifyTyping(false), 1500);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText('');
    notifyTyping(false);
    clearTimeout(typingTimer.current);
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        className="message-input-field"
        type="text"
        value={text}
        placeholder={disabled ? 'Connecting to server...' : 'Type a message'}
        onChange={handleChange}
        disabled={disabled}
        maxLength={1000}
        autoFocus
      />
      <button
        className="message-input-button"
        type="submit"
        disabled={disabled || !text.trim()}
      >
        Send
      </button>
    </form>
  );
}
