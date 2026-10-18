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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") ||
      "http://localhost:3000";

    const socket = io(`${wsUrl}/chat`, {
      auth: { userId },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Join room when active
    if (currentChatId) {
      socket.emit("join_room", { chatId: currentChatId });
    }

    // New message received
    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate append
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // If user is currently looking at this chat, acknowledge read
      if (msg.chatId === currentChatId && msg.senderId !== userId) {
        socket.emit("message_read", {
          chatId: currentChatId,
          messageIds: [msg.id],
        });
      }
    });

    // Message sent ACK
    socket.on("message_ack", (ack: { tempId: string; messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ack.tempId ? { ...m, id: ack.messageId, status: "DELIVERED" } : m,
        ),
      );
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

    // Typing indicators
    socket.on(
      "user_typing",
      (data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => {
        if (data.chatId !== currentChatId || data.userId === userId) return;

        setTypingUsers((prev) => {
          const next = { ...prev };
          if (data.isTyping) {
            next[data.userId] = data.userName;
          } else {
            delete next[data.userId];
          }
          return next;
        });
      },
    );

    // Online presence
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

    return () => {
      if (currentChatId) {
        socket.emit("leave_room", { chatId: currentChatId });
      }
      socket.disconnect();
    };
  }, [userId, currentChatId]);

  // Handle typing with 2.5s debounce
  const sendTyping = useCallback(
    (userName: string) => {
      if (!socketRef.current || !currentChatId) return;
      socketRef.current.emit("typing_start", { chatId: currentChatId, userName });

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
      if (!socketRef.current || !currentChatId || !content.trim()) return;

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
      socketRef.current.emit("send_message", {
        chatId: currentChatId,
        content: content.trim(),
        tempId,
      });

      // Stop typing
      socketRef.current.emit("typing_stop", { chatId: currentChatId });
    },
    [currentChatId, userId],
  );

  return {
    messages,
    setMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTyping,
  };
}
