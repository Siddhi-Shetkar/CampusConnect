import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  getInMemoryToken,
  messagesApi,
  notificationsApi,
} from '../services/api';
import { MessageDTO, NotificationDTO } from '../types/campus';

type MessageListener = (msg: MessageDTO) => void;
type ReadReceiptListener = (payload: {
  conversationId: string;
  messageIds: string[];
  readAt: string;
}) => void;
type ConnectionUpdateListener = (payload: { type: string; connectionId: string }) => void;

interface RealtimeContextValue {
  notifications: NotificationDTO[];
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  refreshNotifications: () => Promise<void>;
  refreshUnreadMessages: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  subscribeMessages: (listener: MessageListener) => () => void;
  subscribeReadReceipts: (listener: ReadReceiptListener) => () => void;
  subscribeConnectionUpdates: (listener: ConnectionUpdateListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshPendingCount } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const messageListenersRef = useRef<Set<MessageListener>>(new Set());
  const readListenersRef = useRef<Set<ReadReceiptListener>>(new Set());
  const connectionListenersRef = useRef<Set<ConnectionUpdateListener>>(new Set());

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const res = await notificationsApi.list();
      setNotifications(res.notifications);
      setUnreadNotificationsCount(res.unreadCount);
    } catch {
      // Ignore silent refresh failure
    }
  }, [user]);

  const refreshUnreadMessages = useCallback(async () => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }
    try {
      const res = await messagesApi.listConversations();
      setUnreadMessagesCount(res.totalUnreadCount);
    } catch {
      // Ignore silent refresh failure
    }
  }, [user]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      const res = await notificationsApi.markRead(id);
      setUnreadNotificationsCount(res.unreadCount);
    } catch {
      // Ignore
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotificationsCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      // Ignore
    }
  }, []);

  const subscribeMessages = useCallback((listener: MessageListener) => {
    messageListenersRef.current.add(listener);
    return () => {
      messageListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeReadReceipts = useCallback((listener: ReadReceiptListener) => {
    readListenersRef.current.add(listener);
    return () => {
      readListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeConnectionUpdates = useCallback((listener: ConnectionUpdateListener) => {
    connectionListenersRef.current.add(listener);
    return () => {
      connectionListenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setUnreadNotificationsCount(0);
      setUnreadMessagesCount(0);
      return;
    }

    refreshNotifications();
    refreshUnreadMessages();

    const token = getInMemoryToken();
    const socket = io('/', {
      path: '/socket.io',
      auth: token ? { token } : undefined,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      // Sync state on connect/reconnect
      refreshNotifications();
      refreshUnreadMessages();
      refreshPendingCount();
    });

    socket.on('message:new', (msg: MessageDTO) => {
      for (const listener of messageListenersRef.current) {
        listener(msg);
      }
      if (msg.recipientId === user.id) {
        refreshUnreadMessages();
      }
    });

    socket.on(
      'message:read',
      (payload: { conversationId: string; messageIds: string[]; readAt: string }) => {
        for (const listener of readListenersRef.current) {
          listener(payload);
        }
      }
    );

    socket.on('notification:new', (notif: NotificationDTO) => {
      setNotifications((prev) => {
        if (prev.some((existing) => existing.id === notif.id)) return prev;
        return [notif, ...prev].slice(0, 40);
      });
      setUnreadNotificationsCount((prev) => prev + 1);

      // Show non-intrusive toast if not currently inside that exact conversation
      const currentPath = window.location.pathname;
      if (notif.type === 'new_message' && currentPath === notif.link) {
        return;
      }
      showToast(`${notif.title}: ${notif.body}`, 'info');
    });

    socket.on('connection:updated', (payload: { type: string; connectionId: string }) => {
      refreshPendingCount();
      for (const listener of connectionListenersRef.current) {
        listener(payload);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    user,
    refreshNotifications,
    refreshUnreadMessages,
    refreshPendingCount,
    showToast,
  ]);

  return (
    <RealtimeContext.Provider
      value={{
        notifications,
        unreadNotificationsCount,
        unreadMessagesCount,
        refreshNotifications,
        refreshUnreadMessages,
        markNotificationRead,
        markAllNotificationsRead,
        subscribeMessages,
        subscribeReadReceipts,
        subscribeConnectionUpdates,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return ctx;
}
