"use client";

import * as React from "react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatSocket } from "@/lib/use-chat-socket";
import {
  createDirectChat,
  createGroupChat,
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
  isAdmin?: boolean;
}

interface ChatRoom {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  participantsCount?: number;
  participantIds?: string[];
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

function formatMessageTimeUz(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Kecha";
  return format(d, "dd.MM");
}

export function ChatClient({
  userId,
  userName,
  userImage,
  isAdmin = false,
}: ChatClientProps) {
  const [selectedChatId, setSelectedChatId] = React.useState<string>("");
  const [inputText, setInputText] = React.useState("");
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [isFetchingOlder, setIsFetchingOlder] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showMobileList, setShowMobileList] = React.useState(true);
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);

  // Group creation modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = React.useState<string[]>([]);
  const [isSubmittingGroup, setIsSubmittingGroup] = React.useState(false);

  // 1. Fetch Rooms
  const { data: rooms = [], refetch: refetchRooms } = useQuery<ChatRoom[]>({
    queryKey: ["chatRooms", userId],
    queryFn: () => fetchChatRooms(userId),
    enabled: Boolean(userId),
    refetchInterval: 10000,
  });

  // 2. Fetch Platform Users
  const { data: platformUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ["chatUsers", userId],
    queryFn: () => fetchChatUsers(userId),
    enabled: Boolean(userId),
  });

  // 3. Real-time WebSocket hook
  const {
    messages,
    setMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTyping,
    stopTyping,
  } = useChatSocket(userId, selectedChatId);

  // 4. Load initial messages when room changes
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
            "Foydalanuvchi",
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
        setMessages([]);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChatId, setMessages, userId]);

  // Load older messages
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
          "Foydalanuvchi",
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
    const val = e.target.value;
    setInputText(val);
    if (val.trim()) {
      sendTyping(userName);
    } else {
      stopTyping();
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChatId) return;

    sendMessage(inputText.trim(), userName);
    setInputText("");
    setTimeout(scrollToBottom, 60);
  };

  // Open / create direct chat with a user
  const handleSelectUser = async (targetUser: ChatUser, existingChatId?: string | null) => {
    if (existingChatId) {
      setSelectedChatId(existingChatId);
      setShowMobileList(false);
      return;
    }

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

  // Handle Group creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !groupName.trim() || isSubmittingGroup) return;

    setIsSubmittingGroup(true);
    try {
      const newGroup = await createGroupChat(
        userId,
        groupName.trim(),
        selectedGroupMembers,
      );
      await refetchRooms();
      setSelectedChatId(newGroup.id);
      setIsGroupModalOpen(false);
      setGroupName("");
      setSelectedGroupMembers([]);
      setActiveTab("group");
      setShowMobileList(false);
    } catch (err) {
      console.error("Guruh yaratishda xatolik:", err);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const toggleGroupMember = (mId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId],
    );
  };

  // Build a UNIFIED list of direct contacts (WITHOUT ANY DUPLICATION)
  const directRooms = rooms.filter((r) => r.type === "DIRECT");
  const groupRooms = rooms.filter((r) => r.type === "GROUP");

  // Map each platform user to room (if exists)
  const unifiedDirectList = React.useMemo(() => {
    return platformUsers.map((u) => {
      // Find direct room if room name matches or participants include user
      const existingRoom = directRooms.find(
        (r) =>
          r.name.toLowerCase().trim() === u.name.toLowerCase().trim() ||
          r.id === u.id,
      );

      return {
        user: u,
        chatId: existingRoom ? existingRoom.id : null,
        avatarUrl: existingRoom?.avatarUrl || u.image || null,
        displayName: u.name,
        lastMessage: existingRoom?.lastMessage || (u.username ? `@${u.username}` : u.email || ""),
        hasMessages: Boolean(existingRoom?.lastMessage),
        lastMessageTime: existingRoom?.lastMessageTime || null,
      };
    }).sort((a, b) => {
      // Chats with recent messages first
      if (a.hasMessages && !b.hasMessages) return -1;
      if (!a.hasMessages && b.hasMessages) return 1;
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }, [platformUsers, directRooms]);

  // Select first chat if desktop and none selected
  React.useEffect(() => {
    if (!selectedChatId) {
      if (activeTab === "direct" && unifiedDirectList.length > 0) {
        const first = unifiedDirectList.find((i) => i.chatId);
        if (first?.chatId) setSelectedChatId(first.chatId);
      } else if (activeTab === "group" && groupRooms.length > 0) {
        setSelectedChatId(groupRooms[0].id);
      }
    }
  }, [unifiedDirectList, groupRooms, selectedChatId, activeTab]);

  const query = searchQuery.trim().toLowerCase();

  const filteredDirectList = unifiedDirectList.filter((item) => {
    if (!query) return true;
    return (
      item.displayName.toLowerCase().includes(query) ||
      (item.user.username && item.user.username.toLowerCase().includes(query)) ||
      (item.user.email && item.user.email.toLowerCase().includes(query)) ||
      (item.lastMessage && item.lastMessage.toLowerCase().includes(query))
    );
  });

  const filteredGroupRooms = groupRooms.filter((r) => {
    if (!query) return true;
    return (
      r.name.toLowerCase().includes(query) ||
      (r.lastMessage && r.lastMessage.toLowerCase().includes(query))
    );
  });

  const currentRoom = rooms.find((r) => r.id === selectedChatId);
  const typingList = Object.values(typingUsers);

  // Check if current direct room partner is online
  const isCurrentChatOnline = React.useMemo(() => {
    if (!currentRoom) return false;
    if (currentRoom.type === "GROUP") return false;
    // Find corresponding user in direct list
    const found = unifiedDirectList.find((i) => i.chatId === currentRoom.id);
    if (found) {
      return onlineUsers.has(found.user.id);
    }
    return onlineUsers.has(currentRoom.id);
  }, [currentRoom, unifiedDirectList, onlineUsers]);

  const myInitials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CT";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#000000] text-[#f1f1f1] select-none font-sans p-0 sm:p-2.5 gap-2.5">
      {/* =========================================================================
          LEFT SIDEBAR (Telegram Web Style)
         ========================================================================= */}
      <aside
        className={`${
          showMobileList ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-[350px] lg:w-[380px] shrink-0 bg-[#190a09] rounded-none sm:rounded-3xl border border-[#400907]/60 shadow-2xl overflow-hidden z-20`}
      >
        {/* Top Header: Back to Dashboard Arrow, Search Input, My Avatar */}
        <div className="p-3 pb-2 flex items-center gap-2.5 relative">
          {/* Back Arrow to Dashboard */}
          <Link
            href="/"
            title="Dashboardga qaytish"
            className="size-9 rounded-full flex items-center justify-center text-[#a88a89] hover:text-white hover:bg-[#290a08] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Search Input Bar (Telegram Pill) */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7271]" />
            <input
              type="text"
              placeholder="Qidiruv..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-full bg-[#290a08]/80 hover:bg-[#290a08] focus:bg-[#290a08] border border-[#400907]/60 focus:border-[#8c1511]/50 focus:outline-hidden pl-9 pr-8 text-xs text-white placeholder-[#8a7271] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-[#8a7271] hover:text-white flex items-center justify-center"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* My Avatar with online indicator */}
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
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#4fae4e] ring-2 ring-[#190a09]" />
          </div>
        </div>

        {/* Tabs: Shaxsiy and Guruhlar (in Uzbek, strictly 2 tabs) */}
        <div className="px-3 py-1 flex items-center justify-between border-b border-[#400907]/50">
          <div className="flex items-center gap-2">
            {/* Tab 1: Shaxsiy */}
            <button
              type="button"
              onClick={() => setActiveTab("direct")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "direct"
                  ? "bg-[#8c1511] text-white shadow-md font-bold"
                  : "text-[#b39e9d] hover:text-white hover:bg-[#290a08]/60"
              }`}
            >
              <span>Shaxsiy</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "direct"
                    ? "bg-black/30 text-white"
                    : "bg-[#290a08] text-[#a88a89]"
                }`}
              >
                {unifiedDirectList.length}
              </span>
            </button>

            {/* Tab 2: Guruhlar */}
            <button
              type="button"
              onClick={() => setActiveTab("group")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "group"
                  ? "bg-[#8c1511] text-white shadow-md font-bold"
                  : "text-[#b39e9d] hover:text-white hover:bg-[#290a08]/60"
              }`}
            >
              <span>Guruhlar</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "group"
                    ? "bg-black/30 text-white"
                    : "bg-[#290a08] text-[#a88a89]"
                }`}
              >
                {groupRooms.length}
              </span>
            </button>
          </div>

          {/* Create Group Button (Admin only) */}
          {activeTab === "group" && isAdmin && (
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              title="Yangi guruh yaratish"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#8c1511]/20 hover:bg-[#8c1511]/35 text-[#ff7a75] border border-[#8c1511]/40 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Yangi</span>
            </button>
          )}
        </div>

        {/* Chats / Users List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-[#400907]/50 hover:scrollbar-thumb-[#8c1511]/50">
          {activeTab === "direct" ? (
            filteredDirectList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#a88a89]">
                Foydalanuvchilar topilmadi
              </div>
            ) : (
              filteredDirectList.map((item) => {
                const isSelected = item.chatId && item.chatId === selectedChatId;
                const isOnline = onlineUsers.has(item.user.id);
                const time = formatMessageTimeUz(item.lastMessageTime);

                return (
                  <div
                    key={item.user.id}
                    onClick={() => handleSelectUser(item.user, item.chatId)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#400907] border border-[#8c1511]/70 text-white shadow-md"
                        : "hover:bg-[#290a08]/60 text-[#e1e1e1] border border-transparent"
                    }`}
                  >
                    {/* Avatar with ONLY online/offline dot on edge */}
                    <div className="relative shrink-0">
                      <Avatar className="size-12">
                        {item.avatarUrl && (
                          <AvatarImage src={item.avatarUrl} alt={item.displayName} />
                        )}
                        <AvatarFallback
                          className={`${getAvatarColor(
                            item.displayName,
                          )} text-white font-bold text-sm`}
                        >
                          {item.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline ? (
                        <span
                          className="absolute bottom-0.5 right-0.5 size-3 rounded-full bg-[#4fae4e] ring-2 ring-[#190a09]"
                          title="onlayn"
                        />
                      ) : (
                        <span
                          className="absolute bottom-0.5 right-0.5 size-3 rounded-full bg-[#555555] ring-2 ring-[#190a09]"
                          title="oflayn"
                        />
                      )}
                    </div>

                    {/* Contact Info (Title, Message, and ONLY Time on right) */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-[14px] font-semibold truncate ${
                            isSelected ? "text-white" : "text-[#ffffff]"
                          }`}
                        >
                          {item.displayName}
                        </h4>
                        {time && (
                          <span
                            className={`text-[11px] shrink-0 font-medium ${
                              isSelected ? "text-white/80" : "text-[#a88a89]"
                            }`}
                          >
                            {time}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p
                          className={`text-xs truncate ${
                            isSelected ? "text-white/90" : "text-[#9e8281]"
                          }`}
                        >
                          {item.lastMessage || "Xabarlar yo'q"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            // Groups Tab
            filteredGroupRooms.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#290a08] border border-[#400907] text-[#ff7a75]">
                  <Users className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Hozircha guruhlar yo&apos;q
                  </p>
                  <p className="text-xs text-[#a88a89]">
                    {isAdmin
                      ? "Yangi guruh yaratib, xohlagan a'zolarni qo'shishingiz mumkin."
                      : "Guruhlar faqat administratorlar tomonidan yaratiladi."}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsGroupModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#8c1511] hover:bg-[#a31914] text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
                  >
                    Guruh yaratish
                  </button>
                )}
              </div>
            ) : (
              filteredGroupRooms.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const time = formatMessageTimeUz(chat.lastMessageTime);

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      setShowMobileList(false);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#400907] border border-[#8c1511]/70 text-white shadow-md"
                        : "hover:bg-[#290a08]/60 text-[#e1e1e1] border border-transparent"
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
                              isSelected ? "text-white/80" : "text-[#a88a89]"
                            }`}
                          >
                            {time}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          isSelected ? "text-white/90" : "text-[#9e8281]"
                        }`}
                      >
                        {chat.lastMessage || "Xabarlar yo'q"}
                      </p>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </aside>

      {/* =========================================================================
          RIGHT CHAT WINDOW
         ========================================================================= */}
      <main
        className={`${
          showMobileList ? "hidden md:flex" : "flex"
        } flex-1 flex-col h-full rounded-none sm:rounded-3xl border border-[#400907]/40 overflow-hidden relative shadow-2xl bg-[#000000]`}
      >
        {selectedChatId && currentRoom ? (
          <>
            {/* Top Chat Header (Clean minimal: Back, Avatar, Name, Online status only) */}
            <div className="m-2.5 mb-0 px-4 py-2.5 bg-[#190a09]/95 backdrop-blur-md rounded-2xl border border-[#400907]/50 flex items-center justify-between z-10 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setShowMobileList(true)}
                  className="md:hidden size-8 rounded-full flex items-center justify-center text-[#a88a89] hover:text-white hover:bg-[#290a08] shrink-0"
                >
                  <ArrowLeft className="size-5" />
                </button>

                {/* Avatar with status */}
                <div className="relative shrink-0">
                  <Avatar className="size-10">
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
                  {currentRoom.type === "DIRECT" && (
                    <span
                      className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-[#190a09] ${
                        isCurrentChatOnline ? "bg-[#4fae4e]" : "bg-[#555555]"
                      }`}
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-white truncate">
                    {currentRoom.name}
                  </h3>
                  {typingList.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#ff7a75] font-medium animate-in fade-in duration-200">
                      <span className="flex items-center gap-0.5 shrink-0 py-0.5">
                        <span className="size-1 rounded-full bg-[#ff7a75] animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1 rounded-full bg-[#ff7a75] animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1 rounded-full bg-[#ff7a75] animate-bounce" />
                      </span>
                      <span className="truncate">
                        {currentRoom.type === "GROUP"
                          ? typingList.length === 1
                            ? `${typingList[0]} yozmoqda...`
                            : typingList.length === 2
                            ? `${typingList[0]} va ${typingList[1]} yozmoqda...`
                            : `${typingList[0]} va yana ${typingList.length - 1} kishi yozmoqda...`
                          : "yozmoqda..."}
                      </span>
                    </div>
                  ) : currentRoom.type === "DIRECT" ? (
                    <div className="flex items-center gap-1.5 text-[12px]">
                      {isCurrentChatOnline ? (
                        <>
                          <span className="size-1.5 rounded-full bg-[#4fae4e] shrink-0" />
                          <span className="text-[#4fae4e] font-medium">online</span>
                        </>
                      ) : (
                        <>
                          <span className="size-1.5 rounded-full bg-[#555555] shrink-0" />
                          <span className="text-[#a88a89]">offline</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#a88a89] truncate">
                      <span>{currentRoom.participantsCount || 2} ta a'zo</span>
                      {(() => {
                        const onlineCount = currentRoom.participantIds
                          ? currentRoom.participantIds.filter((id) => id !== userId && onlineUsers.has(id)).length + (onlineUsers.has(userId) ? 1 : 0)
                          : 0;
                        return onlineCount > 0 ? (
                          <>
                            <span>•</span>
                            <span className="text-[#4fae4e] font-medium">{onlineCount} online</span>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 flex flex-col scrollbar-thin scrollbar-thumb-[#400907]/50 hover:scrollbar-thumb-[#8c1511]/50"
            >
              {isFetchingOlder && (
                <div className="self-center bg-[#190a09]/90 border border-[#400907] text-[11px] text-[#e68a87] px-3.5 py-1 rounded-full shadow-sm">
                  Eski xabarlar yuklanmoqda...
                </div>
              )}

              {/* Date divider (Telegram maroon pill from screenshot) */}
              <div className="self-center bg-[#290a08]/90 border border-[#8c1511]/40 text-[11px] text-[#e68a87] px-3.5 py-1 rounded-full font-medium my-2 shadow-sm">
                Bugun
              </div>

              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#8a7271] text-xs space-y-1">
                  <MessageSquare className="size-8 opacity-40 text-[#8c1511]" />
                  <p>Hozircha xabarlar yo&apos;q. Birinchi bo&apos;lib yozing!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === userId;
                  const time = formatMessageTimeUz(msg.createdAt);

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
                            ? "bg-[#400907] border border-[#8c1511]/50 text-white rounded-2xl rounded-br-xs"
                            : "bg-[#290a08] border border-[#400907] text-[#f5e6e5] rounded-2xl rounded-bl-xs"
                        }`}
                      >
                        {!isMine && currentRoom.type === "GROUP" && (
                          <p className="text-[11px] font-bold text-[#ff7a75] mb-0.5">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[11px] select-none float-right ml-2 -mb-0.5 ${
                            isMine ? "text-[#d4b0af]" : "text-[#bda2a1]"
                          }`}
                        >
                          <span>{time}</span>
                          {isMine && (
                            <span>
                              {msg.status === "READ" ? (
                                <CheckCheck className="size-3.5 text-[#ff7a75]" />
                              ) : msg.status === "DELIVERED" ? (
                                <CheckCheck className="size-3.5 text-[#d4b0af]" />
                              ) : (
                                <Check className="size-3.5 text-[#d4b0af]" />
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

            {/* Bottom Input Bar: Text input and Send button ONLY */}
            <form
              onSubmit={handleSend}
              className="m-2.5 mt-0 p-1.5 pl-4 bg-[#190a09] rounded-2xl border border-[#400907]/60 flex items-center gap-2 shadow-xl shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Xabar yozing..."
                className="flex-1 bg-transparent text-white text-[14px] placeholder-[#8a7271] focus:outline-hidden py-1.5"
              />

              {/* Crimson Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="size-10 rounded-full bg-[#8c1511] hover:bg-[#a31914] disabled:opacity-40 disabled:hover:bg-[#8c1511] text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md shadow-[#8c1511]/30"
                title="Yuborish"
              >
                <Send className="size-4.5 -translate-x-0.5 translate-y-0.5" />
              </button>
            </form>
          </>
        ) : (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="size-16 rounded-full bg-[#290a08] border border-[#400907] flex items-center justify-center text-[#ff7a75]">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="text-base font-bold text-white">Suhbatni tanlang</h3>
            <p className="text-xs text-[#a88a89] max-w-xs">
              Chap tomondagi ro&apos;yxatdan biror foydalanuvchini tanlang va muloqotni boshlang.
            </p>
          </div>
        )}
      </main>

      {/* =========================================================================
          GROUP CREATION MODAL
         ========================================================================= */}
      {isGroupModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="w-full max-w-md bg-[#190a09] border border-[#400907] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#400907]/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="size-4 text-[#ff7a75]" />
                <span>Yangi guruh yaratish</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="size-8 rounded-full flex items-center justify-center text-[#a88a89] hover:text-white hover:bg-[#290a08]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#400907]/60 space-y-2">
                <label className="text-xs font-semibold text-[#a88a89]">
                  Guruh nomi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Guruh nomini kiriting..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#290a08] border border-[#400907] focus:border-[#8c1511]/70 focus:outline-hidden px-3 text-sm text-white placeholder-[#8a7271]"
                />
              </div>

              <div className="p-4 pb-2">
                <label className="text-xs font-semibold text-[#a88a89]">
                  A&apos;zolarni tanlang ({selectedGroupMembers.length} ta tanlandi)
                </label>
              </div>

              <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-thin scrollbar-thumb-[#400907]/50">
                {platformUsers.map((u) => {
                  const isSelected = selectedGroupMembers.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleGroupMember(u.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#400907] text-white border border-[#8c1511]/40"
                          : "hover:bg-[#290a08]/60 text-[#cccccc] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-9">
                          {u.image && <AvatarImage src={u.image} alt={u.name} />}
                          <AvatarFallback
                            className={`${getAvatarColor(
                              u.name,
                            )} text-white font-bold text-xs`}
                          >
                            {u.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold text-white">{u.name}</p>
                          <p className="text-[10px] text-[#a88a89]">
                            {u.username ? `@${u.username}` : u.email}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`size-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#8c1511] border-[#8c1511] text-white"
                            : "border-[#400907]"
                        }`}
                      >
                        {isSelected && <Check className="size-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-[#400907]/60 flex items-center justify-end gap-2 bg-[#120605]">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#290a08] hover:bg-[#400907] text-xs font-semibold text-[#cccccc] transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={!groupName.trim() || isSubmittingGroup}
                  className="px-5 py-2 rounded-xl bg-[#8c1511] hover:bg-[#a31914] disabled:opacity-40 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-[#8c1511]/30"
                >
                  {isSubmittingGroup ? "Yaratilmoqda..." : "Guruh yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
