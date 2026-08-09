export default function TypingIndicator({ names }) {
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''} are typing`;

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </span>
      <span className="typing-label">{label}</span>
    </div>
  );
}
