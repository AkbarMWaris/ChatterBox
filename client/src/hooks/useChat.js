import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { fetchMessages } from '../api/messages';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function useChat(user, onServerError, onUserJoined) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [unread, setUnread] = useState({});
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const typingTimers = useRef(new Map());
  const activeRoomRef = useRef('group');

  // mark a message as seen if it was not written by me
  function markSeen(socket, message) {
    if (message.user.name !== user.name) {
      socket.emit('message:read', { messageId: message.id });
    }
  }

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      // polling first: Render free instances sit behind a proxy that refuses
      // WebSocket upgrades, so we connect over HTTP and only upgrade where the
      // host actually supports WebSockets (local dev, paid Render, etc.)
      transports: ['polling', 'websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('user:joined', ({ name, color }) => {
      // server assigns the avatar color; surface it so the UI stays consistent
      if (onUserJoined) onUserJoined(color);
    });

    socket.on('message:new', (message) => {
      // messages for other conversations just bump their unread badge
      if (message.room !== activeRoomRef.current) {
        if (message.user.name !== user.name) {
          setUnread((prev) => ({ ...prev, [message.room]: (prev[message.room] || 0) + 1 }));
        }
        return;
      }
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

    socket.on('unread:update', setUnread);

    socket.on('system:notice', (notice) => {
      if (activeRoomRef.current === 'group') {
        setMessages((prev) => [...prev, notice]);
      }
    });

    socket.on('typing', ({ user: name, isTyping, room }) => {
      if (room !== activeRoomRef.current) return;

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

  // switch conversations: clear state, load history, mark everything as seen
  async function openRoom(room) {
    activeRoomRef.current = room;
    setMessages([]);
    setTypingUsers([]);
    setUnread((prev) => ({ ...prev, [room]: 0 }));

    if (!socketRef.current?.connected) return;
    try {
      const { data } = await fetchMessages(room);
      setMessages(data);
      data.forEach((message) => markSeen(socketRef.current, message));
    } catch (err) {
      console.error('Could not load chat history:', err.message);
      if (onServerError) onServerError('Could not load chat history');
    }
  }

  function sendMessage(text, to) {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('message:send', { text, to });
    socketRef.current.emit('typing', { isTyping: false, to });
    return true;
  }

  function notifyTyping(isTyping, to) {
    socketRef.current?.emit('typing', { isTyping, to });
  }

  return { messages, members, typingUsers, unread, connected, sendMessage, notifyTyping, openRoom };
}
