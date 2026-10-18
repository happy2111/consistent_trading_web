"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  AtSign,
  Check,
  CheckCheck,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatSocket, ChatMessage } from "@/lib/use-chat-socket";
import {
  createDirectChat,
  fetchChatMessages,
  fetchChatRooms,
  fetchChatUsers,
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface ChatClientProps {
  userId: string;
  userName: string;
  userEmail?: string | null;
  userImage?: string | null;
}

interface ChatRoom {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  participantsCount?: number;
}

interface ChatUser {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  verified?: boolean;
}

export function ChatClient({
  userId,
  userName,
  userEmail,
  userImage,
}: ChatClientProps) {
  const [selectedChatId, setSelectedChatId] = React.useState<string>("");
  const [inputText, setInputText] = React.useState("");
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [isFetchingOlder, setIsFetchingOlder] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"chats" | "users">("chats");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showMobileList, setShowMobileList] = React.useState(true);
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);

  // 1. Fetch User Rooms
  const { data: rooms = [], refetch: refetchRooms } = useQuery<ChatRoom[]>({
    queryKey: ["chatRooms", userId],
    queryFn: () => fetchChatRooms(userId),
    enabled: Boolean(userId),
  });

  // 2. Fetch All Platform Users for Directory
  const { data: platformUsers = [], isLoading: isLoadingUsers } = useQuery<
    ChatUser[]
  >({
    queryKey: ["chatUsers", userId],
    queryFn: () => fetchChatUsers(userId),
    enabled: Boolean(userId),
  });

  // Select first room by default on desktop if none selected
  React.useEffect(() => {
    if (!selectedChatId && rooms.length > 0) {
      setSelectedChatId(rooms[0].id);
    }
  }, [rooms, selectedChatId]);

  // 3. Real-time WebSocket hook
  const {
    messages,
    setMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTyping,
  } = useChatSocket(userId, selectedChatId);

  // 4. Load initial messages via cursor pagination when room changes
  React.useEffect(() => {
    if (!selectedChatId) return;

    let isMounted = true;
    fetchChatMessages(selectedChatId, undefined, 30)
      .then((res: any) => {
        if (!isMounted) return;
        const initial = (res.messages || []).map((m: any) => ({
          id: m.id,
          chatId: m.chatId,
          senderId: m.senderId,
          senderName:
            `${m.sender?.firstName || ""} ${m.sender?.lastName || ""}`.trim() ||
            "Trader",
          content: m.content,
          createdAt: m.createdAt,
          status: m.receipts?.some((r: any) => r.status === "READ")
            ? "READ"
            : "DELIVERED",
          readBy:
            m.receipts
              ?.filter((r: any) => r.status === "READ")
              .map((r: any) => r.userId) || [],
        }));

        setMessages(initial);
        setNextCursor(res.nextCursor || null);
        setTimeout(scrollToBottom, 60);
      })
      .catch(() => {
        setMessages([
          {
            id: "welcome-1",
            chatId: selectedChatId,
            senderId: "system",
            senderName: "Consistent Trading",
            content:
              "Xush kelibsiz! Bu yerda treyderlar bilan real-vaqt rejimida fikr almashishingiz mumkin.",
            createdAt: new Date().toISOString(),
            status: "READ",
            readBy: [userId],
          },
        ]);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChatId, setMessages, userId]);

  // Load older messages (Infinite scroll upward)
  const loadOlderMessages = async () => {
    if (!nextCursor || isFetchingOlder || !selectedChatId) return;
    setIsFetchingOlder(true);
    try {
      const res = await fetchChatMessages(selectedChatId, nextCursor, 30);
      const older = (res.messages || []).map((m: any) => ({
        id: m.id,
        chatId: m.chatId,
        senderId: m.senderId,
        senderName:
          `${m.sender?.firstName || ""} ${m.sender?.lastName || ""}`.trim() ||
          "Trader",
        content: m.content,
        createdAt: m.createdAt,
        status: m.receipts?.some((r: any) => r.status === "READ")
          ? "READ"
          : "DELIVERED",
        readBy:
          m.receipts
            ?.filter((r: any) => r.status === "READ")
            .map((r: any) => r.userId) || [],
      }));

      setMessages((prev) => [...older, ...prev]);
      setNextCursor(res.nextCursor || null);
    } finally {
      setIsFetchingOlder(false);
    }
  };

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && nextCursor) {
      loadOlderMessages();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTyping(userName);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChatId) return;

    sendMessage(inputText.trim(), userName);
    setInputText("");
    setTimeout(scrollToBottom, 60);
  };

  const handleStartDirectChat = async (targetUser: ChatUser) => {
    if (isCreatingChat) return;
    setIsCreatingChat(true);
    try {
      const room = await createDirectChat(userId, targetUser.id);
      await refetchRooms();
      setSelectedChatId(room.id);
      setActiveTab("chats");
      setShowMobileList(false);
    } catch (err) {
      console.error("Failed to open direct chat:", err);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const currentRoom = rooms.find((r) => r.id === selectedChatId);
  const typingList = Object.values(typingUsers);

  // Search filtering
  const query = searchQuery.trim().toLowerCase();
  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(query) ||
      (r.lastMessage && r.lastMessage.toLowerCase().includes(query)),
  );
  const filteredUsers = platformUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query)),
  );

  const myInitials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CT";

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground select-none">
      {/* 1. Standalone Top Bar / Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card px-4 sm:px-6 z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold hover:bg-accent border-border/80 transition-all"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Dashboardga qaytish</span>
              <span className="sm:hidden">Dashboard</span>
            </Button>
          </Link>

          <div className="h-5 w-px bg-border/80" />

          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <TrendingUp className="size-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Consistent Chat
                </span>
                <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Logged-in User Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1">
            <Avatar className="size-6">
              {userImage ? (
                <AvatarImage src={userImage} alt={userName} />
              ) : null}
              <AvatarFallback className="bg-purple-600 text-white text-[10px] font-bold">
                {myInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-semibold leading-none truncate max-w-[140px]">
                {userName}
              </span>
              {userEmail && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                  {userEmail}
                </span>
              )}
            </div>
            <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-background shrink-0" />
          </div>
        </div>
      </header>

      {/* 2. Main Chat Body: Left Sidebar + Right Messages */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Panel: Chats & Traders Directory */}
        <div
          className={`${
            showMobileList ? "flex" : "hidden"
          } md:flex w-full md:w-80 lg:w-96 flex-col border-r border-border/80 bg-card shrink-0`}
        >
          {/* Search Box */}
          <div className="p-3 border-b border-border/80 bg-muted/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Qidiruv: ism, email yoki suhbat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background"
              />
            </div>
          </div>

          {/* Tabs: Suhbatlar vs Treyderlar */}
          <div className="grid grid-cols-2 p-1.5 border-b border-border/80 bg-muted/20 gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("chats")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === "chats"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="size-3.5" />
              <span>Suhbatlar</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                {rooms.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === "users"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-3.5" />
              <span>Treyderlar</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                {platformUsers.length}
              </span>
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {activeTab === "chats" ? (
              // Tab 1: Active Chat Rooms
              filteredRooms.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
                    <MessageCircle className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      {searchQuery
                        ? "Suhbat topilmadi"
                        : "Hozircha suhbatlar yo'q"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      &quot;Treyderlar&quot; bo&apos;limiga o&apos;tib, platformadagi xohlagan a&apos;zo bilan suhbat boshlashingiz mumkin.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("users")}
                    className="text-xs gap-1.5"
                  >
                    <Users className="size-3.5" />
                    <span>Treyderlarni ko&apos;rish</span>
                  </Button>
                </div>
              ) : (
                filteredRooms.map((chat) => {
                  const isSelected = chat.id === selectedChatId;
                  const isOnline = onlineUsers.has(chat.id);

                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setSelectedChatId(chat.id);
                        setShowMobileList(false);
                      }}
                      className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-purple-600/10 dark:bg-purple-600/15"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-10 border border-border">
                          {chat.avatarUrl && (
                            <AvatarImage src={chat.avatarUrl} alt={chat.name} />
                          )}
                          <AvatarFallback className="bg-purple-600 text-white font-bold text-xs">
                            {chat.type === "GROUP" ? (
                              <Users className="size-4" />
                            ) : (
                              chat.name.slice(0, 2).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {chat.name}
                          </h4>
                          {chat.lastMessageTime && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {format(new Date(chat.lastMessageTime), "HH:mm")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {chat.lastMessage || "Hozircha xabar yo'q"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              // Tab 2: All Platform Users Directory
              isLoadingUsers ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Foydalanuvchilar yuklanmoqda...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    Foydalanuvchilar topilmadi
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Qidiruv so&apos;rovini o&apos;zgartirib ko&apos;ring.
                  </p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isUserOnline = onlineUsers.has(u.id);
                  const userInitials = u.name
                    ? u.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "TR";

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleStartDirectChat(u)}
                      className="flex items-start gap-3 p-3.5 hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-11 border border-border">
                          {u.image && <AvatarImage src={u.image} alt={u.name} />}
                          <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        {isUserOnline ? (
                          <span
                            className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background"
                            title="Online"
                          />
                        ) : (
                          <span
                            className="absolute bottom-0 right-0 size-3 rounded-full bg-muted-foreground/40 ring-2 ring-background"
                            title="Offline"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {u.name}
                          </h4>
                          {u.verified && (
                            <span title="Tasdiqlangan treyder" className="inline-flex items-center">
                              <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                            </span>
                          )}
                          {u.role === "ADMIN" && (
                            <span className="rounded bg-rose-500/10 px-1 py-0.2 text-[9px] font-bold text-rose-500 uppercase">
                              Admin
                            </span>
                          )}
                        </div>

                        {/* Contacts: Email / Username */}
                        <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          {u.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="size-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{u.email}</span>
                            </div>
                          )}
                          {u.username && (
                            <div className="flex items-center gap-1.5 truncate">
                              <AtSign className="size-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">@{u.username}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-8 p-0 shrink-0 text-muted-foreground group-hover:text-purple-600 group-hover:bg-purple-500/10 transition-colors"
                        title="Xabar yozish"
                      >
                        <MessageSquare className="size-4" />
                      </Button>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right Panel: Messages Window */}
        <div
          className={`${
            showMobileList ? "hidden md:flex" : "flex"
          } flex-1 flex-col h-full bg-background min-w-0`}
        >
          {selectedChatId && currentRoom ? (
            <>
              {/* Active Chat Header */}
              <div className="px-4 py-3 border-b border-border/80 flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden size-8 shrink-0 -ml-1 text-muted-foreground"
                    title="Orqaga"
                  >
                    <ArrowLeft className="size-5" />
                  </Button>

                  <Avatar className="size-9 border border-border shrink-0">
                    {currentRoom.avatarUrl && (
                      <AvatarImage
                        src={currentRoom.avatarUrl}
                        alt={currentRoom.name}
                      />
                    )}
                    <AvatarFallback className="bg-purple-600 text-white font-bold text-xs">
                      {currentRoom.type === "GROUP" ? (
                        <Users className="size-4" />
                      ) : (
                        currentRoom.name.slice(0, 2).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {currentRoom.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                      <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">Real-time chat faol</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("users")}
                    className="text-xs text-muted-foreground gap-1.5 hidden sm:flex"
                  >
                    <Users className="size-3.5" />
                    <span>Treyderlar</span>
                  </Button>
                </div>
              </div>

              {/* Messages Area (Infinite Scroll on scroll to top) */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {isFetchingOlder && (
                  <div className="text-center text-[10px] text-muted-foreground py-1">
                    Eski xabarlar yuklanmoqda...
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-2">
                    <MessageSquare className="size-8 opacity-40" />
                    <p className="text-xs">Ushbu suhbatda hali xabarlar yo&apos;q</p>
                    <p className="text-[11px] opacity-70">
                      Birinchi xabarni yozing va suhbatni boshlang!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                            isMine
                              ? "bg-purple-600 text-white rounded-br-xs"
                              : "bg-muted/80 text-foreground rounded-bl-xs border border-border/50"
                          }`}
                        >
                          {!isMine && (
                            <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                              {msg.senderName}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isMine ? "text-white/80" : "text-muted-foreground"
                            }`}
                          >
                            <span>
                              {msg.createdAt
                                ? format(new Date(msg.createdAt), "HH:mm")
                                : ""}
                            </span>
                            {isMine && (
                              <span>
                                {msg.status === "READ" ? (
                                  <CheckCheck className="size-3 text-cyan-300" />
                                ) : msg.status === "DELIVERED" ? (
                                  <CheckCheck className="size-3 text-white/60" />
                                ) : (
                                  <Check className="size-3 text-white/60" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingList.length > 0 && (
                <div className="px-4 py-1 text-[11px] text-muted-foreground italic flex items-center gap-1.5 shrink-0 bg-background/80">
                  <span className="size-1.5 rounded-full bg-purple-600 animate-ping" />
                  <span>{typingList.join(", ")} yozmoqda...</span>
                </div>
              )}

              {/* Input Bar */}
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-border/80 flex items-center gap-2 bg-card shrink-0"
              >
                <Input
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Xabar yozing..."
                  className="h-10 text-xs bg-background flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputText.trim()}
                  className="size-10 bg-purple-600 hover:bg-purple-700 text-white shrink-0 transition-colors"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          ) : (
            // No chat selected state (Desktop)
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="size-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <MessageSquare className="size-8" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Consistent Chat Hamjamiyati
                </h3>
                <p className="text-xs text-muted-foreground">
                  Chap tomondagi ro&apos;yxatdan mavjud suhbatni tanlang yoki &quot;Treyderlar&quot; bo&apos;limiga o&apos;tib, yangi muloqot boshlang.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("users")}
                className="gap-2 text-xs"
              >
                <Users className="size-4" />
                <span>Barcha treyderlarni ko&apos;rish</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
