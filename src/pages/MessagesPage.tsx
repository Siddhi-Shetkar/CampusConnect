import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { ApiError, messagesApi } from '../services/api';
import { ConversationDTO, MessageDTO } from '../types/campus';
import { Avatar } from '../components/Avatar';
import { formatRelativeDate } from '../components/RequestCard';

function formatMessageTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MessagesPage() {
  const { conversationId: routeConvId } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const withUserId = searchParams.get('with');

  const { user } = useAuth();
  const {
    subscribeMessages,
    subscribeReadReceipts,
    subscribeConnectionUpdates,
    refreshUnreadMessages,
  } = useRealtime();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(routeConvId || null);

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<string | null>(activeConvId);
  activeConvIdRef.current = activeConvId;

  const loadConversations = useCallback(async () => {
    try {
      const res = await messagesApi.listConversations();
      setConversations(res.conversations);
      return res.conversations;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load conversations.');
      return [];
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  // Load conversations on mount and handle ?with=<partnerId> deep link
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (withUserId) {
        try {
          const opened = await messagesApi.openWithUser(withUserId);
          if (!mounted) return;
          setSearchParams({}, { replace: true });
          await loadConversations();
          setActiveConvId(opened.conversation.id);
          navigate(`/messages/${opened.conversation.id}`, { replace: true });
          return;
        } catch (err) {
          if (mounted) {
            showToast(
              err instanceof ApiError
                ? err.message
                : 'You can only message accepted connections.',
              'error'
            );
            setSearchParams({}, { replace: true });
          }
        }
      }
      await loadConversations();
    })();

    return () => {
      mounted = false;
    };
  }, [withUserId, loadConversations, navigate, setSearchParams, showToast]);

  // Sync URL param to active conversation
  useEffect(() => {
    if (routeConvId) {
      setActiveConvId(routeConvId);
    }
  }, [routeConvId]);

  // Load messages for selected conversation and mark incoming messages read
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoadingMessages(true);
    setError('');

    messagesApi
      .getMessages(activeConvId)
      .then(async (res) => {
        if (!active) return;
        setMessages(res.messages);
        // Mark incoming unread messages as read
        const hasUnread = res.messages.some(
          (m) => m.recipientId === user?.id && !m.readAt
        );
        if (hasUnread) {
          await messagesApi.markRead(activeConvId).catch(() => {});
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
          );
          refreshUnreadMessages();
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load messages.');
        }
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });

    return () => {
      active = false;
    };
  }, [activeConvId, user?.id, refreshUnreadMessages]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]);

  // Subscribe to real-time Socket.IO messages, read receipts, and connection updates
  useEffect(() => {
    const unsubMsg = subscribeMessages((incoming) => {
      const currentOpenId = activeConvIdRef.current;

      // Update conversation list preview & unread counter
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === incoming.conversationId);
        if (!exists) {
          loadConversations();
          return prev;
        }
        const updated = prev.map((c) => {
          if (c.id !== incoming.conversationId) return c;
          const isIncomingForMe = incoming.recipientId === user?.id;
          const isCurrentlyOpen = currentOpenId === incoming.conversationId;
          return {
            ...c,
            lastMessageText: incoming.text,
            lastMessageSenderId: incoming.sender.id,
            lastMessageAt: incoming.createdAt,
            unreadCount:
              isIncomingForMe && !isCurrentlyOpen ? c.unreadCount + 1 : c.unreadCount,
          };
        });
        return [...updated].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      });

      // Append message to active conversation (idempotent deduplication by ID)
      if (currentOpenId === incoming.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });

        // Mark as read immediately if I am the recipient viewing this thread
        if (incoming.recipientId === user?.id) {
          messagesApi
            .markRead(incoming.conversationId)
            .then(() => refreshUnreadMessages())
            .catch(() => {});
        }
      }
    });

    const unsubRead = subscribeReadReceipts(({ conversationId, messageIds, readAt }) => {
      if (activeConvIdRef.current !== conversationId) return;
      const idSet = new Set(messageIds);
      setMessages((prev) =>
        prev.map((m) => (idSet.has(m.id) ? { ...m, readAt } : m))
      );
    });

    const unsubConn = subscribeConnectionUpdates(() => {
      loadConversations();
    });

    return () => {
      unsubMsg();
      unsubRead();
      unsubConn();
    };
  }, [
    subscribeMessages,
    subscribeReadReceipts,
    subscribeConnectionUpdates,
    user?.id,
    loadConversations,
    refreshUnreadMessages,
  ]);

  const handleSelectConversation = (convId: string) => {
    setActiveConvId(convId);
    navigate(`/messages/${convId}`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeConvId || sending) return;

    setSending(true);
    setDraft('');
    try {
      const res = await messagesApi.sendMessage(activeConvId, trimmed);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                lastMessageText: res.message.text,
                lastMessageSenderId: res.message.sender.id,
                lastMessageAt: res.message.createdAt,
              }
            : c
        );
        return [...updated].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      });
    } catch (err) {
      setDraft(trimmed);
      showToast(err instanceof ApiError ? err.message : 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Messages
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Real-time conversations with your accepted campus connections.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loadingConvs ? (
        <div className="bg-white border border-slate-200 rounded-2xl h-[65vh] animate-pulse" />
      ) : conversations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            No conversations yet
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Messaging unlocks automatically once a connection request is accepted. Discover
            students or check your pending requests to get started.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/discover"
              className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
            >
              Find Partners
            </Link>
            <Link
              to="/connections"
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              View Connections
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-13rem)] min-h-[500px]">
          {/* Left Conversations Sidebar (hidden on mobile when a chat is open) */}
          <aside
            className={`${
              activeConvId ? 'hidden lg:flex' : 'flex'
            } lg:col-span-4 border-r border-slate-200 flex-col min-h-0`}
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Connected Students ({conversations.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {conversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left px-5 py-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar
                      name={conv.partner.name}
                      src={conv.partner.profileImage}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {conv.partner.name}
                        </p>
                        <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                          {formatRelativeDate(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {conv.partner.college}
                        {conv.connectedActivity ? ` · ${conv.connectedActivity}` : ''}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <p
                          className={`text-xs truncate ${
                            conv.unreadCount > 0
                              ? 'font-semibold text-slate-900'
                              : 'text-slate-500'
                          }`}
                        >
                          {conv.lastMessageText
                            ? conv.lastMessageSenderId === user?.id
                              ? `You: ${conv.lastMessageText}`
                              : conv.lastMessageText
                            : 'Start the conversation'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-700 text-white text-[11px] font-mono tabular-nums font-semibold inline-flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Active Chat Panel */}
          <section
            className={`${
              activeConvId ? 'flex' : 'hidden lg:flex'
            } lg:col-span-8 flex-col min-h-0 bg-slate-50/60`}
          >
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-800">
                  Select a conversation
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Pick a connected student on the left to start chatting in real time.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConvId(null);
                        navigate('/messages');
                      }}
                      aria-label="Back to conversations"
                      className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <Avatar
                      name={activeConversation.partner.name}
                      src={activeConversation.partner.profileImage}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {activeConversation.partner.name}
                      </h2>
                      <p className="text-xs text-slate-500 truncate">
                        {activeConversation.partner.college} · {activeConversation.partner.year}
                        {activeConversation.connectedActivity
                          ? ` · ${activeConversation.connectedActivity}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </header>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
                  {loadingMessages ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-12 w-2/3 bg-slate-200 rounded-xl" />
                      <div className="h-12 w-1/2 bg-slate-200 rounded-xl ml-auto" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10">
                      <p className="text-sm font-medium text-slate-800">
                        Say hi to {activeConversation.partner.name}!
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Coordinate your schedule, share topics, or plan your first session
                        together.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender.id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2.5 ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!isMine && (
                            <Avatar
                              name={msg.sender.name}
                              src={msg.sender.profileImage}
                              size="sm"
                            />
                          )}
                          <div
                            className={`max-w-[82%] sm:max-w-[70%] flex flex-col ${
                              isMine ? 'items-end' : 'items-start'
                            }`}
                          >
                            {!isMine && (
                              <span className="text-[11px] font-medium text-slate-500 mb-1 ml-1">
                                {msg.sender.name}
                              </span>
                            )}
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isMine
                                  ? 'bg-slate-900 text-white rounded-br-sm'
                                  : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
                              }`}
                            >
                              {msg.text}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400 tabular-nums">
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {isMine && (
                                <span
                                  className={`inline-flex items-center gap-0.5 ${
                                    msg.readAt ? 'text-indigo-700 font-medium' : 'text-slate-400'
                                  }`}
                                  title={msg.readAt ? 'Read' : 'Sent'}
                                >
                                  {msg.readAt ? (
                                    <>
                                      <CheckCheck className="w-3.5 h-3.5" />
                                      Read
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      Sent
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Message Composer */}
                <form
                  onSubmit={handleSend}
                  className="bg-white border-t border-slate-200 p-3 sm:p-4 flex items-center gap-2.5 shrink-0"
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${activeConversation.partner.name}...`}
                    aria-label="Write a message"
                    maxLength={2000}
                    className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    aria-label="Send message"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
