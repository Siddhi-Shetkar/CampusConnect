import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/database.ts';
import type { StoredUserRecord } from '../utils/validation.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'cc_session';

function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_SECRET;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  currentUser?: StoredUserRecord;
  authMethod?: 'bearer' | 'cookie';
}

export function signAuthToken(user: { id: string; email: string }): string {
  return jwt.sign({ sub: user.id, email: user.email } satisfies AuthTokenPayload, getJwtSecret(), {
    expiresIn: '7d',
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === 'object' && decoded !== null && typeof decoded.sub === 'string') {
      return { sub: decoded.sub, email: String(decoded.email || '') };
    }
    return null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Max-Age=604800',
    'SameSite=None',
    'Secure',
    'Partitioned',
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: Response): void {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    'SameSite=None',
    'Secure',
    'Partitioned',
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function parseCookieToken(req: Request): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const pairs = raw.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === COOKIE_NAME) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

function extractToken(req: Request): { token: string; method: 'bearer' | 'cookie' } | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return { token, method: 'bearer' };
  }
  const cookieToken = parseCookieToken(req);
  if (cookieToken) {
    return { token: cookieToken, method: 'cookie' };
  }
  return null;
}

function verifyCsrfForCookieMutation(req: Request): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method.toUpperCase())) return true;
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;

  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host.split(',')[0].trim()) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const extracted = extractToken(req);
  if (!extracted) {
    next();
    return;
  }

  const payload = verifyAuthToken(extracted.token);
  if (!payload) {
    next();
    return;
  }

  const user = await db.findUserById(payload.sub);
  if (user) {
    req.currentUser = user;
    req.authMethod = extracted.method;
  }
  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const extracted = extractToken(req);
  if (!extracted) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  if (extracted.method === 'cookie' && !verifyCsrfForCookieMutation(req)) {
    res.status(403).json({ error: 'Invalid request origin.' });
    return;
  }

  const payload = verifyAuthToken(extracted.token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const user = await db.findUserById(payload.sub);
  if (!user) {
    res.status(401).json({ error: 'Account no longer exists.' });
    return;
  }

  req.currentUser = user;
  req.authMethod = extracted.method;
  next();
}

// Simple in-memory rate limiter for auth endpoints (per IP)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function authRateLimit(maxRequests = 30, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = rateBuckets.get(ip);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many authentication attempts. Please wait a few minutes and try again.',
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
