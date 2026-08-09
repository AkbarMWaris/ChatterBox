import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function useChat(user, onServerError, onUserJoined) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const typingTimers = useRef(new Map());

  // mark a message as seen if it was not written by me
  function markSeen(socket, message) {
    if (message.user.name !== user.name) {
      socket.emit('message:read', { messageId: message.id });
    }
  }

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('user:joined', ({ name, color }) => {
      // server assigns the avatar color; surface it so the UI stays consistent
      if (onUserJoined) onUserJoined(color);
    });

    socket.on('chat:history', (history) => {
      setMessages(history);
      // refresh also counts as "seen" - push read state for other people's messages
      history.forEach((message) => markSeen(socket, message));
    });

    socket.on('message:new', (message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
      // auto mark messages as read when they arrive on an open screen
      markSeen(socket, message);
    });

    socket.on('message:read', (updated) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
    });

    socket.on('members:update', setMembers);

    socket.on('system:notice', (notice) => {
      setMessages((prev) => [...prev, notice]);
    });

    socket.on('typing', ({ user: name, isTyping }) => {
      const timers = typingTimers.current;
      clearTimeout(timers.get(name));

      if (isTyping) {
        timers.set(
          name,
          setTimeout(() => {
            timers.delete(name);
            setTypingUsers((prev) => prev.filter((n) => n !== name));
          }, 3000)
        );
        setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
      } else {
        timers.delete(name);
        setTypingUsers((prev) => prev.filter((n) => n !== name));
      }
    });

    socket.on('message:error', (err) => {
      if (onServerError) onServerError(err.message);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection failed:', err.message);
      if (onServerError) onServerError('Could not reach the chat server');
    });

    socket.emit('user:join', user);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      typingTimers.current.forEach((timer) => clearTimeout(timer));
      typingTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendMessage(text) {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('message:send', { text });
    socketRef.current.emit('typing', false);
    return true;
  }

  function notifyTyping(isTyping) {
    socketRef.current?.emit('typing', isTyping);
  }

  return { messages, members, typingUsers, connected, sendMessage, notifyTyping };
}
