"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  status: "SENT" | "DELIVERED" | "READ";
  readBy?: string[];
}

let cachedSocket: Socket | null = null;
let cachedSocketUserId: string | null = null;
let socketDisconnectTimer: NodeJS.Timeout | null = null;

export function useChatSocket(userId: string, currentChatId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const currentChatIdRef = useRef<string | undefined>(currentChatId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Keep currentChatIdRef in sync and reset typing when chat changes
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    typingTimeoutsRef.current = {};
    setTypingUsers({});
  }, [currentChatId]);

  // 1. Persistent Socket Connection per userId
  useEffect(() => {
    if (!userId) return;

    if (socketDisconnectTimer) {
      clearTimeout(socketDisconnectTimer);
      socketDisconnectTimer = null;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    let socket: Socket;
    if (cachedSocket && cachedSocketUserId === userId && cachedSocket.connected) {
      socket = cachedSocket;
    } else {
      if (cachedSocket) {
        cachedSocket.disconnect();
        cachedSocket = null;
      }

      socket = io(`${baseUrl}/chat`, {
        auth: { userId },
        query: { userId },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 25,
        reconnectionDelay: 1000,
      });

      cachedSocket = socket;
      cachedSocketUserId = userId;
    }

    socketRef.current = socket;

    const handleConnect = () => {
      if (currentChatIdRef.current) {
        socket.emit("join_room", { chatId: currentChatIdRef.current });
      }
    };

    const handleOnlineUsersList = (data: { userIds: string[] }) => {
      if (data?.userIds) {
        setOnlineUsers(new Set(data.userIds));
      }
    };

    const handleUserPresence = (data: { userId: string; status: "ONLINE" | "OFFLINE" }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.status === "ONLINE") {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    const handleNewMessage = (msg: ChatMessage) => {
      if (currentChatIdRef.current && msg.chatId !== currentChatIdRef.current) {
        return;
      }

      setMessages((prev) => {
        const tempIdx = prev.findIndex(
          (m) => m.id.startsWith("temp-") && m.content === msg.content,
        );
        if (tempIdx !== -1) {
          const updated = [...prev];
          updated[tempIdx] = msg;
          return updated;
        }

        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleMessageAck = (ack: { tempId: string; messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ack.tempId
            ? { ...m, id: ack.messageId, status: "DELIVERED" }
            : m,
        ),
      );
    };

    const handleMessageEdited = (data: { id: string; chatId: string; content: string }) => {
      if (currentChatIdRef.current && data.chatId !== currentChatIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id ? { ...m, content: data.content } : m
        ),
      );
    };

    const handleMessageDeleted = (data: { id: string; chatId: string }) => {
      if (currentChatIdRef.current && data.chatId !== currentChatIdRef.current) return;
      setMessages((prev) => prev.filter((m) => m.id !== data.id));
    };

    const handleMessagesReadUpdate = (data: { chatId: string; messageIds: string[]; userId: string }) => {
      if (currentChatIdRef.current && data.chatId !== currentChatIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (data.messageIds.includes(m.id)) {
            const readBy = new Set(m.readBy || []);
            readBy.add(data.userId);
            return {
              ...m,
              status: "READ",
              readBy: Array.from(readBy),
            };
          }
          return m;
        }),
      );
    };

    const handleUserTyping = (data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === userId) return;
      if (currentChatIdRef.current && data.chatId !== currentChatIdRef.current) return;

      if (data.isTyping) {
        if (typingTimeoutsRef.current[data.userId]) {
          clearTimeout(typingTimeoutsRef.current[data.userId]);
        }
        typingTimeoutsRef.current[data.userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[data.userId];
            return next;
          });
          delete typingTimeoutsRef.current[data.userId];
        }, 3500);

        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: data.userName || "Foydalanuvchi",
        }));
      } else {
        if (typingTimeoutsRef.current[data.userId]) {
          clearTimeout(typingTimeoutsRef.current[data.userId]);
          delete typingTimeoutsRef.current[data.userId];
        }
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("online_users_list", handleOnlineUsersList);
    socket.on("user_presence", handleUserPresence);
    socket.on("new_message", handleNewMessage);
    socket.on("message_ack", handleMessageAck);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("messages_read_update", handleMessagesReadUpdate);
    socket.on("user_typing", handleUserTyping);

    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};

      socket.off("connect", handleConnect);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("user_presence", handleUserPresence);
      socket.off("new_message", handleNewMessage);
      socket.off("message_ack", handleMessageAck);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("messages_read_update", handleMessagesReadUpdate);
      socket.off("user_typing", handleUserTyping);

      // Keep socket warm for 45s so navigating to other tabs doesn't destroy the connection
      if (socketDisconnectTimer) clearTimeout(socketDisconnectTimer);
      socketDisconnectTimer = setTimeout(() => {
        if (cachedSocket) {
          cachedSocket.disconnect();
          cachedSocket = null;
          cachedSocketUserId = null;
        }
      }, 45_000);
    };
  }, [userId]);

  // 2. Join / Leave Room when currentChatId changes (WITHOUT disconnecting socket!)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !currentChatId) return;

    if (socket.connected) {
      socket.emit("join_room", { chatId: currentChatId });
    }

    return () => {
      if (socket.connected) {
        socket.emit("leave_room", { chatId: currentChatId });
      }
    };
  }, [currentChatId]);

  // Stop typing immediately
  const stopTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !currentChatIdRef.current) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socket.emit("typing_stop", { chatId: currentChatIdRef.current });
  }, []);

  // Handle typing with 2.5s debounce
  const sendTyping = useCallback(
    (userName: string) => {
      const socket = socketRef.current;
      if (!socket || !currentChatId) return;
      socket.emit("typing_start", { chatId: currentChatId, userName });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("typing_stop", { chatId: currentChatId });
      }, 2500);
    },
    [currentChatId],
  );

  // Send message
  const sendMessage = useCallback(
    (content: string, senderName: string) => {
      const socket = socketRef.current;
      if (!socket || !currentChatId || !content.trim()) return;

      const tempId = `temp-${Date.now()}`;
      const tempMsg: ChatMessage = {
        id: tempId,
        chatId: currentChatId,
        senderId: userId,
        senderName,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        status: "SENT",
        readBy: [],
      };

      // Optimistic append
      setMessages((prev) => [...prev, tempMsg]);

      // Emit to server
      socket.emit("send_message", {
        chatId: currentChatId,
        content: content.trim(),
        tempId,
      });

      // Stop typing
      stopTyping();
    },
    [currentChatId, userId, stopTyping],
  );

  // Edit message
  const editMessage = useCallback(
    (messageId: string, content: string) => {
      const socket = socketRef.current;
      const trimmed = content.trim();
      if (!socket || !currentChatId || !trimmed) return;

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: trimmed } : m
        ),
      );

      socket.emit("edit_message", {
        chatId: currentChatId,
        messageId,
        content: trimmed,
      });
    },
    [currentChatId],
  );

  // Delete message
  const deleteMessage = useCallback(
    (messageId: string) => {
      const socket = socketRef.current;
      if (!socket || !currentChatId) return;

      // Optimistic delete
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      socket.emit("delete_message", {
        chatId: currentChatId,
        messageId,
      });
    },
    [currentChatId],
  );

  return {
    messages,
    setMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    stopTyping,
  };
}
