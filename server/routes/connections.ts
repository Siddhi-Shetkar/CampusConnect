import { Router, type Response } from 'express';
import { db, type StoredConnectionRequestRecord } from '../db/database.ts';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { asTrimmedString, isValidId, toPublicUser } from '../utils/validation.ts';
import { notifyUser } from '../utils/push.ts';
import { emitToUser } from '../realtime/socket.ts';
import type { ConnectionRequestDTO } from '../../src/types/campus.ts';

export const connectionsRouter = Router();

async function hydrateConnections(
  records: StoredConnectionRequestRecord[]
): Promise<ConnectionRequestDTO[]> {
  if (records.length === 0) return [];

  const userIds: string[] = [];
  const requestIds: string[] = [];
  for (const r of records) {
    userIds.push(r.senderId, r.receiverId);
    requestIds.push(r.partnerRequestId);
  }

  const userMap = await db.findUsersByIds(userIds);
  const reqMap = new Map<string, Awaited<ReturnType<typeof db.findPartnerRequestById>>>();
  for (const rid of Array.from(new Set(requestIds))) {
    const found = await db.findPartnerRequestById(rid);
    if (found) reqMap.set(rid, found);
  }

  const result: ConnectionRequestDTO[] = [];
  for (const c of records) {
    const sender = userMap.get(c.senderId);
    const receiver = userMap.get(c.receiverId);
    if (!sender || !receiver) continue;
    const pr = reqMap.get(c.partnerRequestId);
    result.push({
      id: c.id,
      sender: toPublicUser(sender, false),
      receiver: toPublicUser(receiver, false),
      partnerRequest: pr
        ? {
            id: pr.id,
            title: pr.title,
            category: pr.category,
            activity: pr.activity,
            college: pr.college,
            availability: pr.availability,
            skillLevel: pr.skillLevel,
            status: pr.status,
          }
        : null,
      message: c.message,
      status: c.status,
      createdAt: c.createdAt,
    });
  }
  return result;
}

// Get all accepted connections, received requests, and sent requests for the logged-in user
connectionsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const raw = await db.listConnectionsForUser(userId);
    const hydrated = await hydrateConnections(raw);

    const accepted = hydrated.filter((c) => c.status === 'Accepted');
    const received = hydrated.filter((c) => c.receiver.id === userId);
    const sent = hydrated.filter((c) => c.sender.id === userId);
    const pendingReceivedCount = received.filter((c) => c.status === 'Pending').length;

    res.json({
      connections: accepted,
      received,
      sent,
      pendingReceivedCount,
    });
  } catch (err) {
    console.error('[List Connections Error]', err);
    res.status(500).json({ error: 'Unable to load connections.' });
  }
});

// Get interested students for a specific partner request (creator only)
connectionsRouter.get(
  '/request/:requestId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestId = String(req.params.requestId || '');
      if (!isValidId(requestId)) {
        res.status(400).json({ error: 'Invalid request ID.' });
        return;
      }

      const partnerRequest = await db.findPartnerRequestById(requestId);
      if (!partnerRequest) {
        res.status(404).json({ error: 'Partner request not found.' });
        return;
      }

      if (partnerRequest.creatorId !== req.currentUser!.id) {
        res.status(403).json({ error: 'You can only view interested students for your own requests.' });
        return;
      }

      const raw = await db.listConnectionsForPartnerRequest(requestId);
      const hydrated = await hydrateConnections(raw);
      res.json({ interested: hydrated });
    } catch (err) {
      console.error('[Get Interested Students Error]', err);
      res.status(500).json({ error: 'Unable to load interested students.' });
    }
  }
);

// Send a partner connection request
connectionsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sender = req.currentUser!;
    const partnerRequestId = asTrimmedString(req.body?.partnerRequestId, 60);
    const message = asTrimmedString(req.body?.message, 400);

    if (!isValidId(partnerRequestId)) {
      res.status(400).json({ error: 'Invalid partner request ID.' });
      return;
    }

    const partnerRequest = await db.findPartnerRequestById(partnerRequestId);
    if (!partnerRequest) {
      res.status(404).json({ error: 'Partner request not found.' });
      return;
    }

    if (partnerRequest.status !== 'Active') {
      res.status(400).json({ error: 'This request is no longer accepting new partner requests.' });
      return;
    }

    if (partnerRequest.creatorId === sender.id) {
      res.status(400).json({ error: 'You cannot send a partner request to your own listing.' });
      return;
    }

    const existing = await db.findConnectionBySenderAndRequest(sender.id, partnerRequestId);
    if (existing) {
      if (existing.status === 'Pending') {
        res.status(409).json({ error: 'You already have a pending request for this listing.' });
        return;
      }
      if (existing.status === 'Accepted') {
        res.status(409).json({ error: 'You are already connected for this listing.' });
        return;
      }
      res.status(409).json({ error: 'You have already submitted a request for this listing.' });
      return;
    }

    const created = await db.createConnectionRequest({
      senderId: sender.id,
      receiverId: partnerRequest.creatorId,
      partnerRequestId,
      message,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    });

    const [hydrated] = await hydrateConnections([created]);

    await notifyUser({
      recipientId: partnerRequest.creatorId,
      actorId: sender.id,
      type: 'connection_request',
      title: `${sender.name} sent a partner request`,
      body: `Interested in "${partnerRequest.title}" (${partnerRequest.activity})`,
      link: '/connections?tab=received',
      tag: `cc-conn-req-${created.id}`,
    });
    emitToUser(partnerRequest.creatorId, 'connection:updated', { type: 'received', connectionId: created.id });

    res.status(201).json({ connection: hydrated });
  } catch (err) {
    console.error('[Send Connection Error]', err);
    res.status(500).json({ error: 'Unable to send partner request.' });
  }
});

// Accept or reject a received connection request (receiver only)
connectionsRouter.patch(
  '/:id/respond',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = String(req.params.id || '');
      if (!isValidId(id)) {
        res.status(400).json({ error: 'Invalid connection request ID.' });
        return;
      }

      const action = req.body?.status;
      if (action !== 'Accepted' && action !== 'Rejected') {
        res.status(400).json({ error: 'Status must be either Accepted or Rejected.' });
        return;
      }

      const existing = await db.findConnectionById(id);
      if (!existing) {
        res.status(404).json({ error: 'Connection request not found.' });
        return;
      }

      if (existing.receiverId !== req.currentUser!.id) {
        res.status(403).json({ error: 'Only the recipient can respond to this request.' });
        return;
      }

      if (existing.status !== 'Pending') {
        res.status(400).json({ error: `This request has already been ${existing.status.toLowerCase()}.` });
        return;
      }

      const updated = await db.updateConnectionStatus(id, action);
      if (!updated) {
        res.status(404).json({ error: 'Connection request not found.' });
        return;
      }

      const [hydrated] = await hydrateConnections([updated]);
      const responder = req.currentUser!;
      const partnerRequest = await db.findPartnerRequestById(existing.partnerRequestId);

      let conversationId: string | null = null;
      if (action === 'Accepted') {
        const conv = await db.findOrCreateConversation(
          existing.senderId,
          existing.receiverId,
          existing.id
        );
        conversationId = conv.id;

        await notifyUser({
          recipientId: existing.senderId,
          actorId: responder.id,
          type: 'connection_accepted',
          title: `${responder.name} accepted your request`,
          body: partnerRequest
            ? `You are now connected for ${partnerRequest.activity}. Tap to start chatting.`
            : 'You are now connected! Tap to start chatting.',
          link: `/messages/${conv.id}`,
          tag: `cc-conn-acc-${existing.id}`,
        });
      } else {
        await notifyUser({
          recipientId: existing.senderId,
          actorId: responder.id,
          type: 'connection_rejected',
          title: `${responder.name} responded to your request`,
          body: partnerRequest
            ? `Your partner request for "${partnerRequest.title}" was declined.`
            : 'Your partner request was declined.',
          link: '/connections?tab=sent',
          tag: `cc-conn-rej-${existing.id}`,
        });
      }

      emitToUser(existing.senderId, 'connection:updated', { type: action, connectionId: existing.id });
      emitToUser(existing.receiverId, 'connection:updated', { type: action, connectionId: existing.id });

      res.json({ connection: hydrated, conversationId });
    } catch (err) {
      console.error('[Respond Connection Error]', err);
      res.status(500).json({ error: 'Unable to update connection request.' });
    }
  }
);
