import { useState } from 'react';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name to join');
      return;
    }
    onLogin({ name: trimmed.slice(0, 20) });
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Chatterbox</h1>
        <p className="login-subtitle">A tiny chat room. Pick a name and jump in.</p>

        <label className="login-label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="login-input"
          type="text"
          value={name}
          maxLength={20}
          placeholder="@username"
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError('');
          }}
          autoFocus
        />
        {error && <span className="login-error">{error}</span>}

        <button className="login-button" type="submit" disabled={!name.trim()}>
          Join the chat
        </button>
      </form>
    </div>
  );
}
