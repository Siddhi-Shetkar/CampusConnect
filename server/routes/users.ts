import { Router, type Response } from 'express';
import { db } from '../db/database.ts';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import {
  asTrimmedString,
  isValidId,
  isValidSkillLevel,
  sanitizeImageUrl,
  sanitizeStringArray,
  toPublicUser,
} from '../utils/validation.ts';
import {
  calculatePartnerCompatibility,
  calculateRequestCompatibility,
} from '../utils/matching.ts';
import type {
  ConnectionRequestDTO,
  DashboardSummaryDTO,
  PartnerRequestDTO,
  RecommendedPartnerDTO,
} from '../../src/types/campus.ts';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: toPublicUser(req.currentUser!, true) });
});

usersRouter.put('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const name = asTrimmedString(req.body?.name, 80);
    const college = asTrimmedString(req.body?.college, 120);
    const year = asTrimmedString(req.body?.year, 40);
    const bio = asTrimmedString(req.body?.bio, 400);
    const availability = asTrimmedString(req.body?.availability, 80);
    const profileImage = sanitizeImageUrl(req.body?.profileImage);
    const skills = sanitizeStringArray(req.body?.skills, 15, 45);
    const interests = sanitizeStringArray(req.body?.interests, 15, 45);
    const preferredActivities = sanitizeStringArray(req.body?.preferredActivities, 15, 50);
    const skillLevel = isValidSkillLevel(req.body?.skillLevel)
      ? req.body.skillLevel
      : req.currentUser!.skillLevel;

    if (name.length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters.' });
      return;
    }
    if (college.length < 2) {
      res.status(400).json({ error: 'College name must be at least 2 characters.' });
      return;
    }
    if (!year) {
      res.status(400).json({ error: 'Year of study is required.' });
      return;
    }

    const updated = await db.updateUser(userId, {
      name,
      college,
      year,
      bio,
      profileImage,
      skills,
      interests,
      preferredActivities,
      availability,
      skillLevel,
    });

    if (!updated) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.json({ user: toPublicUser(updated, true) });
  } catch (err) {
    console.error('[Profile Update Error]', err);
    res.status(500).json({ error: 'Unable to update profile.' });
  }
});

usersRouter.get('/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const viewerRecord = req.currentUser!;
    const viewer = toPublicUser(viewerRecord, false);

    const [allActiveRequests, myRequests, myConnectionRecords, allUsers] = await Promise.all([
      db.listPartnerRequests({ status: 'Active' }),
      db.listPartnerRequestsByCreator(viewer.id),
      db.listConnectionsForUser(viewer.id),
      db.listAllUsers(),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, toPublicUser(u, false)]));
    const requestMap = new Map(
      [...allActiveRequests, ...myRequests].map((r) => [r.id, r])
    );

    // Map viewer's sent connection status per partnerRequestId
    const sentStatusByRequestId = new Map<string, { status: ConnectionRequestDTO['status']; id: string }>();
    const pendingReceivedByRequestId = new Map<string, number>();

    for (const conn of myConnectionRecords) {
      if (conn.senderId === viewer.id) {
        sentStatusByRequestId.set(conn.partnerRequestId, { status: conn.status, id: conn.id });
      }
      if (conn.receiverId === viewer.id && conn.status === 'Pending') {
        pendingReceivedByRequestId.set(
          conn.partnerRequestId,
          (pendingReceivedByRequestId.get(conn.partnerRequestId) || 0) + 1
        );
      }
    }

    const otherActiveRequests = allActiveRequests.filter((r) => r.creatorId !== viewer.id);
    const recentRequests: PartnerRequestDTO[] = [];
    for (const reqItem of otherActiveRequests.slice(0, 6)) {
      const creator = userMap.get(reqItem.creatorId);
      if (!creator) continue;
      const sent = sentStatusByRequestId.get(reqItem.id);
      recentRequests.push({
        id: reqItem.id,
        creator,
        title: reqItem.title,
        category: reqItem.category,
        activity: reqItem.activity,
        description: reqItem.description,
        skillLevel: reqItem.skillLevel,
        availability: reqItem.availability,
        frequency: reqItem.frequency,
        college: reqItem.college,
        peopleNeeded: reqItem.peopleNeeded,
        status: reqItem.status,
        createdAt: reqItem.createdAt,
        compatibility: calculateRequestCompatibility(viewer, creator, reqItem),
        connectionStatus: sent?.status || null,
        connectionId: sent?.id || null,
      });
    }

    const myActiveRequests: PartnerRequestDTO[] = myRequests
      .filter((r) => r.status === 'Active')
      .map((reqItem) => ({
        id: reqItem.id,
        creator: viewer,
        title: reqItem.title,
        category: reqItem.category,
        activity: reqItem.activity,
        description: reqItem.description,
        skillLevel: reqItem.skillLevel,
        availability: reqItem.availability,
        frequency: reqItem.frequency,
        college: reqItem.college,
        peopleNeeded: reqItem.peopleNeeded,
        status: reqItem.status,
        createdAt: reqItem.createdAt,
        pendingInterestedCount: pendingReceivedByRequestId.get(reqItem.id) || 0,
      }));

    // Build Connection DTOs
    const missingRequestIds = myConnectionRecords
      .map((c) => c.partnerRequestId)
      .filter((rid) => !requestMap.has(rid));
    for (const rid of Array.from(new Set(missingRequestIds))) {
      const found = await db.findPartnerRequestById(rid);
      if (found) requestMap.set(found.id, found);
    }

    const mapConnectionDto = (conn: typeof myConnectionRecords[number]): ConnectionRequestDTO | null => {
      const sender = userMap.get(conn.senderId);
      const receiver = userMap.get(conn.receiverId);
      if (!sender || !receiver) return null;
      const pr = requestMap.get(conn.partnerRequestId);
      return {
        id: conn.id,
        sender,
        receiver,
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
        message: conn.message,
        status: conn.status,
        createdAt: conn.createdAt,
      };
    };

    const allConnDtos = myConnectionRecords
      .map(mapConnectionDto)
      .filter((x): x is ConnectionRequestDTO => x !== null);

    const pendingReceivedRequests = allConnDtos.filter(
      (c) => c.receiver.id === viewer.id && c.status === 'Pending'
    );
    const myConnections = allConnDtos.filter((c) => c.status === 'Accepted');

    // Recommended partners computed strictly from real rule-based compatibility
    const recommendedPartners: RecommendedPartnerDTO[] = [];
    for (const candidateRecord of allUsers) {
      if (candidateRecord.id === viewer.id) continue;
      const candidate = toPublicUser(candidateRecord, false);
      const compat = calculatePartnerCompatibility(viewer, candidate);
      if (!compat) continue;
      const candidateReqs = allActiveRequests.filter((r) => r.creatorId === candidate.id);
      recommendedPartners.push({
        user: candidate,
        compatibility: compat,
        activeRequestCount: candidateReqs.length,
        latestRequestId: candidateReqs[0]?.id,
        latestRequestTitle: candidateReqs[0]?.title,
      });
    }

    recommendedPartners.sort((a, b) => b.compatibility.score - a.compatibility.score);

    const summary: DashboardSummaryDTO = {
      recentRequests,
      recommendedPartners: recommendedPartners.slice(0, 4),
      myActiveRequests,
      pendingReceivedRequests,
      myConnections,
      stats: {
        activeRequestsCount: myActiveRequests.length,
        pendingReceivedCount: pendingReceivedRequests.length,
        connectionsCount: myConnections.length,
      },
    };

    res.json(summary);
  } catch (err) {
    console.error('[Dashboard Summary Error]', err);
    res.status(500).json({ error: 'Unable to load dashboard.' });
  }
});

usersRouter.get('/:id', async (req, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Invalid user ID.' });
      return;
    }
    const user = await db.findUserById(id);
    if (!user) {
      res.status(404).json({ error: 'Student profile not found.' });
      return;
    }
    res.json({ user: toPublicUser(user, false) });
  } catch (err) {
    console.error('[Get User Error]', err);
    res.status(500).json({ error: 'Unable to fetch student profile.' });
  }
});
