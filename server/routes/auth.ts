import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.ts';
import {
  type AuthenticatedRequest,
  authRateLimit,
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  signAuthToken,
} from '../middleware/auth.ts';
import {
  asTrimmedString,
  isValidEmail,
  toPublicUser,
} from '../utils/validation.ts';

export const authRouter = Router();

authRouter.post('/signup', authRateLimit(25), async (req, res: Response) => {
  try {
    const name = asTrimmedString(req.body?.name, 80);
    const email = asTrimmedString(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const confirmPassword =
      typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : password;
    const college = asTrimmedString(req.body?.college, 120);
    const year = asTrimmedString(req.body?.year, 40);

    if (name.length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6 || password.length > 100) {
      res.status(400).json({ error: 'Password must be between 6 and 100 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }
    if (college.length < 2) {
      res.status(400).json({ error: 'Please enter your college or university name.' });
      return;
    }
    if (!year) {
      res.status(400).json({ error: 'Please select your year of study.' });
      return;
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      res.status(409).json({
        error: 'An account with this email already exists. Try signing in instead.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await db.createUser({
      name,
      email,
      password: hashedPassword,
      college,
      year,
      bio: '',
      profileImage: '',
      skills: [],
      interests: [],
      preferredActivities: [],
      availability: '',
      skillLevel: 'Intermediate',
      isCommunityProfile: false,
      createdAt: new Date().toISOString(),
    });

    const token = signAuthToken({ id: createdUser.id, email: createdUser.email });
    setSessionCookie(res, token);

    res.status(201).json({
      token,
      user: toPublicUser(createdUser, true),
    });
  } catch (err) {
    console.error('[Auth Signup Error]', err);
    res.status(500).json({ error: 'Unable to create account right now. Please try again.' });
  }
});

authRouter.post('/login', authRateLimit(30), async (req, res: Response) => {
  try {
    const email = asTrimmedString(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ error: 'Please provide both a valid email and password.' });
      return;
    }

    const user = await db.findUserByEmail(email);
    if (!user || !user.password || user.isCommunityProfile) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signAuthToken({ id: user.id, email: user.email });
    setSessionCookie(res, token);

    res.json({
      token,
      user: toPublicUser(user, true),
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: 'Unable to sign in right now. Please try again.' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const token = signAuthToken({ id: user.id, email: user.email });
  res.json({
    token,
    user: toPublicUser(user, true),
  });
});

authRouter.post('/logout', (_req, res: Response) => {
  clearSessionCookie(res);
  res.json({ message: 'Signed out successfully.' });
});
