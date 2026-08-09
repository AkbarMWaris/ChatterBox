import { useState } from 'react';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';

const STORAGE_KEY = 'chatterbox-user';

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(getSavedUser);

  function handleLogin(loginUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loginUser));
    setUser(loginUser);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  function handleUserUpdate(updatedUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <ChatRoom user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
}
