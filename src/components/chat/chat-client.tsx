"use client";

import * as React from "react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatSocket } from "@/lib/use-chat-socket";
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

// Telegram-like avatar color palette for users without photo
const AVATAR_COLORS = [
  "bg-[#e17076]",
  "bg-[#faa357]",
  "bg-[#7bc862]",
  "bg-[#65aadd]",
  "bg-[#a695e7]",
  "bg-[#ee7aae]",
  "bg-[#6ec9cb]",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatMessageTime(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Вчера";
  return format(d, "dd.MM");
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
  const [activeTab, setActiveTab] = React.useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showMobileList, setShowMobileList] = React.useState(true);
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = React.useState(false);

  // 1. Fetch Rooms
  const { data: rooms = [], refetch: refetchRooms } = useQuery<ChatRoom[]>({
    queryKey: ["chatRooms", userId],
    queryFn: () => fetchChatRooms(userId),
    enabled: Boolean(userId),
  });

  // 2. Fetch Platform Users
  const { data: platformUsers = [] } = useQuery<ChatUser[]>({
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

  // 4. Load initial messages
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
            "Пользователь",
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
            senderName: "Система",
            content: "Добро пожаловать в чат!",
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

  // Load older messages on scroll top
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
          "Пользователь",
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
      setShowMobileList(false);
    } catch (err) {
      console.error("Direct chat error:", err);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const currentRoom = rooms.find((r) => r.id === selectedChatId);
  const typingList = Object.values(typingUsers);

  // Filter rooms by tab
  const directRooms = rooms.filter((r) => r.type === "DIRECT");
  const groupRooms = rooms.filter((r) => r.type === "GROUP");

  const query = searchQuery.trim().toLowerCase();

  const filteredDirectRooms = directRooms.filter(
    (r) =>
      r.name.toLowerCase().includes(query) ||
      (r.lastMessage && r.lastMessage.toLowerCase().includes(query)),
  );

  const filteredGroupRooms = groupRooms.filter(
    (r) =>
      r.name.toLowerCase().includes(query) ||
      (r.lastMessage && r.lastMessage.toLowerCase().includes(query)),
  );

  // Users who don't have a direct conversation yet
  const usersWithoutRoom = platformUsers.filter((u) => {
    const matchesQuery =
      !query ||
      u.name.toLowerCase().includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query));
    return matchesQuery;
  });

  const myInitials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CT";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e0e10] text-[#e1e1e1] select-none font-sans p-0 sm:p-2.5 gap-2.5">
      {/* =========================================================================
          LEFT SIDEBAR (Telegram Web Style Island)
         ========================================================================= */}
      <aside
        className={`${
          showMobileList ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-[350px] lg:w-[380px] shrink-0 bg-[#1c1c1f] rounded-none sm:rounded-3xl border border-[#2b2b2f]/60 shadow-2xl overflow-hidden z-20`}
      >
        {/* Top Header: Hamburger / Dashboard, Search, User Avatar */}
        <div className="p-3 pb-2 flex items-center gap-2.5 relative">
          {/* Menu / Return to Dashboard */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenuDropdown((prev) => !prev)}
              title="Меню"
              className="size-9 rounded-full flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="size-5" />
            </button>

            {/* Menu Dropdown with Dashboard return */}
            {showMenuDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenuDropdown(false)}
                />
                <div className="absolute top-11 left-0 z-40 w-52 bg-[#252528] rounded-2xl shadow-2xl border border-white/10 p-1.5 animate-in fade-in-50 zoom-in-95">
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <LayoutDashboard className="size-4 text-[#8774e1]" />
                    <span>Вернуться на Dashboard</span>
                  </Link>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="px-3 py-2 text-[11px] text-[#888888]">
                    {userName}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search Input Bar (Telegram Pill) */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#777777]" />
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-full bg-[#27272a] hover:bg-[#2e2e32] focus:bg-[#2e2e32] focus:outline-hidden pl-9 pr-8 text-xs text-white placeholder-[#777777] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-[#777777] hover:text-white flex items-center justify-center"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* My Avatar */}
          <div className="shrink-0 relative">
            <Avatar className="size-8.5 ring-2 ring-transparent">
              {userImage ? (
                <AvatarImage src={userImage} alt={userName} />
              ) : null}
              <AvatarFallback
                className={`${getAvatarColor(
                  userName,
                )} text-white font-bold text-xs`}
              >
                {myInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#4fae4e] ring-2 ring-[#1c1c1f]" />
          </div>
        </div>

        {/* Tabs: Личные сообщения и Группы (Strictly 2 tabs as requested) */}
        <div className="px-3 py-1 flex items-center gap-2 border-b border-[#2b2b2f]/50">
          {/* Tab 1: Личные */}
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "direct"
                ? "bg-[#8774e1] text-white shadow-md font-bold"
                : "text-[#aaaaaa] hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Личные</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "direct"
                  ? "bg-white/20 text-white"
                  : "bg-[#2c2c30] text-[#888888]"
              }`}
            >
              {directRooms.length + usersWithoutRoom.length}
            </span>
          </button>

          {/* Tab 2: Группы */}
          <button
            type="button"
            onClick={() => setActiveTab("group")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "group"
                ? "bg-[#8774e1] text-white shadow-md font-bold"
                : "text-[#aaaaaa] hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Группы</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "group"
                  ? "bg-white/20 text-white"
                  : "bg-[#2c2c30] text-[#888888]"
              }`}
            >
              {groupRooms.length}
            </span>
          </button>
        </div>

        {/* Chats / Users List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {activeTab === "direct" ? (
            <>
              {/* Existing Direct Chats */}
              {filteredDirectRooms.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const isOnline = onlineUsers.has(chat.id);
                const time = formatMessageTime(chat.lastMessageTime);

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      setShowMobileList(false);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#8774e1] text-white shadow-md"
                        : "hover:bg-white/5 text-[#e1e1e1]"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-12">
                        {chat.avatarUrl && (
                          <AvatarImage src={chat.avatarUrl} alt={chat.name} />
                        )}
                        <AvatarFallback
                          className={`${getAvatarColor(
                            chat.name,
                          )} text-white font-bold text-sm`}
                        >
                          {chat.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full bg-[#4fae4e] ring-2 ring-[#1c1c1f]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-[14px] font-semibold truncate ${
                            isSelected ? "text-white" : "text-[#ffffff]"
                          }`}
                        >
                          {chat.name}
                        </h4>
                        {time && (
                          <span
                            className={`text-[11px] shrink-0 font-medium ${
                              isSelected ? "text-white/80" : "text-[#888888]"
                            }`}
                          >
                            {time}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p
                          className={`text-xs truncate ${
                            isSelected ? "text-white/90" : "text-[#8e8e93]"
                          }`}
                        >
                          {chat.lastMessage || "Нет сообщений"}
                        </p>
                        {isSelected ? (
                          <CheckCheck className="size-3.5 text-white/90 shrink-0" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* All Platform Users (Contacts list to start a chat with anyone) */}
              <div className="pt-2 pb-1 px-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#777777]">
                  Все пользователи
                </span>
              </div>

              {usersWithoutRoom.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#888888]">
                  Пользователи не найдены
                </div>
              ) : (
                usersWithoutRoom.map((u) => {
                  const isOnline = onlineUsers.has(u.id);
                  const userInitials = u.name
                    ? u.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "CT";

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleStartDirectChat(u)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer hover:bg-white/5 transition-all text-[#e1e1e1]"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-12">
                          {u.image && <AvatarImage src={u.image} alt={u.name} />}
                          <AvatarFallback
                            className={`${getAvatarColor(
                              u.name,
                            )} text-white font-bold text-sm`}
                          >
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline ? (
                          <span
                            className="absolute bottom-0.5 right-0.5 size-3 rounded-full bg-[#4fae4e] ring-2 ring-[#1c1c1f]"
                            title="В сети"
                          />
                        ) : (
                          <span
                            className="absolute bottom-0.5 right-0.5 size-3 rounded-full bg-[#444448] ring-2 ring-[#1c1c1f]"
                            title="Не в сети"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-[14px] font-semibold text-white truncate">
                            {u.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#8e8e93] truncate mt-0.5">
                          {u.username ? (
                            <span>@{u.username}</span>
                          ) : u.email ? (
                            <span>{u.email}</span>
                          ) : (
                            <span>Нажмите, чтобы написать</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          ) : (
            // Groups Tab
            <>
              {filteredGroupRooms.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/5 text-[#8774e1]">
                    <Users className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      Нет групп
                    </p>
                    <p className="text-xs text-[#888888]">
                      Групповые чаты пока не созданы.
                    </p>
                  </div>
                </div>
              ) : (
                filteredGroupRooms.map((chat) => {
                  const isSelected = chat.id === selectedChatId;
                  const time = formatMessageTime(chat.lastMessageTime);

                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setSelectedChatId(chat.id);
                        setShowMobileList(false);
                      }}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#8774e1] text-white shadow-md"
                          : "hover:bg-white/5 text-[#e1e1e1]"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-12">
                          <AvatarFallback className="bg-[#65aadd] text-white font-bold text-sm">
                            <Users className="size-5" />
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-[14px] font-semibold truncate ${
                              isSelected ? "text-white" : "text-[#ffffff]"
                            }`}
                          >
                            {chat.name}
                          </h4>
                          {time && (
                            <span
                              className={`text-[11px] shrink-0 font-medium ${
                                isSelected ? "text-white/80" : "text-[#888888]"
                              }`}
                            >
                              {time}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isSelected ? "text-white/90" : "text-[#8e8e93]"
                          }`}
                        >
                          {chat.lastMessage || "Нет сообщений"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </aside>

      {/* =========================================================================
          RIGHT CHAT WINDOW (Telegram Web Conversation Area)
         ========================================================================= */}
      <main
        className={`${
          showMobileList ? "hidden md:flex" : "flex"
        } flex-1 flex-col h-full rounded-none sm:rounded-3xl border border-[#2b2b2f]/40 overflow-hidden relative shadow-2xl`}
        style={{
          backgroundColor: "#0e0e11",
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.035) 1.5px, transparent 1.5px)`,
          backgroundSize: "24px 24px",
        }}
      >
        {selectedChatId && currentRoom ? (
          <>
            {/* Top Chat Header (Floating Pill matching screenshot) */}
            <div className="m-2.5 mb-0 px-4 py-2.5 bg-[#1c1c1f]/95 backdrop-blur-md rounded-2xl border border-white/5 flex items-center justify-between z-10 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setShowMobileList(true)}
                  className="md:hidden size-8 rounded-full flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="size-5" />
                </button>

                <Avatar className="size-10 shrink-0">
                  {currentRoom.avatarUrl && (
                    <AvatarImage
                      src={currentRoom.avatarUrl}
                      alt={currentRoom.name}
                    />
                  )}
                  <AvatarFallback
                    className={`${getAvatarColor(
                      currentRoom.name,
                    )} text-white font-bold text-sm`}
                  >
                    {currentRoom.type === "GROUP" ? (
                      <Users className="size-5" />
                    ) : (
                      currentRoom.name.slice(0, 2).toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-white truncate">
                    {currentRoom.name}
                  </h3>
                  <p className="text-[12px] text-[#8e8e93] truncate">
                    {onlineUsers.has(currentRoom.id)
                      ? "в сети"
                      : "был(а) недавно"}
                  </p>
                </div>
              </div>

              {/* Right actions: Return to Dashboard button */}
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#27272a] hover:bg-[#34343a] text-xs font-semibold text-white border border-white/5 transition-colors"
                  title="Вернуться на Dashboard"
                >
                  <LayoutDashboard className="size-3.5 text-[#8774e1]" />
                  <span className="hidden sm:inline">На Dashboard</span>
                </Link>

                <button
                  type="button"
                  className="size-8 rounded-full flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Search className="size-4" />
                </button>
                <button
                  type="button"
                  className="size-8 rounded-full flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <MoreVertical className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 flex flex-col scrollbar-thin scrollbar-thumb-white/10"
            >
              {isFetchingOlder && (
                <div className="self-center bg-black/40 backdrop-blur-md text-[11px] text-white/70 px-3 py-1 rounded-full">
                  Загрузка истории...
                </div>
              )}

              {/* Date divider */}
              <div className="self-center bg-black/40 backdrop-blur-md text-[11px] text-white/70 px-3.5 py-1 rounded-full font-medium my-2">
                Сегодня
              </div>

              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#777777] text-xs space-y-1">
                  <MessageSquare className="size-8 opacity-30" />
                  <p>Нет сообщений. Напишите первым!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === userId;
                  const time = formatMessageTime(msg.createdAt);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isMine ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[550px] px-3.5 py-2 text-[14px] leading-relaxed shadow-sm transition-all ${
                          isMine
                            ? "bg-[#7b61ff] text-white rounded-2xl rounded-br-xs"
                            : "bg-[#212124] text-white rounded-2xl rounded-bl-xs border border-white/5"
                        }`}
                      >
                        {!isMine && currentRoom.type === "GROUP" && (
                          <p className="text-[11px] font-bold text-[#8774e1] mb-0.5">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[11px] select-none float-right ml-2 -mb-0.5 ${
                            isMine ? "text-white/80" : "text-[#8e8e93]"
                          }`}
                        >
                          <span>{time}</span>
                          {isMine && (
                            <span>
                              {msg.status === "READ" ? (
                                <CheckCheck className="size-3.5 text-cyan-200" />
                              ) : msg.status === "DELIVERED" ? (
                                <CheckCheck className="size-3.5 text-white/70" />
                              ) : (
                                <Check className="size-3.5 text-white/70" />
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
              <div className="px-6 py-1 text-xs text-[#8774e1] italic flex items-center gap-1.5 shrink-0">
                <span className="size-1.5 rounded-full bg-[#8774e1] animate-ping" />
                <span>{typingList.join(", ")} печатает...</span>
              </div>
            )}

            {/* Bottom Input Bar (Floating Pill matching screenshot) */}
            <form
              onSubmit={handleSend}
              className="m-2.5 mt-0 p-1.5 pl-3 bg-[#1c1c1f] rounded-2xl border border-white/5 flex items-center gap-2 shadow-xl shrink-0"
            >
              {/* Attachment Icon */}
              <button
                type="button"
                className="size-9 rounded-full flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title="Прикрепить файл"
              >
                <Paperclip className="size-5" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Сообщение..."
                className="flex-1 bg-transparent text-white text-[14px] placeholder-[#777777] focus:outline-hidden px-1"
              />

              {/* Emoji Smile */}
              <button
                type="button"
                className="size-9 rounded-full flex items-center justify-center text-[#aaaaaa] hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title="Эмодзи"
              >
                <Smile className="size-5" />
              </button>

              {/* Purple Telegram Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="size-10 rounded-full bg-[#8774e1] hover:bg-[#7b61ff] disabled:opacity-40 disabled:hover:bg-[#8774e1] text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md"
                title="Отправить"
              >
                <Send className="size-4.5 -translate-x-0.5 translate-y-0.5" />
              </button>
            </form>
          </>
        ) : (
          // Empty State when no chat is open
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="size-16 rounded-full bg-[#8774e1]/10 flex items-center justify-center text-[#8774e1]">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="text-base font-bold text-white">Выберите чат</h3>
            <p className="text-xs text-[#8e8e93] max-w-xs">
              Выберите диалог из списка слева или начните общение с любым
              пользователем.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
