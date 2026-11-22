import { Router, type Response } from 'express';
import { db } from '../db/database.ts';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { asTrimmedString, isValidId, toPublicUser } from '../utils/validation.ts';
import { emitToUser } from '../realtime/socket.ts';
import { notifyUser } from '../utils/push.ts';
import type { ConversationDTO, MessageDTO } from '../../src/types/campus.ts';

export const messagesRouter = Router();

/**
 * Lists all conversations for the logged-in user, ensuring every accepted
 * connection has a conversation entry ready to open.
 */
messagesRouter.get(
  '/conversations',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.currentUser!.id;

      // Ensure a conversation exists for every accepted connection
      const allConns = await db.listConnectionsForUser(userId);
      const acceptedConns = allConns.filter((c) => c.status === 'Accepted');

      const connectionByPartner = new Map<string, (typeof acceptedConns)[number]>();
      for (const conn of acceptedConns) {
        const partnerId = conn.senderId === userId ? conn.receiverId : conn.senderId;
        if (!connectionByPartner.has(partnerId)) {
          connectionByPartner.set(partnerId, conn);
        }
        await db.findOrCreateConversation(userId, partnerId, conn.id);
      }

      const [conversations, unreadMap] = await Promise.all([
        db.listConversationsForUser(userId),
        db.countUnreadMessagesByConversation(userId),
      ]);

      // Only expose conversations with currently accepted connections
      const validConversations = conversations.filter((conv) => {
        const partnerId = conv.participants.find((p) => p !== userId);
        return Boolean(partnerId && connectionByPartner.has(partnerId));
      });

      const partnerIds = validConversations
        .map((c) => c.participants.find((p) => p !== userId) || '')
        .filter(Boolean);
      const userMap = await db.findUsersByIds(partnerIds);

      const requestIds = Array.from(
        new Set(
          Array.from(connectionByPartner.values())
            .map((c) => c.partnerRequestId)
            .filter(Boolean)
        )
      );
      const requestMap = new Map<string, Awaited<ReturnType<typeof db.findPartnerRequestById>>>();
      for (const rid of requestIds) {
        const found = await db.findPartnerRequestById(rid);
        if (found) requestMap.set(rid, found);
      }

      const items: ConversationDTO[] = [];
      let totalUnreadCount = 0;

      for (const conv of validConversations) {
        const partnerId = conv.participants.find((p) => p !== userId);
        if (!partnerId) continue;
        const partnerRecord = userMap.get(partnerId);
        if (!partnerRecord) continue;

        const conn = connectionByPartner.get(partnerId);
        const pr = conn ? requestMap.get(conn.partnerRequestId) : null;
        const unreadCount = unreadMap.get(conv.id) || 0;
        totalUnreadCount += unreadCount;

        items.push({
          id: conv.id,
          partner: toPublicUser(partnerRecord, false),
          connectedActivity: pr?.activity || null,
          connectedRequestTitle: pr?.title || null,
          lastMessageText: conv.lastMessageText,
          lastMessageSenderId: conv.lastMessageSenderId,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          createdAt: conv.createdAt,
        });
      }

      res.json({ conversations: items, totalUnreadCount });
    } catch (err) {
      console.error('[List Conversations Error]', err);
      res.status(500).json({ error: 'Unable to load conversations.' });
    }
  }
);

/**
 * Opens or creates a 1-to-1 conversation with a specific connected student.
 * Rejects with 403 if the users do not have an accepted connection.
 */
messagesRouter.post(
  '/conversations/with/:partnerId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.currentUser!.id;
      const partnerId = String(req.params.partnerId || '');

      if (!isValidId(partnerId) || partnerId === userId) {
        res.status(400).json({ error: 'Invalid recipient selected.' });
        return;
      }

      const accepted = await db.findAcceptedConnectionBetween(userId, partnerId);
      if (!accepted) {
        res.status(403).json({
          error: 'You can only message students after your connection request is accepted.',
        });
        return;
      }

      const partnerRecord = await db.findUserById(partnerId);
      if (!partnerRecord) {
        res.status(404).json({ error: 'Student not found.' });
        return;
      }

      const conv = await db.findOrCreateConversation(userId, partnerId, accepted.id);
      const pr = await db.findPartnerRequestById(accepted.partnerRequestId);
      const unreadMap = await db.countUnreadMessagesByConversation(userId);

      const dto: ConversationDTO = {
        id: conv.id,
        partner: toPublicUser(partnerRecord, false),
        connectedActivity: pr?.activity || null,
        connectedRequestTitle: pr?.title || null,
        lastMessageText: conv.lastMessageText,
        lastMessageSenderId: conv.lastMessageSenderId,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unreadMap.get(conv.id) || 0,
        createdAt: conv.createdAt,
      };

      res.json({ conversation: dto });
    } catch (err) {
      console.error('[Open Conversation Error]', err);
      res.status(500).json({ error: 'Unable to open conversation.' });
    }
  }
);

/**
 * Fetches chronological messages for a conversation (participants only).
 */
messagesRouter.get(
  '/conversations/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.currentUser!.id;
      const convId = String(req.params.id || '');
      if (!isValidId(convId)) {
        res.status(400).json({ error: 'Invalid conversation ID.' });
        return;
      }

      const conv = await db.findConversationById(convId);
      if (!conv || !conv.participants.includes(userId)) {
        res.status(403).json({ error: 'You do not have access to this conversation.' });
        return;
      }

      const partnerId = conv.participants.find((p) => p !== userId) || '';
      const connected = await db.areUsersConnected(userId, partnerId);
      if (!connected) {
        res.status(403).json({ error: 'Messaging is only available between connected students.' });
        return;
      }

      const [rawMessages, userMap] = await Promise.all([
        db.listMessagesForConversation(convId),
        db.findUsersByIds(conv.participants),
      ]);

      const messages: MessageDTO[] = [];
      for (const m of rawMessages) {
        const senderRec = userMap.get(m.senderId);
        if (!senderRec) continue;
        messages.push({
          id: m.id,
          conversationId: m.conversationId,
          sender: toPublicUser(senderRec, false),
          recipientId: m.recipientId,
          text: m.text,
          readAt: m.readAt,
          createdAt: m.createdAt,
        });
      }

      const partnerRec = userMap.get(partnerId);
      res.json({
        conversationId: conv.id,
        partner: partnerRec ? toPublicUser(partnerRec, false) : null,
        messages,
      });
    } catch (err) {
      console.error('[Get Messages Error]', err);
      res.status(500).json({ error: 'Unable to load messages.' });
    }
  }
);

/**
 * Sends a message in a conversation, persists it in the database, delivers it
 * in real time via Socket.IO, and dispatches an in-app + Web Push notification.
 */
messagesRouter.post(
  '/conversations/:id/messages',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const senderRecord = req.currentUser!;
      const convId = String(req.params.id || '');
      const text = asTrimmedString(req.body?.text, 2000);

      if (!isValidId(convId)) {
        res.status(400).json({ error: 'Invalid conversation ID.' });
        return;
      }
      if (!text) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
      }

      const conv = await db.findConversationById(convId);
      if (!conv || !conv.participants.includes(senderRecord.id)) {
        res.status(403).json({ error: 'You do not have access to this conversation.' });
        return;
      }

      const recipientId = conv.participants.find((p) => p !== senderRecord.id);
      if (!recipientId) {
        res.status(400).json({ error: 'Invalid conversation participants.' });
        return;
      }

      const connected = await db.areUsersConnected(senderRecord.id, recipientId);
      if (!connected) {
        res.status(403).json({
          error: 'You can only send messages to students you are connected with.',
        });
        return;
      }

      const saved = await db.createMessage({
        conversationId: conv.id,
        senderId: senderRecord.id,
        recipientId,
        text,
      });

      const dto: MessageDTO = {
        id: saved.id,
        conversationId: saved.conversationId,
        sender: toPublicUser(senderRecord, false),
        recipientId: saved.recipientId,
        text: saved.text,
        readAt: saved.readAt,
        createdAt: saved.createdAt,
      };

      // Real-time Socket.IO delivery to both recipient and sender (for multi-device sync)
      emitToUser(recipientId, 'message:new', dto);
      emitToUser(senderRecord.id, 'message:new', dto);

      // Persist notification & trigger real phone Web Push notification for recipient
      const snippet = text.length > 90 ? `${text.slice(0, 87)}...` : text;
      await notifyUser({
        recipientId,
        actorId: senderRecord.id,
        type: 'new_message',
        title: `New message from ${senderRecord.name}`,
        body: snippet,
        link: `/messages/${conv.id}`,
        tag: `cc-msg-${conv.id}`,
      });

      res.status(201).json({ message: dto });
    } catch (err) {
      console.error('[Send Message Error]', err);
      res.status(500).json({ error: 'Unable to send message.' });
    }
  }
);

/**
 * Marks all unread messages in a conversation addressed to the current user as read.
 */
messagesRouter.post(
  '/conversations/:id/read',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.currentUser!.id;
      const convId = String(req.params.id || '');
      if (!isValidId(convId)) {
        res.status(400).json({ error: 'Invalid conversation ID.' });
        return;
      }

      const conv = await db.findConversationById(convId);
      if (!conv || !conv.participants.includes(userId)) {
        res.status(403).json({ error: 'You do not have access to this conversation.' });
        return;
      }

      const { readIds, readAt } = await db.markConversationMessagesRead(convId, userId);

      if (readIds.length > 0) {
        const partnerId = conv.participants.find((p) => p !== userId);
        if (partnerId) {
          emitToUser(partnerId, 'message:read', {
            conversationId: convId,
            messageIds: readIds,
            readAt,
          });
        }
      }

      res.json({ readIds, readAt });
    } catch (err) {
      console.error('[Mark Read Error]', err);
      res.status(500).json({ error: 'Unable to mark messages as read.' });
    }
  }
);
