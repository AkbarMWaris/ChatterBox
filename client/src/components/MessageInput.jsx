import { useRef, useState } from 'react';
import { uploadFile } from '../api/messages';

export default function MessageInput({ onSend, onTyping, onUploadError, disabled }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const fileInputRef = useRef(null);
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
    if ((!trimmed || disabled) && !uploading) return;

    onSend(trimmed);
    setText('');
    notifyTyping(false);
    clearTimeout(typingTimer.current);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled || uploading) return;

    setUploading(true);
    setUploadName(file.name);
    try {
      const { data } = await uploadFile(file);
      onSend('', data);
    } catch (err) {
      if (onUploadError) onUploadError(err.message);
    } finally {
      setUploading(false);
      setUploadName('');
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <button
        type="button"
        className="attach-button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        title="Attach an image or video"
        aria-label="Attach an image or video"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFile}
        hidden
      />
      <input
        className="message-input-field"
        type="text"
        value={text}
        placeholder={
          disabled ? 'Connecting to server...' : uploading ? 'Uploading...' : 'Type a message'
        }
        onChange={handleChange}
        disabled={disabled}
        maxLength={1000}
        autoFocus
      />
      {uploading && <span className="message-upload-hint">{uploadName}</span>}
      <button
        className="message-input-button"
        type="submit"
        disabled={disabled || uploading || (!text.trim() && !uploading)}
      >
        Send
      </button>
    </form>
  );
}
