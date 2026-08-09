import { useRef, useState } from 'react';
import { uploadFile } from '../api/messages';

export default function MessageInput({ onSend, onTyping, onUploadError, disabled }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState(null);
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

  // the same Send button sends text, a staged file, or both
  function handleSubmit(event) {
    event.preventDefault();
    if (disabled || uploading) return;

    const trimmed = text.trim();
    if (attachment) {
      onSend(trimmed, attachment);
      setAttachment(null);
    } else if (trimmed) {
      onSend(trimmed);
    } else {
      return;
    }

    setText('');
    notifyTyping(false);
    clearTimeout(typingTimer.current);
  }

  // selecting a file only stages it - nothing is sent until Send is clicked
  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled || uploading) return;

    setUploading(true);
    setAttachment(null);
    try {
      const { data } = await uploadFile(file);
      setAttachment(data);
    } catch (err) {
      if (onUploadError) onUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleCancelAttachment() {
    setAttachment(null);
  }

  return (
    <div className="message-composer">
      {attachment && (
        <div className="attach-preview">
          <div className="attach-preview-box">
            {attachment.type === 'image' ? (
              <img className="attach-preview-thumb" src={attachment.url} alt={attachment.name} />
            ) : (
              <video className="attach-preview-thumb" src={attachment.url} muted />
            )}
            <button
              className="attach-preview-cancel"
              onClick={handleCancelAttachment}
              title="Remove attachment"
              aria-label="Remove attachment"
            >
              x
            </button>
          </div>
          <span className="attach-preview-name">{attachment.name}</span>
        </div>
      )}
      <form className="message-input" onSubmit={handleSubmit}>
        <button
          type="button"
          className="attach-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || Boolean(attachment)}
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
            disabled
              ? 'Connecting to server...'
              : uploading
                ? 'Uploading...'
                : attachment
                  ? 'Add a caption (optional)'
                  : 'Type a message'
          }
          onChange={handleChange}
          disabled={disabled}
          maxLength={1000}
          autoFocus
        />
        {uploading && <span className="message-upload-hint">Uploading...</span>}
        <button
          className="message-input-button"
          type="submit"
          disabled={disabled || uploading || (!text.trim() && !attachment)}
        >
          Send
        </button>
      </form>
    </div>
  );
}
