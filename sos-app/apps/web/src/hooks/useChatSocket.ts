'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { Message } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

interface TypingEvent {
  userId: string;
  userName: string;
  isTyping: boolean;
}

export function useChatSocket(emergencyId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!emergencyId) return;

    const token = Cookies.get('auth_token');
    if (!token) {
      setError('Authentication required');
      return;
    }

    // Create socket connection
    const newSocket = io(`${WS_URL}/communication`, {
      path: '/ws/communication',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Chat WebSocket connected');
      setConnected(true);
      setError(null);

      // Join emergency room
      newSocket.emit('join-room', { roomId: emergencyId });
    });

    newSocket.on('disconnect', () => {
      console.log('Chat WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Chat WebSocket error:', err);
      setError('Failed to connect to chat service');
      setConnected(false);
    });

    newSocket.on('new-message', (message: Message) => {
      console.log('New message received:', message);
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message-delivered', (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, delivered: true } : msg
        )
      );
    });

    newSocket.on('message-read', (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, read: true } : msg
        )
      );
    });

    newSocket.on('typing-start', (data: TypingEvent) => {
      setTypingUsers((prev) => {
        if (!prev.includes(data.userName)) {
          return [...prev, data.userName];
        }
        return prev;
      });
    });

    newSocket.on('typing-stop', (data: TypingEvent) => {
      setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
    });

    newSocket.on('error', (err) => {
      console.error('Chat socket error:', err);
      setError(err.message || 'Chat service error');
    });

    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId: emergencyId });
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [emergencyId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (socket && connected && emergencyId) {
        socket.emit('send-message', {
          roomId: emergencyId,
          content,
        });
      }
    },
    [socket, connected, emergencyId]
  );

  const startTyping = useCallback(() => {
    if (socket && connected && emergencyId) {
      socket.emit('typing-start', { roomId: emergencyId });

      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  }, [socket, connected, emergencyId]);

  const stopTyping = useCallback(() => {
    if (socket && connected && emergencyId) {
      socket.emit('typing-stop', { roomId: emergencyId });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, connected, emergencyId]);

  return {
    connected,
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    error,
  };
}
