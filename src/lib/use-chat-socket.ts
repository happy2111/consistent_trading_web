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

    const baseUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    const socket = io(`${baseUrl}/chat`, {
      auth: { userId },
      query: { userId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Upon connection, if a room is already chosen, join it
      if (currentChatIdRef.current) {
        socket.emit("join_room", { chatId: currentChatIdRef.current });
      }
    });

    // Receive initial online users list
    socket.on("online_users_list", (data: { userIds: string[] }) => {
      if (data?.userIds) {
        setOnlineUsers(new Set(data.userIds));
      }
    });

    // Real-time presence updates
    socket.on(
      "user_presence",
      (data: { userId: string; status: "ONLINE" | "OFFLINE" }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (data.status === "ONLINE") {
            next.add(data.userId);
          } else {
            next.delete(data.userId);
          }
          return next;
        });
      },
    );

    // New message broadcast
    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => {
        // If we have a temporary optimistic message with matching content, replace it
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
    });

    // Message ACK from server
    socket.on("message_ack", (ack: { tempId: string; messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ack.tempId
            ? { ...m, id: ack.messageId, status: "DELIVERED" }
            : m,
        ),
      );
    });

    // Message edited broadcast
    socket.on("message_edited", (data: { id: string; chatId: string; content: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id ? { ...m, content: data.content } : m
        ),
      );
    });

    // Message deleted broadcast
    socket.on("message_deleted", (data: { id: string; chatId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.id));
    });

    // Read status updates
    socket.on(
      "messages_read_update",
      (data: { chatId: string; messageIds: string[]; userId: string }) => {
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
      },
    );

    // Typing indicators with scoped room check and auto-expiry timeout
    socket.on(
      "user_typing",
      (data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => {
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
      },
    );

    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      socket.disconnect();
      socketRef.current = null;
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
