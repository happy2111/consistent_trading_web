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
      if (currentChatId) {
        socket.emit("join_room", { chatId: currentChatId });
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
        if (data.userId === userId) return;

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

    return () => {
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
      socket.emit("typing_stop", { chatId: currentChatId });
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
