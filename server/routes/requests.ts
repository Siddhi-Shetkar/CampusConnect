import { Router, type Response } from 'express';
import { db } from '../db/database.ts';
import { type AuthenticatedRequest, optionalAuth, requireAuth } from '../middleware/auth.ts';
import {
  asTrimmedString,
  isValidCategory,
  isValidFrequency,
  isValidId,
  isValidRequestStatus,
  isValidSkillLevel,
  toPublicUser,
} from '../utils/validation.ts';
import {
  calculateRequestCompatibility,
  matchesAvailabilityFilter,
} from '../utils/matching.ts';
import type { PartnerRequestDTO } from '../../src/types/campus.ts';

export const requestsRouter = Router();

// Discover partner requests (publicly viewable; enriches compatibility & connection status if authenticated)
requestsRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = asTrimmedString(req.query.category, 40);
    const activity = asTrimmedString(req.query.activity, 80);
    const college = asTrimmedString(req.query.college, 120);
    const skillLevel = asTrimmedString(req.query.skillLevel, 40);
    const availability = asTrimmedString(req.query.availability, 80);
    const search = asTrimmedString(req.query.search, 120);
    const sort = asTrimmedString(req.query.sort, 30) || 'newest';
    const includeOwn = req.query.includeOwn === 'true';

    const rawRequests = await db.listPartnerRequests({
      status: 'Active',
      category: category || undefined,
      activity: activity || undefined,
      college: college || undefined,
      skillLevel: skillLevel || undefined,
    });

    const viewer = req.currentUser ? toPublicUser(req.currentUser, false) : null;

    const filtered = rawRequests.filter((r) => {
      if (viewer && !includeOwn && r.creatorId === viewer.id) return false;
      if (availability && !matchesAvailabilityFilter(r.availability, availability)) return false;
      return true;
    });

    const creatorMap = await db.findUsersByIds(filtered.map((r) => r.creatorId));

    const sentByRequest = new Map<string, { status: PartnerRequestDTO['connectionStatus']; id: string }>();
    if (viewer) {
      const conns = await db.listConnectionsForUser(viewer.id);
      for (const c of conns) {
        if (c.senderId === viewer.id) {
          sentByRequest.set(c.partnerRequestId, { status: c.status, id: c.id });
        }
      }
    }

    const searchLower = search.toLowerCase();
    const items: PartnerRequestDTO[] = [];
    for (const r of filtered) {
      const creatorRecord = creatorMap.get(r.creatorId);
      if (!creatorRecord) continue;
      const creator = toPublicUser(creatorRecord, false);

      if (searchLower) {
        const searchableText = [
          r.title,
          r.description,
          r.activity,
          r.category,
          r.college,
          r.availability,
          creator.name,
          creator.college,
          ...creator.skills,
          ...creator.interests,
        ]
          .join(' ')
          .toLowerCase();
        if (!searchableText.includes(searchLower)) continue;
      }

      const compatibility =
        viewer && creator.id !== viewer.id
          ? calculateRequestCompatibility(viewer, creator, r)
          : null;
      const sent = sentByRequest.get(r.id);

      items.push({
        id: r.id,
        creator,
        title: r.title,
        category: r.category,
        activity: r.activity,
        description: r.description,
        skillLevel: r.skillLevel,
        availability: r.availability,
        frequency: r.frequency,
        college: r.college,
        peopleNeeded: r.peopleNeeded,
        status: r.status,
        createdAt: r.createdAt,
        compatibility,
        connectionStatus: sent?.status || null,
        connectionId: sent?.id || null,
      });
    }

    if (sort === 'match' && viewer) {
      items.sort((a, b) => {
        const scoreA = a.compatibility?.score ?? -1;
        const scoreB = b.compatibility?.score ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.createdAt.localeCompare(a.createdAt);
      });
    } else {
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // Return distinct colleges & activities present in real database records
    const [allActive, allUsers] = await Promise.all([
      db.listPartnerRequests({ status: 'Active' }),
      db.listAllUsers(),
    ]);
    const collegeSet = new Map<string, string>();
    for (const col of [
      ...allActive.map((r) => r.college),
      ...allUsers.map((u) => u.college),
    ]) {
      const trimmed = col?.trim();
      if (trimmed) {
        const key = trimmed.toLowerCase();
        if (!collegeSet.has(key)) collegeSet.set(key, trimmed);
      }
    }
    const colleges = Array.from(collegeSet.values()).sort((a, b) => a.localeCompare(b));
    const activities = Array.from(new Set(allActive.map((r) => r.activity).filter(Boolean))).sort();

    res.json({
      requests: items,
      facets: { colleges, activities },
    });
  } catch (err) {
    console.error('[List Partner Requests Error]', err);
    res.status(500).json({ error: 'Unable to load partner requests.' });
  }
});

// Logged-in user's own requests with interested student counts
requestsRouter.get('/mine', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const viewer = toPublicUser(req.currentUser!, false);
    const [myRequests, myConns] = await Promise.all([
      db.listPartnerRequestsByCreator(viewer.id),
      db.listConnectionsForUser(viewer.id),
    ]);

    const pendingCounts = new Map<string, number>();
    for (const c of myConns) {
      if (c.receiverId === viewer.id && c.status === 'Pending') {
        pendingCounts.set(c.partnerRequestId, (pendingCounts.get(c.partnerRequestId) || 0) + 1);
      }
    }

    const items: PartnerRequestDTO[] = myRequests.map((r) => ({
      id: r.id,
      creator: viewer,
      title: r.title,
      category: r.category,
      activity: r.activity,
      description: r.description,
      skillLevel: r.skillLevel,
      availability: r.availability,
      frequency: r.frequency,
      college: r.college,
      peopleNeeded: r.peopleNeeded,
      status: r.status,
      createdAt: r.createdAt,
      pendingInterestedCount: pendingCounts.get(r.id) || 0,
    }));

    res.json({ requests: items });
  } catch (err) {
    console.error('[List My Requests Error]', err);
    res.status(500).json({ error: 'Unable to load your requests.' });
  }
});

// Single request detail
requestsRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Invalid request ID.' });
      return;
    }

    const record = await db.findPartnerRequestById(id);
    if (!record) {
      res.status(404).json({ error: 'Partner request not found.' });
      return;
    }

    const creatorRecord = await db.findUserById(record.creatorId);
    if (!creatorRecord) {
      res.status(404).json({ error: 'Request creator not found.' });
      return;
    }

    const creator = toPublicUser(creatorRecord, false);
    const viewer = req.currentUser ? toPublicUser(req.currentUser, false) : null;

    let connectionStatus: PartnerRequestDTO['connectionStatus'] = null;
    let connectionId: string | null = null;

    if (viewer && viewer.id !== creator.id) {
      const existingConn = await db.findConnectionBySenderAndRequest(viewer.id, record.id);
      if (existingConn) {
        connectionStatus = existingConn.status;
        connectionId = existingConn.id;
      }
    }

    const compatibility =
      viewer && viewer.id !== creator.id
        ? calculateRequestCompatibility(viewer, creator, record)
        : null;

    const dto: PartnerRequestDTO = {
      id: record.id,
      creator,
      title: record.title,
      category: record.category,
      activity: record.activity,
      description: record.description,
      skillLevel: record.skillLevel,
      availability: record.availability,
      frequency: record.frequency,
      college: record.college,
      peopleNeeded: record.peopleNeeded,
      status: record.status,
      createdAt: record.createdAt,
      compatibility,
      connectionStatus,
      connectionId,
    };

    res.json({ request: dto });
  } catch (err) {
    console.error('[Get Request Detail Error]', err);
    res.status(500).json({ error: 'Unable to load request details.' });
  }
});

// Create a new partner request
requestsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const creator = req.currentUser!;
    const title = asTrimmedString(req.body?.title, 120);
    const category = req.body?.category;
    const activity = asTrimmedString(req.body?.activity, 80);
    const description = asTrimmedString(req.body?.description, 1200);
    const skillLevel = req.body?.skillLevel;
    const availability = asTrimmedString(req.body?.availability, 80);
    const frequency = req.body?.frequency;
    const college = asTrimmedString(req.body?.college, 120) || creator.college;
    const peopleNeededRaw = Number(req.body?.peopleNeeded ?? 1);
    const peopleNeeded = Number.isFinite(peopleNeededRaw)
      ? Math.min(12, Math.max(1, Math.round(peopleNeededRaw)))
      : 1;

    if (title.length < 4) {
      res.status(400).json({ error: 'Request title must be at least 4 characters.' });
      return;
    }
    if (!isValidCategory(category)) {
      res.status(400).json({ error: 'Please select a valid category.' });
      return;
    }
    if (activity.length < 2) {
      res.status(400).json({ error: 'Please specify an activity.' });
      return;
    }
    if (description.length < 10) {
      res.status(400).json({ error: 'Description must be at least 10 characters.' });
      return;
    }
    if (!isValidSkillLevel(skillLevel)) {
      res.status(400).json({ error: 'Please select a valid skill level.' });
      return;
    }
    if (availability.length < 2) {
      res.status(400).json({ error: 'Please specify your availability.' });
      return;
    }
    if (!isValidFrequency(frequency)) {
      res.status(400).json({ error: 'Please select a valid frequency.' });
      return;
    }
    if (college.length < 2) {
      res.status(400).json({ error: 'Please enter a college name.' });
      return;
    }

    const created = await db.createPartnerRequest({
      creatorId: creator.id,
      title,
      category,
      activity,
      description,
      skillLevel,
      availability,
      frequency,
      college,
      peopleNeeded,
      status: 'Active',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      request: {
        ...created,
        creator: toPublicUser(creator, false),
      },
    });
  } catch (err) {
    console.error('[Create Request Error]', err);
    res.status(500).json({ error: 'Unable to create partner request.' });
  }
});

// Edit an existing partner request (owner only)
requestsRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Invalid request ID.' });
      return;
    }

    const existing = await db.findPartnerRequestById(id);
    if (!existing) {
      res.status(404).json({ error: 'Partner request not found.' });
      return;
    }

    if (existing.creatorId !== req.currentUser!.id) {
      res.status(403).json({ error: 'You can only edit your own requests.' });
      return;
    }

    const title = asTrimmedString(req.body?.title, 120);
    const category = req.body?.category;
    const activity = asTrimmedString(req.body?.activity, 80);
    const description = asTrimmedString(req.body?.description, 1200);
    const skillLevel = req.body?.skillLevel;
    const availability = asTrimmedString(req.body?.availability, 80);
    const frequency = req.body?.frequency;
    const college = asTrimmedString(req.body?.college, 120);
    const peopleNeededRaw = Number(req.body?.peopleNeeded ?? existing.peopleNeeded);
    const peopleNeeded = Number.isFinite(peopleNeededRaw)
      ? Math.min(12, Math.max(1, Math.round(peopleNeededRaw)))
      : existing.peopleNeeded;
    const status = isValidRequestStatus(req.body?.status) ? req.body.status : existing.status;

    if (title.length < 4) {
      res.status(400).json({ error: 'Request title must be at least 4 characters.' });
      return;
    }
    if (!isValidCategory(category)) {
      res.status(400).json({ error: 'Please select a valid category.' });
      return;
    }
    if (activity.length < 2) {
      res.status(400).json({ error: 'Please specify an activity.' });
      return;
    }
    if (description.length < 10) {
      res.status(400).json({ error: 'Description must be at least 10 characters.' });
      return;
    }
    if (!isValidSkillLevel(skillLevel)) {
      res.status(400).json({ error: 'Please select a valid skill level.' });
      return;
    }
    if (availability.length < 2) {
      res.status(400).json({ error: 'Please specify your availability.' });
      return;
    }
    if (!isValidFrequency(frequency)) {
      res.status(400).json({ error: 'Please select a valid frequency.' });
      return;
    }
    if (college.length < 2) {
      res.status(400).json({ error: 'Please enter a college name.' });
      return;
    }

    const updated = await db.updatePartnerRequest(id, {
      title,
      category,
      activity,
      description,
      skillLevel,
      availability,
      frequency,
      college,
      peopleNeeded,
      status,
    });

    if (!updated) {
      res.status(404).json({ error: 'Partner request not found.' });
      return;
    }

    res.json({
      request: {
        ...updated,
        creator: toPublicUser(req.currentUser!, false),
      },
    });
  } catch (err) {
    console.error('[Update Request Error]', err);
    res.status(500).json({ error: 'Unable to update partner request.' });
  }
});

// Update request status (Active / Filled / Closed) - owner only
requestsRouter.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Invalid request ID.' });
      return;
    }

    const existing = await db.findPartnerRequestById(id);
    if (!existing) {
      res.status(404).json({ error: 'Partner request not found.' });
      return;
    }
    if (existing.creatorId !== req.currentUser!.id) {
      res.status(403).json({ error: 'You can only update your own requests.' });
      return;
    }

    const status = req.body?.status;
    if (!isValidRequestStatus(status)) {
      res.status(400).json({ error: 'Invalid status. Must be Active, Filled, or Closed.' });
      return;
    }

    const updated = await db.updatePartnerRequest(id, { status });
    if (!updated) {
      res.status(404).json({ error: 'Partner request not found.' });
      return;
    }
    res.json({ request: updated });
  } catch (err) {
    console.error('[Update Request Status Error]', err);
    res.status(500).json({ error: 'Unable to update request status.' });
  }
});

// Delete a request (owner only)
requestsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Invalid request ID.' });
      return;
    }

    const existing = await db.findPartnerRequestById(id);
    if (!existing) {
      res.status(404).json({ error: 'Partner request not found.' });
      return;
    }
    if (existing.creatorId !== req.currentUser!.id) {
      res.status(403).json({ error: 'You can only delete your own requests.' });
      return;
    }

    await db.deletePartnerRequest(id);
    res.json({ message: 'Partner request deleted.' });
  } catch (err) {
    console.error('[Delete Request Error]', err);
    res.status(500).json({ error: 'Unable to delete partner request.' });
  }
});
