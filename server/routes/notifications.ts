import { Router, type Response } from 'express';
import { db } from '../db/database.ts';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { asTrimmedString, isValidId, toPublicUser } from '../utils/validation.ts';
import {
  getPushConfig,
  isValidPushEndpoint,
  sendWebPushToUser,
} from '../utils/push.ts';
import type { NotificationDTO } from '../../src/types/campus.ts';

export const notificationsRouter = Router();

// List in-app notifications for logged-in user
notificationsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const [records, unreadCount] = await Promise.all([
      db.listNotificationsForUser(userId, 40),
      db.countUnreadNotifications(userId),
    ]);

    const actorIds = records.map((r) => r.actorId || '').filter(Boolean);
    const actorMap = await db.findUsersByIds(actorIds);

    const notifications: NotificationDTO[] = records.map((r) => {
      const actorRec = r.actorId ? actorMap.get(r.actorId) : null;
      return {
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.link,
        read: r.read,
        actor: actorRec ? toPublicUser(actorRec, false) : null,
        createdAt: r.createdAt,
      };
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('[List Notifications Error]', err);
    res.status(500).json({ error: 'Unable to load notifications.' });
  }
});

// Mark single notification read
notificationsRouter.patch(
  '/:id/read',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = String(req.params.id || '');
      if (!isValidId(id)) {
        res.status(400).json({ error: 'Invalid notification ID.' });
        return;
      }
      const updated = await db.markNotificationRead(id, req.currentUser!.id);
      if (!updated) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
      }
      const unreadCount = await db.countUnreadNotifications(req.currentUser!.id);
      res.json({ ok: true, unreadCount });
    } catch (err) {
      console.error('[Mark Notification Read Error]', err);
      res.status(500).json({ error: 'Unable to mark notification as read.' });
    }
  }
);

// Mark all notifications read
notificationsRouter.post(
  '/read-all',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await db.markAllNotificationsRead(req.currentUser!.id);
      res.json({ ok: true, unreadCount: 0 });
    } catch (err) {
      console.error('[Mark All Read Error]', err);
      res.status(500).json({ error: 'Unable to mark all notifications as read.' });
    }
  }
);

// Return Web Push VAPID public key configuration
notificationsRouter.get(
  '/push-config',
  requireAuth,
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json(getPushConfig());
  }
);

// Save a browser/phone Web Push subscription securely for the current user
notificationsRouter.post(
  '/subscribe',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const endpoint = asTrimmedString(req.body?.endpoint, 1000);
      const p256dh = asTrimmedString(req.body?.keys?.p256dh, 300);
      const auth = asTrimmedString(req.body?.keys?.auth, 300);
      const userAgent = asTrimmedString(req.headers['user-agent'] || '', 250);

      if (!isValidPushEndpoint(endpoint) || !p256dh || !auth) {
        res.status(400).json({ error: 'Invalid push subscription payload.' });
        return;
      }

      await db.upsertPushSubscription({
        userId: req.currentUser!.id,
        endpoint,
        keys: { p256dh, auth },
        userAgent,
      });

      res.status(201).json({ ok: true, message: 'Phone push notifications enabled.' });
    } catch (err) {
      console.error('[Push Subscribe Error]', err);
      res.status(500).json({ error: 'Unable to save push subscription.' });
    }
  }
);

// Remove a browser/phone Web Push subscription
notificationsRouter.post(
  '/unsubscribe',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const endpoint = asTrimmedString(req.body?.endpoint, 1000);
      if (endpoint) {
        await db.deletePushSubscriptionByEndpoint(endpoint, req.currentUser!.id);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[Push Unsubscribe Error]', err);
      res.status(500).json({ error: 'Unable to unsubscribe device.' });
    }
  }
);

// Send a test Web Push notification to verify phone delivery
notificationsRouter.post(
  '/test-push',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await sendWebPushToUser(req.currentUser!.id, {
        title: 'CampusConnect notifications active',
        body: 'You will receive alerts here for new partner requests, acceptances, and messages.',
        url: '/dashboard',
        tag: 'cc-test-push',
      });
      res.json({
        ok: true,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (err) {
      console.error('[Test Push Error]', err);
      res.status(500).json({ error: 'Unable to send test notification.' });
    }
  }
);
