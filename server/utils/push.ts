import { createRequire } from 'module';
import type * as WebPushType from 'web-push';
import { db } from '../db/database.ts';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof WebPushType;
import { emitToUser } from '../realtime/socket.ts';
import { toPublicUser } from './validation.ts';
import type { NotificationDTO, NotificationType, PushConfigDTO } from '../../src/types/campus.ts';

let initialized = false;
let publicKey = '';
let privateKey = '';
let configuredInEnv = false;

function ensurePushConfigured(): void {
  if (initialized) return;

  const envPub = process.env.VAPID_PUBLIC_KEY?.trim() || '';
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim() || '';
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:notifications@campusconnect.local';

  if (envPub && envPriv) {
    publicKey = envPub;
    privateKey = envPriv;
    configuredInEnv = true;
  } else {
    // Ephemeral in-memory VAPID pair for immediate dev/preview testing without writing secrets to disk
    const generated = webpush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    configuredInEnv = false;
    console.log(
      '[CampusConnect Push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set in env; using in-memory VAPID keys for this server session. Set persistent VAPID keys in .env / Secrets for production.'
    );
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    console.error('[CampusConnect Push] Failed to configure VAPID details:', err);
  }
  initialized = true;
}

export function getPushConfig(): PushConfigDTO {
  ensurePushConfigured();
  return {
    publicKey,
    supported: Boolean(publicKey && privateKey),
    configuredInEnv,
  };
}

export function isValidPushEndpoint(endpoint: string): boolean {
  if (!endpoint || endpoint.length > 1000) return false;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    // Block loopback and private/link-local addresses
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function sendWebPushToUser(
  recipientId: string,
  payload: { title: string; body: string; url: string; tag: string }
): Promise<{ sent: number; failed: number }> {
  ensurePushConfigured();
  const subs = await db.listPushSubscriptionsForUser(recipientId);
  if (subs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const serialized = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          serialized,
          { TTL: 3600 }
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        // Clean up expired or revoked subscriptions automatically
        if (statusCode === 404 || statusCode === 410) {
          await db.deletePushSubscriptionByEndpoint(sub.endpoint);
        }
      }
    })
  );

  return { sent, failed };
}

/**
 * Persists an in-app notification in MongoDB/DB, emits it live over Socket.IO,
 * and delivers real Web Push notifications to all of the recipient's devices.
 */
export async function notifyUser(params: {
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  tag?: string;
}): Promise<NotificationDTO> {
  const safeLink = params.link.startsWith('/') ? params.link : '/dashboard';

  const record = await db.createNotification({
    recipientId: params.recipientId,
    actorId: params.actorId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: safeLink,
  });

  const actorRecord = params.actorId ? await db.findUserById(params.actorId) : null;
  const dto: NotificationDTO = {
    id: record.id,
    type: record.type,
    title: record.title,
    body: record.body,
    link: record.link,
    read: record.read,
    actor: actorRecord ? toPublicUser(actorRecord, false) : null,
    createdAt: record.createdAt,
  };

  // Real-time in-app notification delivery
  emitToUser(params.recipientId, 'notification:new', dto);

  // Real phone/browser background Web Push notification (fire-and-forget)
  sendWebPushToUser(params.recipientId, {
    title: params.title,
    body: params.body,
    url: safeLink,
    tag: params.tag || `cc-${params.type}-${record.id}`,
  }).catch((err) => {
    console.warn('[CampusConnect Push] Delivery warning:', err instanceof Error ? err.message : err);
  });

  return dto;
}
