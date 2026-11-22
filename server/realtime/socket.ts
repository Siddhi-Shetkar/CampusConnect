import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifyAuthToken } from '../middleware/auth.ts';
import { db } from '../db/database.ts';
import { isValidId } from '../utils/validation.ts';

interface AuthedSocket extends Socket {
  userId?: string;
}

let ioInstance: Server | null = null;

function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    if (pair.slice(0, idx).trim() === 'cc_session') {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

export function initializeSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket: AuthedSocket, next) => {
    try {
      const authToken =
        typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth.token
          ? socket.handshake.auth.token
          : parseSessionCookie(socket.handshake.headers.cookie);

      if (!authToken) {
        next(new Error('Authentication required'));
        return;
      }

      const payload = verifyAuthToken(authToken);
      if (!payload) {
        next(new Error('Invalid or expired token'));
        return;
      }

      const user = await db.findUserById(payload.sub);
      if (!user) {
        next(new Error('User not found'));
        return;
      }

      socket.userId = user.id;
      next();
    } catch {
      next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    const userId = socket.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // Personal room for real-time messages, read receipts, and notifications
    socket.join(`user:${userId}`);

    socket.on('conversation:join', async (conversationId: unknown) => {
      if (!isValidId(conversationId)) return;
      const conv = await db.findConversationById(conversationId);
      if (conv && conv.participants.includes(userId)) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on('conversation:leave', (conversationId: unknown) => {
      if (typeof conversationId === 'string') {
        socket.leave(`conv:${conversationId}`);
      }
    });
  });

  ioInstance = io;
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}
