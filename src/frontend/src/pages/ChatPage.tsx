import { useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Hash,
  LogOut,
  MessageCircle,
  MoreVertical,
  Newspaper,
  PenLine,
  Phone,
  Search,
  Send,
  Smile,
  Users,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupView, Message, PublicUserProfile } from "../backend.d";
import EmojiPicker from "../components/EmojiPicker";
import { backendService as backend } from "../services/backendService";
import {
  formatDateSeparator,
  formatTimestamp,
  getAvatarColor,
  getInitials,
} from "../utils/chatUtils";

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🤔",
  "👍",
  "🔥",
  "💯",
  "🚀",
  "💻",
  "🎉",
  "❤️",
  "👋",
  "🤝",
  "✅",
  "⚡",
  "🎯",
  "🛠️",
  "📦",
  "🌐",
  "🔐",
];

export default function ChatPage() {
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem("currentUsername") || "";
  const sessionToken = localStorage.getItem("sessionToken") || "";

  const [groups, setGroups] = useState<GroupView[]>([]);
  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupView | null>(null);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState<
    Record<string, bigint>
  >({});
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial data load
  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate is stable
  useEffect(() => {
    Promise.all([backend.getAllGroups(), backend.getAllUsers()])
      .then(([g, u]) => {
        setGroups(g);
        setUsers(u);
        if (g.length > 0) setSelectedGroup(g[0]);
      })
      .catch(() => navigate({ to: "/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when group changes
  useEffect(() => {
    if (!selectedGroup) return;
    backend.getMessages(selectedGroup.id, null).then((msgs) => {
      const sorted = [...msgs].sort((a, b) =>
        Number(a.timestamp - b.timestamp),
      );
      setMessages(sorted);
      if (sorted.length > 0) {
        setLastMessageTimestamps((prev) => ({
          ...prev,
          [selectedGroup.id]: sorted[sorted.length - 1].timestamp,
        }));
      }
      setUnreadCounts((prev) => ({ ...prev, [selectedGroup.id]: 0 }));
    });
  }, [selectedGroup]);

  // Auto-scroll
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on data change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // Polling for current group + users
  const pollMessages = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const since = lastMessageTimestamps[selectedGroup.id] ?? null;
      const [newMsgs, newUsers] = await Promise.all([
        backend.getMessages(selectedGroup.id, since ? since + 1n : null),
        backend.getAllUsers(),
      ]);
      setUsers(newUsers);
      if (newMsgs.length > 0) {
        const sorted = [...newMsgs].sort((a, b) =>
          Number(a.timestamp - b.timestamp),
        );
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id.toString()));
          const brandNew = sorted.filter(
            (m) => !existingIds.has(m.id.toString()),
          );
          if (brandNew.length === 0) return prev;
          const otherNew = brandNew.filter(
            (m) => m.senderUsername !== currentUsername,
          );
          if (otherNew.length > 0) {
            const names = [...new Set(otherNew.map((m) => m.senderUsername))];
            setTypingUsers(names);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => setTypingUsers([]), 3000);
            for (const m of brandNew) {
              if (
                m.senderUsername !== currentUsername &&
                typeof Notification !== "undefined" &&
                Notification.permission === "granted"
              ) {
                new Notification(
                  `${m.senderUsername} in #${selectedGroup.name}`,
                  { body: m.text },
                );
              }
            }
          }
          return [...prev, ...brandNew];
        });
        const latest = sorted[sorted.length - 1];
        setLastMessageTimestamps((prev) => ({
          ...prev,
          [selectedGroup.id]: latest.timestamp,
        }));
      }
    } catch {
      // Ignore polling errors
    }
  }, [selectedGroup, lastMessageTimestamps, currentUsername]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      pollMessages();
    }, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollMessages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !selectedGroup || sending) return;
    setInputText("");
    setSending(true);
    try {
      await backend.sendMessage(selectedGroup.id, text, sessionToken);
      // Immediately poll for updates
      await pollMessages();
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = async () => {
    try {
      await backend.logout(sessionToken);
    } catch {
      // ignore
    }
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("currentUsername");
    navigate({ to: "/login" });
  };

  const handleSelectGroup = (group: GroupView) => {
    setSelectedGroup(group);
    setUnreadCounts((prev) => ({ ...prev, [group.id]: 0 }));
    setSidebarOpen(false);
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const onlineUsers = users.filter((u) => u.online);
  const offlineUsers = users.filter((u) => !u.online);

  // Group messages by date
  const messageGroups = (() => {
    const result: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    let currentGroup: Message[] = [];
    for (const msg of messages) {
      const d = formatDateSeparator(msg.timestamp);
      if (d !== currentDate) {
        if (currentGroup.length > 0)
          result.push({ date: currentDate, messages: currentGroup });
        currentDate = d;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    }
    if (currentGroup.length > 0)
      result.push({ date: currentDate, messages: currentGroup });
    return result;
  })();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#EEF2F5" }}
    >
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed md:static inset-y-0 left-0 z-30 flex flex-col h-full w-[300px] md:w-[300px] flex-shrink-0"
            style={{
              background: "linear-gradient(180deg, #0B141A 0%, #111B21 100%)",
              borderRight: "1px solid #1A2A31",
            }}
          >
            {/* Brand header */}
            <div
              className="flex items-center justify-between px-4 py-4"
              style={{ borderBottom: "1px solid #1A2A31" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle
                    className="w-5 h-5 text-white"
                    strokeWidth={1.75}
                  />
                </div>
                <span className="font-bold text-white text-lg">
                  DevCommunity
                </span>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg transition-colors md:hidden"
                style={{ color: "#8B9EA8" }}
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Articles nav button */}
            <div className="px-3 pt-3">
              <button
                type="button"
                data-ocid="chat.link"
                onClick={() => navigate({ to: "/articles" })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/5"
                style={{ color: "#8B9EA8" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(37,211,102,0.15)" }}
                >
                  <Newspaper className="w-4 h-4" style={{ color: "#25D366" }} />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "#E2E8F0" }}
                >
                  Articles Feed
                </span>
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#8B9EA8" }}
                />
                <input
                  data-ocid="chat.search_input"
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full text-sm outline-none"
                  style={{
                    background: "#1A2A31",
                    color: "#E2E8F0",
                    border: "1px solid #2A3F4A",
                  }}
                />
              </div>
            </div>

            {/* Scrollable area */}
            <div className="flex-1 overflow-y-auto">
              {/* Groups */}
              <div className="px-3 py-2">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
                  style={{ color: "#4A5E68" }}
                >
                  Groups
                </p>
                <div className="space-y-0.5">
                  {filteredGroups.map((group, i) => {
                    const isSelected = selectedGroup?.id === group.id;
                    const unread = unreadCounts[group.id] || 0;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        data-ocid={`chat.item.${i + 1}`}
                        onClick={() => handleSelectGroup(group)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: isSelected ? "#1E2F37" : "transparent",
                          borderLeft: isSelected
                            ? "3px solid #25D366"
                            : "3px solid transparent",
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                          style={{ background: getAvatarColor(group.name) }}
                        >
                          <Hash className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className="font-medium text-sm truncate"
                              style={{
                                color: isSelected ? "#25D366" : "#E2E8F0",
                              }}
                            >
                              {group.name}
                            </span>
                            {unread > 0 && (
                              <span
                                className="text-xs font-bold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0"
                                style={{
                                  background: "#25D366",
                                  color: "white",
                                }}
                              >
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isSelected && (
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: "#25D366" }}
                              />
                            )}
                            <span
                              className="text-xs truncate"
                              style={{ color: "#4A5E68" }}
                            >
                              {isSelected
                                ? `Active · ${Number(group.memberCount)} members`
                                : `${Number(group.memberCount)} members`}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Online Users */}
              <div className="px-3 py-2 mt-2">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
                  style={{ color: "#4A5E68" }}
                >
                  Online Now
                </p>
                <div className="space-y-1">
                  {onlineUsers.slice(0, 8).map((user, i) => (
                    <div
                      key={user.username}
                      data-ocid={`chat.item.${i + 1}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: getAvatarColor(user.username) }}
                        >
                          {getInitials(user.username)}
                        </div>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                          style={{
                            background: "#25D366",
                            borderColor: "#111B21",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "#E2E8F0" }}
                        >
                          {user.username}
                        </p>
                        <p className="text-xs" style={{ color: "#25D366" }}>
                          Online
                        </p>
                      </div>
                    </div>
                  ))}
                  {offlineUsers.slice(0, 3).map((user) => (
                    <div
                      key={user.username}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-xl opacity-50"
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: getAvatarColor(user.username) }}
                        >
                          {getInitials(user.username)}
                        </div>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 bg-gray-500"
                          style={{ borderColor: "#111B21" }}
                        />
                      </div>
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: "#8B9EA8" }}
                      >
                        {user.username}
                      </p>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-xs px-3" style={{ color: "#4A5E68" }}>
                      No users yet
                    </p>
                  )}
                </div>
                {onlineUsers.length > 0 && (
                  <p className="text-xs px-3 mt-2" style={{ color: "#4A5E68" }}>
                    {onlineUsers.length} total online
                  </p>
                )}
              </div>
            </div>

            {/* Current user + logout + write article */}
            <div
              className="px-3 py-3"
              style={{ borderTop: "1px solid #1A2A31" }}
            >
              {/* Write article shortcut */}
              <button
                type="button"
                data-ocid="chat.secondary_button"
                onClick={() => navigate({ to: "/articles/new" })}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-2 text-sm font-medium transition-all hover:bg-white/5"
                style={{ color: "#8B9EA8" }}
              >
                <PenLine className="w-4 h-4" style={{ color: "#25D366" }} />
                <span style={{ color: "#E2E8F0" }}>Write Article</span>
              </button>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: getAvatarColor(currentUsername) }}
                >
                  {getInitials(currentUsername)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">
                    {currentUsername}
                  </p>
                  <p className="text-xs" style={{ color: "#25D366" }}>
                    ● Online
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid="chat.button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg transition-all hover:bg-red-500/10"
                  style={{ color: "#8B9EA8" }}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      {sidebarOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0 p-3 md:p-5">
        {selectedGroup ? (
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden shadow-card bg-white">
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: "1px solid #D9DEE3" }}
            >
              <button
                type="button"
                className="md:hidden p-1.5 rounded-lg mr-1"
                style={{ color: "#6B7280" }}
                onClick={() => setSidebarOpen(true)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: getAvatarColor(selectedGroup.name) }}
              >
                <Hash className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="font-bold text-lg truncate"
                  style={{ color: "#111827" }}
                >
                  {selectedGroup.name}
                </h2>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  {Number(selectedGroup.memberCount)} members ·{" "}
                  {onlineUsers.length} online
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-2 rounded-xl transition-colors hover:bg-gray-100"
                  style={{ color: "#6B7280" }}
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-xl transition-colors hover:bg-gray-100"
                  style={{ color: "#6B7280" }}
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-xl transition-colors hover:bg-gray-100"
                  style={{ color: "#6B7280" }}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 chat-bg-pattern">
              {messageGroups.length === 0 && (
                <div
                  data-ocid="chat.empty_state"
                  className="flex flex-col items-center justify-center h-full gap-3"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(37,211,102,0.1)" }}
                  >
                    <MessageCircle
                      className="w-7 h-7"
                      style={{ color: "#25D366" }}
                    />
                  </div>
                  <p className="font-medium" style={{ color: "#6B7280" }}>
                    No messages yet
                  </p>
                  <p className="text-sm" style={{ color: "#9CA3AF" }}>
                    Be the first to say hello!
                  </p>
                </div>
              )}

              {messageGroups.map(({ date, messages: dayMsgs }) => (
                <div key={date}>
                  <div className="flex items-center justify-center my-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: "rgba(0,0,0,0.06)",
                        color: "#6B7280",
                      }}
                    >
                      {date}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayMsgs.map((msg, idx) => {
                      const isSent = msg.senderUsername === currentUsername;
                      const prevSender =
                        idx > 0 ? dayMsgs[idx - 1].senderUsername : null;
                      const showAvatar =
                        !isSent && prevSender !== msg.senderUsername;
                      const showSenderName =
                        !isSent && prevSender !== msg.senderUsername;
                      return (
                        <motion.div
                          key={msg.id.toString()}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-end gap-2 ${
                            isSent ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isSent && (
                            <div className="flex-shrink-0 w-8">
                              {showAvatar ? (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{
                                    background: getAvatarColor(
                                      msg.senderUsername,
                                    ),
                                  }}
                                >
                                  {getInitials(msg.senderUsername)}
                                </div>
                              ) : null}
                            </div>
                          )}
                          <div
                            className={`flex flex-col max-w-[65%] ${
                              isSent ? "items-end" : "items-start"
                            }`}
                          >
                            {showSenderName && (
                              <span
                                className="text-xs font-semibold mb-1 px-1"
                                style={{
                                  color: getAvatarColor(msg.senderUsername),
                                }}
                              >
                                {msg.senderUsername}
                              </span>
                            )}
                            <div
                              className="px-3 py-2 rounded-2xl shadow-bubble text-sm leading-relaxed"
                              style={
                                isSent
                                  ? {
                                      background: "#1F5D4A",
                                      color: "white",
                                      borderBottomRightRadius: "4px",
                                    }
                                  : {
                                      background: "white",
                                      color: "#111827",
                                      borderBottomLeftRadius: "4px",
                                    }
                              }
                            >
                              <p style={{ wordBreak: "break-word" }}>
                                {msg.text}
                              </p>
                              <p
                                className="text-right mt-1 select-none"
                                style={{
                                  color: isSent
                                    ? "rgba(255,255,255,0.65)"
                                    : "#9CA3AF",
                                  fontSize: "10px",
                                }}
                              >
                                {formatTimestamp(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {typingUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="flex items-end gap-2"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: getAvatarColor(typingUsers[0]) }}
                    >
                      {getInitials(typingUsers[0])}
                    </div>
                    <div
                      className="px-4 py-3 rounded-2xl shadow-bubble"
                      style={{
                        background: "white",
                        borderBottomLeftRadius: "4px",
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="block w-2 h-2 rounded-full animate-typing"
                            style={{
                              background: "#9CA3AF",
                              animationDelay: `${i * 0.2}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div
              className="px-4 py-3 relative"
              style={{ borderTop: "1px solid #D9DEE3" }}
            >
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-4 mb-2 z-50"
                  >
                    <EmojiPicker
                      emojis={EMOJIS}
                      onSelect={(emoji) => {
                        setInputText((t) => t + emoji);
                        setShowEmoji(false);
                        inputRef.current?.focus();
                      }}
                      onClose={() => setShowEmoji(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-ocid="chat.button"
                  onClick={() => setShowEmoji((v) => !v)}
                  className="p-2.5 rounded-full transition-all hover:bg-gray-100 flex-shrink-0"
                  style={{ color: "#6B7280" }}
                >
                  <Smile className="w-5 h-5" />
                </button>

                <input
                  data-ocid="chat.input"
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${selectedGroup.name}...`}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition-all"
                  style={{
                    background: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    color: "#111827",
                  }}
                />

                <button
                  type="button"
                  data-ocid="chat.submit_button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ background: "#25D366" }}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-white shadow-card">
            <div
              data-ocid="chat.empty_state"
              className="flex flex-col items-center gap-4"
            >
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: "rgba(37,211,102,0.1)" }}
              >
                <MessageCircle
                  className="w-10 h-10"
                  style={{ color: "#25D366" }}
                />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-xl" style={{ color: "#111827" }}>
                  Welcome to DevCommunity
                </h3>
                <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                  Select a group to start chatting
                </p>
              </div>
              <button
                type="button"
                className="md:hidden px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: "#25D366" }}
                onClick={() => setSidebarOpen(true)}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Browse Groups
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
