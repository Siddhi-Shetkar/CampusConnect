import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.ts';
import { PartnerRequestModel } from '../models/PartnerRequest.ts';
import { ConnectionRequestModel } from '../models/ConnectionRequest.ts';
import { ConversationModel } from '../models/Conversation.ts';
import { MessageModel } from '../models/Message.ts';
import { NotificationModel } from '../models/Notification.ts';
import { PushSubscriptionModel } from '../models/PushSubscription.ts';
import type {
  ActivityCategory,
  ConnectionStatus,
  NotificationType,
  RequestFrequency,
  RequestStatus,
  SkillLevel,
} from '../../src/types/campus.ts';
import { escapeRegex, type StoredUserRecord } from '../utils/validation.ts';

export interface StoredPartnerRequestRecord {
  id: string;
  creatorId: string;
  title: string;
  category: ActivityCategory;
  activity: string;
  description: string;
  skillLevel: SkillLevel;
  availability: string;
  frequency: RequestFrequency;
  college: string;
  peopleNeeded: number;
  status: RequestStatus;
  createdAt: string;
}

export interface StoredConnectionRequestRecord {
  id: string;
  senderId: string;
  receiverId: string;
  partnerRequestId: string;
  message: string;
  status: ConnectionStatus;
  createdAt: string;
}

export interface StoredConversationRecord {
  id: string;
  participants: [string, string];
  participantKey: string;
  connectionRequestId: string | null;
  lastMessageText: string;
  lastMessageSenderId: string | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface StoredMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  readAt: string | null;
  createdAt: string;
}

export interface StoredNotificationRecord {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface StoredPushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: string;
}

interface LocalStoreFile {
  users: StoredUserRecord[];
  partnerRequests: StoredPartnerRequestRecord[];
  connectionRequests: StoredConnectionRequestRecord[];
  conversations: StoredConversationRecord[];
  messages: StoredMessageRecord[];
  notifications: StoredNotificationRecord[];
  pushSubscriptions: StoredPushSubscriptionRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'campusconnect-store.json');

let mode: 'mongodb' | 'local' = 'local';
let isListenersAttached = false;

let localData: LocalStoreFile = {
  users: [],
  partnerRequests: [],
  connectionRequests: [],
  conversations: [],
  messages: [],
  notifications: [],
  pushSubscriptions: [],
};

function generateObjectId(): string {
  return crypto.randomBytes(12).toString('hex');
}

export function buildParticipantKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

function saveLocalData(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = path.join(
      DATA_DIR,
      `store.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
    );
    fs.writeFileSync(tempFile, JSON.stringify(localData, null, 2), 'utf-8');
    try {
      fs.renameSync(tempFile, DATA_FILE);
    } catch {
      // Fallback for Windows transient file locks
      fs.copyFileSync(tempFile, DATA_FILE);
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore temp cleanup error
      }
    }
  } catch (err) {
    console.error('[CampusConnect DB] Failed to persist local store:', err);
  }
}

function loadLocalData(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      if (!raw.trim()) {
        console.warn('[CampusConnect DB] Local store file is empty; starting fresh.');
        return;
      }
      const parsed = JSON.parse(raw) as Partial<LocalStoreFile>;
      localData = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        partnerRequests: Array.isArray(parsed.partnerRequests) ? parsed.partnerRequests : [],
        connectionRequests: Array.isArray(parsed.connectionRequests) ? parsed.connectionRequests : [],
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        pushSubscriptions: Array.isArray(parsed.pushSubscriptions) ? parsed.pushSubscriptions : [],
      };
    }
  } catch (err) {
    console.warn('[CampusConnect DB] Error reading local store file; keeping current in-memory state:', err);
  }
}

function toIdString(val: unknown): string {
  if (typeof val === 'object' && val !== null && '_id' in val) {
    return String((val as Record<string, unknown>)._id);
  }
  return val ? String(val) : '';
}

function mapMongoUser(doc: Record<string, unknown>): StoredUserRecord {
  return {
    id: String(doc._id || ''),
    name: String(doc.name || ''),
    email: String(doc.email || ''),
    password: typeof doc.password === 'string' ? doc.password : null,
    college: String(doc.college || ''),
    year: String(doc.year || ''),
    bio: String(doc.bio || ''),
    profileImage: String(doc.profileImage || ''),
    skills: Array.isArray(doc.skills) ? doc.skills.map(String) : [],
    interests: Array.isArray(doc.interests) ? doc.interests.map(String) : [],
    preferredActivities: Array.isArray(doc.preferredActivities)
      ? doc.preferredActivities.map(String)
      : [],
    availability: String(doc.availability || ''),
    skillLevel: (doc.skillLevel as SkillLevel) || 'Intermediate',
    isCommunityProfile: Boolean(doc.isCommunityProfile),
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
  };
}

function mapMongoPartnerRequest(doc: Record<string, unknown>): StoredPartnerRequestRecord {
  return {
    id: String(doc._id || ''),
    creatorId: toIdString(doc.creator),
    title: String(doc.title || ''),
    category: doc.category as ActivityCategory,
    activity: String(doc.activity || ''),
    description: String(doc.description || ''),
    skillLevel: doc.skillLevel as SkillLevel,
    availability: String(doc.availability || ''),
    frequency: doc.frequency as RequestFrequency,
    college: String(doc.college || ''),
    peopleNeeded: Number(doc.peopleNeeded || 1),
    status: (doc.status as RequestStatus) || 'Active',
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
  };
}

function mapMongoConnection(doc: Record<string, unknown>): StoredConnectionRequestRecord {
  return {
    id: String(doc._id || ''),
    senderId: toIdString(doc.sender),
    receiverId: toIdString(doc.receiver),
    partnerRequestId: toIdString(doc.partnerRequest),
    message: String(doc.message || ''),
    status: (doc.status as ConnectionStatus) || 'Pending',
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
  };
}

function mapMongoConversation(doc: Record<string, unknown>): StoredConversationRecord {
  const parts = Array.isArray(doc.participants)
    ? doc.participants.map((p) => toIdString(p))
    : ['', ''];
  const connReq = doc.connectionRequest ? toIdString(doc.connectionRequest) : null;
  const lastSender = doc.lastMessageSender ? toIdString(doc.lastMessageSender) : null;
  return {
    id: String(doc._id || ''),
    participants: [parts[0] || '', parts[1] || ''],
    participantKey: String(doc.participantKey || ''),
    connectionRequestId: connReq || null,
    lastMessageText: String(doc.lastMessageText || ''),
    lastMessageSenderId: lastSender || null,
    lastMessageAt: doc.lastMessageAt
      ? new Date(doc.lastMessageAt as string | Date).toISOString()
      : new Date().toISOString(),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
  };
}

function mapMongoMessage(doc: Record<string, unknown>): StoredMessageRecord {
  return {
    id: String(doc._id || ''),
    conversationId: toIdString(doc.conversation),
    senderId: toIdString(doc.sender),
    recipientId: toIdString(doc.recipient),
    text: String(doc.text || ''),
    readAt: doc.readAt ? new Date(doc.readAt as string | Date).toISOString() : null,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
  };
}

function mapMongoNotification(doc: Record<string, unknown>): StoredNotificationRecord {
  const actor = doc.actor ? toIdString(doc.actor) : null;
  return {
    id: String(doc._id || ''),
    recipientId: toIdString(doc.recipient),
    actorId: actor || null,
    type: doc.type as NotificationType,
    title: String(doc.title || ''),
    body: String(doc.body || ''),
    link: String(doc.link || '/dashboard'),
    read: Boolean(doc.read),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
  };
}

function mapMongoPushSub(doc: Record<string, unknown>): StoredPushSubscriptionRecord {
  const keys = (doc.keys as Record<string, unknown>) || {};
  return {
    id: String(doc._id || ''),
    userId: toIdString(doc.user),
    endpoint: String(doc.endpoint || ''),
    keys: {
      p256dh: String(keys.p256dh || ''),
      auth: String(keys.auth || ''),
    },
    userAgent: String(doc.userAgent || ''),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Purges any previously seeded dummy/community profiles so only real registered
 * user records exist in the database. Safely wrapped to avoid crashing startup.
 */
async function purgeLegacyDummyData(): Promise<void> {
  try {
    if (mode === 'mongodb') {
      const dummyUsers = await UserModel.find({ isCommunityProfile: true }).select('_id').lean();
      if (dummyUsers.length > 0) {
        const ids = dummyUsers.map((u: unknown) => (u as Record<string, unknown>)._id);
        await PartnerRequestModel.deleteMany({ creator: { $in: ids } });
        await ConnectionRequestModel.deleteMany({
          $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }],
        });
        await UserModel.deleteMany({ _id: { $in: ids } });
      }
      return;
    }

    const dummyIds = new Set(
      localData.users.filter((u) => u.isCommunityProfile).map((u) => u.id)
    );
    if (dummyIds.size > 0) {
      localData.users = localData.users.filter((u) => !dummyIds.has(u.id));
      localData.partnerRequests = localData.partnerRequests.filter(
        (r) => !dummyIds.has(r.creatorId)
      );
      localData.connectionRequests = localData.connectionRequests.filter(
        (c) => !dummyIds.has(c.senderId) && !dummyIds.has(c.receiverId)
      );
      saveLocalData();
    }
  } catch (err) {
    console.warn('[CampusConnect DB] Non-critical: legacy dummy data check skipped:', err);
  }
}

export async function initializeDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI?.trim();

  // Attach connection lifecycle events once
  if (!isListenersAttached) {
    mongoose.connection.on('error', (err) => {
      console.error('[CampusConnect DB] MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[CampusConnect DB] MongoDB disconnected.');
    });
    isListenersAttached = true;
  }

  // Reuse existing active connection if already established
  if (mongoose.connection.readyState === 1) {
    mode = 'mongodb';
    console.log('[CampusConnect DB] Reusing existing MongoDB connection.');
    await purgeLegacyDummyData();
    return;
  }

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      mode = 'mongodb';
      console.log('[CampusConnect DB] Connected to MongoDB.');
    } catch (err) {
      console.error(
        '[CampusConnect DB] Failed to connect to MONGODB_URI; falling back to local persistent store.',
        err instanceof Error ? err.message : err
      );
      mode = 'local';
      loadLocalData();
    }
  } else {
    mode = 'local';
    loadLocalData();
    console.log(
      '[CampusConnect DB] MONGODB_URI not set. Using local persistent store (.data/campusconnect-store.json).'
    );
  }

  await purgeLegacyDummyData();
}

export async function closeDatabase(): Promise<void> {
  if (mode === 'mongodb' && mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('[CampusConnect DB] MongoDB connection cleanly closed.');
    } catch (err) {
      console.error('[CampusConnect DB] Error while closing MongoDB connection:', err);
    }
  }
}

export function getDatabaseMode(): 'mongodb' | 'local' {
  return mode;
}

export function isDatabaseConnected(): boolean {
  if (mode === 'mongodb') {
    return mongoose.connection.readyState === 1;
  }
  return true;
}

export interface RequestFilterParams {
  category?: string;
  activity?: string;
  college?: string;
  skillLevel?: string;
  availability?: string;
  status?: RequestStatus | 'All';
}

export const db = {
  // ---- USERS ----
  async findUserByEmail(email: string): Promise<StoredUserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (mode === 'mongodb') {
      const doc = await UserModel.findOne({ email: cleanEmail }).select('+password').lean();
      return doc ? mapMongoUser(doc as Record<string, unknown>) : null;
    }
    const user = localData.users.find((u) => u.email.toLowerCase() === cleanEmail);
    return user ? { ...user } : null;
  },

  async findUserById(id: string): Promise<StoredUserRecord | null> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await UserModel.findById(id).lean();
      return doc ? mapMongoUser(doc as Record<string, unknown>) : null;
    }
    const user = localData.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  },

  async findUsersByIds(ids: string[]): Promise<Map<string, StoredUserRecord>> {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    const map = new Map<string, StoredUserRecord>();
    if (unique.length === 0) return map;

    if (mode === 'mongodb') {
      const validIds = unique.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) return map;
      const docs = await UserModel.find({ _id: { $in: validIds } }).lean();
      for (const doc of docs) {
        const mapped = mapMongoUser(doc as Record<string, unknown>);
        map.set(mapped.id, mapped);
      }
      return map;
    }

    const idSet = new Set(unique);
    for (const user of localData.users) {
      if (idSet.has(user.id)) {
        map.set(user.id, { ...user });
      }
    }
    return map;
  },

  async listAllUsers(): Promise<StoredUserRecord[]> {
    if (mode === 'mongodb') {
      const docs = await UserModel.find({ isCommunityProfile: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      return docs.map((d: unknown) => mapMongoUser(d as Record<string, unknown>));
    }
    return localData.users
      .filter((u) => !u.isCommunityProfile)
      .map((u) => ({ ...u }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createUser(input: Omit<StoredUserRecord, 'id'>): Promise<StoredUserRecord> {
    if (mode === 'mongodb') {
      const doc = await UserModel.create({
        name: input.name,
        email: input.email.toLowerCase(),
        password: input.password,
        college: input.college,
        year: input.year,
        bio: input.bio,
        profileImage: input.profileImage,
        skills: input.skills,
        interests: input.interests,
        preferredActivities: input.preferredActivities,
        availability: input.availability,
        skillLevel: input.skillLevel,
        isCommunityProfile: false,
      });
      return mapMongoUser(doc.toObject() as unknown as Record<string, unknown>);
    }

    const record: StoredUserRecord = {
      ...input,
      id: generateObjectId(),
      email: input.email.toLowerCase(),
      isCommunityProfile: false,
      createdAt: input.createdAt || new Date().toISOString(),
    };
    localData.users.push(record);
    saveLocalData();
    return { ...record };
  },

  async updateUser(
    id: string,
    updates: Partial<
      Pick<
        StoredUserRecord,
        | 'name'
        | 'college'
        | 'year'
        | 'bio'
        | 'profileImage'
        | 'skills'
        | 'interests'
        | 'preferredActivities'
        | 'availability'
        | 'skillLevel'
      >
    >
  ): Promise<StoredUserRecord | null> {
    // Sanitize updates to omit undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { $set: cleanUpdates },
        { new: true, runValidators: true }
      ).lean();
      return doc ? mapMongoUser(doc as Record<string, unknown>) : null;
    }

    const idx = localData.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    localData.users[idx] = { ...localData.users[idx], ...cleanUpdates };
    saveLocalData();
    return { ...localData.users[idx] };
  },

  // ---- PARTNER REQUESTS ----
  async createPartnerRequest(
    input: Omit<StoredPartnerRequestRecord, 'id'>
  ): Promise<StoredPartnerRequestRecord> {
    if (mode === 'mongodb') {
      const doc = await PartnerRequestModel.create({
        creator: input.creatorId,
        title: input.title,
        category: input.category,
        activity: input.activity,
        description: input.description,
        skillLevel: input.skillLevel,
        availability: input.availability,
        frequency: input.frequency,
        college: input.college,
        peopleNeeded: input.peopleNeeded,
        status: input.status,
      });
      return mapMongoPartnerRequest(doc.toObject() as unknown as Record<string, unknown>);
    }

    const record: StoredPartnerRequestRecord = {
      ...input,
      id: generateObjectId(),
      createdAt: input.createdAt || new Date().toISOString(),
    };
    localData.partnerRequests.push(record);
    saveLocalData();
    return { ...record };
  },

  async findPartnerRequestById(id: string): Promise<StoredPartnerRequestRecord | null> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await PartnerRequestModel.findById(id).lean();
      return doc ? mapMongoPartnerRequest(doc as Record<string, unknown>) : null;
    }
    const found = localData.partnerRequests.find((r) => r.id === id);
    return found ? { ...found } : null;
  },

  async listPartnerRequests(filters: RequestFilterParams = {}): Promise<StoredPartnerRequestRecord[]> {
    if (mode === 'mongodb') {
      const query: Record<string, unknown> = {};
      if (filters.status && filters.status !== 'All') {
        query.status = filters.status;
      }
      if (filters.category && filters.category !== 'All') {
        query.category = filters.category;
      }
      if (filters.activity && filters.activity !== 'All') {
        query.activity = new RegExp(escapeRegex(filters.activity.trim()), 'i');
      }
      if (filters.college && filters.college !== 'All') {
        query.college = new RegExp(`^${escapeRegex(filters.college.trim())}$`, 'i');
      }
      if (filters.skillLevel && filters.skillLevel !== 'All') {
        query.skillLevel = filters.skillLevel;
      }
      if (filters.availability && filters.availability !== 'All') {
        query.availability = new RegExp(escapeRegex(filters.availability.trim()), 'i');
      }
      const docs = await PartnerRequestModel.find(query).sort({ createdAt: -1 }).lean();
      return docs.map((d: unknown) => mapMongoPartnerRequest(d as Record<string, unknown>));
    }

    return localData.partnerRequests
      .filter((r) => {
        if (filters.status && filters.status !== 'All' && r.status !== filters.status) return false;
        if (filters.category && filters.category !== 'All' && r.category !== filters.category) return false;
        if (
          filters.activity &&
          filters.activity !== 'All' &&
          !(r.activity || '').toLowerCase().includes(filters.activity.trim().toLowerCase())
        ) {
          return false;
        }
        if (
          filters.college &&
          filters.college !== 'All' &&
          (r.college || '').trim().toLowerCase() !== filters.college.trim().toLowerCase()
        ) {
          return false;
        }
        if (filters.skillLevel && filters.skillLevel !== 'All' && r.skillLevel !== filters.skillLevel) {
          return false;
        }
        if (
          filters.availability &&
          filters.availability !== 'All' &&
          !(r.availability || '').toLowerCase().includes(filters.availability.trim().toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .map((r) => ({ ...r }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listPartnerRequestsByCreator(creatorId: string): Promise<StoredPartnerRequestRecord[]> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(creatorId)) return [];
      const docs = await PartnerRequestModel.find({ creator: creatorId })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((d: unknown) => mapMongoPartnerRequest(d as Record<string, unknown>));
    }
    return localData.partnerRequests
      .filter((r) => r.creatorId === creatorId)
      .map((r) => ({ ...r }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async updatePartnerRequest(
    id: string,
    updates: Partial<
      Pick<
        StoredPartnerRequestRecord,
        | 'title'
        | 'category'
        | 'activity'
        | 'description'
        | 'skillLevel'
        | 'availability'
        | 'frequency'
        | 'college'
        | 'peopleNeeded'
        | 'status'
      >
    >
  ): Promise<StoredPartnerRequestRecord | null> {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await PartnerRequestModel.findByIdAndUpdate(
        id,
        { $set: cleanUpdates },
        { new: true, runValidators: true }
      ).lean();
      return doc ? mapMongoPartnerRequest(doc as Record<string, unknown>) : null;
    }

    const idx = localData.partnerRequests.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    localData.partnerRequests[idx] = { ...localData.partnerRequests[idx], ...cleanUpdates };
    saveLocalData();
    return { ...localData.partnerRequests[idx] };
  },

  async deletePartnerRequest(id: string): Promise<boolean> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return false;
      const res = await PartnerRequestModel.findByIdAndDelete(id);
      if (res) {
        await ConnectionRequestModel.deleteMany({ partnerRequest: id });
        return true;
      }
      return false;
    }

    const before = localData.partnerRequests.length;
    localData.partnerRequests = localData.partnerRequests.filter((r) => r.id !== id);
    if (localData.partnerRequests.length < before) {
      localData.connectionRequests = localData.connectionRequests.filter(
        (c) => c.partnerRequestId !== id
      );
      saveLocalData();
      return true;
    }
    return false;
  },

  // ---- CONNECTION REQUESTS ----
  async findConnectionBySenderAndRequest(
    senderId: string,
    partnerRequestId: string
  ): Promise<StoredConnectionRequestRecord | null> {
    if (mode === 'mongodb') {
      if (
        !mongoose.Types.ObjectId.isValid(senderId) ||
        !mongoose.Types.ObjectId.isValid(partnerRequestId)
      ) {
        return null;
      }
      const doc = await ConnectionRequestModel.findOne({
        sender: senderId,
        partnerRequest: partnerRequestId,
      }).lean();
      return doc ? mapMongoConnection(doc as Record<string, unknown>) : null;
    }
    const found = localData.connectionRequests.find(
      (c) => c.senderId === senderId && c.partnerRequestId === partnerRequestId
    );
    return found ? { ...found } : null;
  },

  async findConnectionById(id: string): Promise<StoredConnectionRequestRecord | null> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await ConnectionRequestModel.findById(id).lean();
      return doc ? mapMongoConnection(doc as Record<string, unknown>) : null;
    }
    const found = localData.connectionRequests.find((c) => c.id === id);
    return found ? { ...found } : null;
  },

  async findAcceptedConnectionBetween(
    userA: string,
    userB: string
  ): Promise<StoredConnectionRequestRecord | null> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(userA) || !mongoose.Types.ObjectId.isValid(userB)) {
        return null;
      }
      const doc = await ConnectionRequestModel.findOne({
        status: 'Accepted',
        $or: [
          { sender: userA, receiver: userB },
          { sender: userB, receiver: userA },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();
      return doc ? mapMongoConnection(doc as Record<string, unknown>) : null;
    }
    const found = localData.connectionRequests.find(
      (c) =>
        c.status === 'Accepted' &&
        ((c.senderId === userA && c.receiverId === userB) ||
          (c.senderId === userB && c.receiverId === userA))
    );
    return found ? { ...found } : null;
  },

  async areUsersConnected(userA: string, userB: string): Promise<boolean> {
    const conn = await this.findAcceptedConnectionBetween(userA, userB);
    return Boolean(conn);
  },

  async createConnectionRequest(
    input: Omit<StoredConnectionRequestRecord, 'id'>
  ): Promise<StoredConnectionRequestRecord> {
    if (mode === 'mongodb') {
      const doc = await ConnectionRequestModel.create({
        sender: input.senderId,
        receiver: input.receiverId,
        partnerRequest: input.partnerRequestId,
        message: input.message,
        status: input.status,
      });
      return mapMongoConnection(doc.toObject() as unknown as Record<string, unknown>);
    }

    const record: StoredConnectionRequestRecord = {
      ...input,
      id: generateObjectId(),
      createdAt: input.createdAt || new Date().toISOString(),
    };
    localData.connectionRequests.push(record);
    saveLocalData();
    return { ...record };
  },

  async updateConnectionStatus(
    id: string,
    status: ConnectionStatus
  ): Promise<StoredConnectionRequestRecord | null> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await ConnectionRequestModel.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true, runValidators: true }
      ).lean();
      return doc ? mapMongoConnection(doc as Record<string, unknown>) : null;
    }

    const idx = localData.connectionRequests.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    localData.connectionRequests[idx] = { ...localData.connectionRequests[idx], status };
    saveLocalData();
    return { ...localData.connectionRequests[idx] };
  },

  async listConnectionsForUser(userId: string): Promise<StoredConnectionRequestRecord[]> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(userId)) return [];
      const docs = await ConnectionRequestModel.find({
        $or: [{ sender: userId }, { receiver: userId }],
      })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((d: unknown) => mapMongoConnection(d as Record<string, unknown>));
    }
    return localData.connectionRequests
      .filter((c) => c.senderId === userId || c.receiverId === userId)
      .map((c) => ({ ...c }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listConnectionsForPartnerRequest(
    partnerRequestId: string
  ): Promise<StoredConnectionRequestRecord[]> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(partnerRequestId)) return [];
      const docs = await ConnectionRequestModel.find({ partnerRequest: partnerRequestId })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((d: unknown) => mapMongoConnection(d as Record<string, unknown>));
    }
    return localData.connectionRequests
      .filter((c) => c.partnerRequestId === partnerRequestId)
      .map((c) => ({ ...c }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // ---- CONVERSATIONS & MESSAGES ----
  async findOrCreateConversation(
    userA: string,
    userB: string,
    connectionRequestId: string | null = null
  ): Promise<StoredConversationRecord> {
    const sorted = [userA, userB].sort() as [string, string];
    const key = buildParticipantKey(userA, userB);

    if (mode === 'mongodb') {
      const existing = await ConversationModel.findOne({ participantKey: key }).lean();
      if (existing) {
        return mapMongoConversation(existing as Record<string, unknown>);
      }

      const validConnReqId =
        connectionRequestId && mongoose.Types.ObjectId.isValid(connectionRequestId)
          ? connectionRequestId
          : null;

      try {
        const created = await ConversationModel.create({
          participants: sorted,
          participantKey: key,
          connectionRequest: validConnReqId,
          lastMessageText: '',
          lastMessageSender: null,
          lastMessageAt: new Date(),
        });
        return mapMongoConversation(created.toObject() as unknown as Record<string, unknown>);
      } catch (err: unknown) {
        // Handle race condition duplicate key errors (code 11000) gracefully
        if (
          typeof err === 'object' &&
          err !== null &&
          (err as { code?: number }).code === 11000
        ) {
          const secondCheck = await ConversationModel.findOne({ participantKey: key }).lean();
          if (secondCheck) {
            return mapMongoConversation(secondCheck as Record<string, unknown>);
          }
        }
        throw err;
      }
    }

    const existing = localData.conversations.find((c) => c.participantKey === key);
    if (existing) return { ...existing };

    const now = new Date().toISOString();
    const record: StoredConversationRecord = {
      id: generateObjectId(),
      participants: sorted,
      participantKey: key,
      connectionRequestId: connectionRequestId || null,
      lastMessageText: '',
      lastMessageSenderId: null,
      lastMessageAt: now,
      createdAt: now,
    };
    localData.conversations.push(record);
    saveLocalData();
    return { ...record };
  },

  async findConversationById(id: string): Promise<StoredConversationRecord | null> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await ConversationModel.findById(id).lean();
      return doc ? mapMongoConversation(doc as Record<string, unknown>) : null;
    }
    const found = localData.conversations.find((c) => c.id === id);
    return found ? { ...found } : null;
  },

  async listConversationsForUser(userId: string): Promise<StoredConversationRecord[]> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(userId)) return [];
      const docs = await ConversationModel.find({ participants: userId })
        .sort({ lastMessageAt: -1 })
        .lean();
      return docs.map((d: unknown) => mapMongoConversation(d as Record<string, unknown>));
    }
    return localData.conversations
      .filter((c) => c.participants.includes(userId))
      .map((c) => ({ ...c }))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  async createMessage(input: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    text: string;
  }): Promise<StoredMessageRecord> {
    const preview = input.text.slice(0, 160);
    if (mode === 'mongodb') {
      if (
        !mongoose.Types.ObjectId.isValid(input.conversationId) ||
        !mongoose.Types.ObjectId.isValid(input.senderId) ||
        !mongoose.Types.ObjectId.isValid(input.recipientId)
      ) {
        throw new Error('Invalid IDs provided for message creation.');
      }

      const doc = await MessageModel.create({
        conversation: input.conversationId,
        sender: input.senderId,
        recipient: input.recipientId,
        text: input.text,
        readAt: null,
      });

      const messageCreatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date();

      await ConversationModel.findByIdAndUpdate(input.conversationId, {
        $set: {
          lastMessageText: preview,
          lastMessageSender: input.senderId,
          lastMessageAt: messageCreatedAt,
        },
      });
      return mapMongoMessage(doc.toObject() as unknown as Record<string, unknown>);
    }

    const now = new Date().toISOString();
    const record: StoredMessageRecord = {
      id: generateObjectId(),
      conversationId: input.conversationId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      text: input.text,
      readAt: null,
      createdAt: now,
    };
    localData.messages.push(record);
    const convIdx = localData.conversations.findIndex((c) => c.id === input.conversationId);
    if (convIdx !== -1) {
      localData.conversations[convIdx] = {
        ...localData.conversations[convIdx],
        lastMessageText: preview,
        lastMessageSenderId: input.senderId,
        lastMessageAt: now,
      };
    }
    saveLocalData();
    return { ...record };
  },

  async listMessagesForConversation(conversationId: string): Promise<StoredMessageRecord[]> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) return [];
      const docs = await MessageModel.find({ conversation: conversationId })
        .sort({ createdAt: 1 })
        .limit(500)
        .lean();
      return docs.map((d: unknown) => mapMongoMessage(d as Record<string, unknown>));
    }
    return localData.messages
      .filter((m) => m.conversationId === conversationId)
      .map((m) => ({ ...m }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async markConversationMessagesRead(
    conversationId: string,
    recipientId: string
  ): Promise<{ readIds: string[]; readAt: string }> {
    const readAt = new Date().toISOString();
    if (mode === 'mongodb') {
      if (
        !mongoose.Types.ObjectId.isValid(conversationId) ||
        !mongoose.Types.ObjectId.isValid(recipientId)
      ) {
        return { readIds: [], readAt };
      }
      const unread = await MessageModel.find({
        conversation: conversationId,
        recipient: recipientId,
        readAt: null,
      })
        .select('_id')
        .lean();

      const readIds = unread.map((d: unknown) => String((d as Record<string, unknown>)._id));
      if (readIds.length > 0) {
        await MessageModel.updateMany(
          { _id: { $in: readIds } },
          { $set: { readAt: new Date(readAt) } }
        );
      }
      return { readIds, readAt };
    }

    const readIds: string[] = [];
    for (const msg of localData.messages) {
      if (
        msg.conversationId === conversationId &&
        msg.recipientId === recipientId &&
        !msg.readAt
      ) {
        msg.readAt = readAt;
        readIds.push(msg.id);
      }
    }
    if (readIds.length > 0) saveLocalData();
    return { readIds, readAt };
  },

  async countUnreadMessagesByConversation(recipientId: string): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) return counts;
      const docs = await MessageModel.find({
        recipient: recipientId,
        readAt: null,
      })
        .select('conversation')
        .lean();
      for (const d of docs) {
        const cid = toIdString((d as Record<string, unknown>).conversation);
        if (cid) {
          counts.set(cid, (counts.get(cid) || 0) + 1);
        }
      }
      return counts;
    }

    for (const m of localData.messages) {
      if (m.recipientId === recipientId && !m.readAt) {
        counts.set(m.conversationId, (counts.get(m.conversationId) || 0) + 1);
      }
    }
    return counts;
  },

  // ---- NOTIFICATIONS ----
  async createNotification(input: {
    recipientId: string;
    actorId: string | null;
    type: NotificationType;
    title: string;
    body: string;
    link: string;
  }): Promise<StoredNotificationRecord> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(input.recipientId)) {
        throw new Error('Invalid recipientId provided for notification.');
      }
      const validActorId =
        input.actorId && mongoose.Types.ObjectId.isValid(input.actorId)
          ? input.actorId
          : null;

      const doc = await NotificationModel.create({
        recipient: input.recipientId,
        actor: validActorId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        read: false,
      });
      return mapMongoNotification(doc.toObject() as unknown as Record<string, unknown>);
    }

    const record: StoredNotificationRecord = {
      id: generateObjectId(),
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      read: false,
      createdAt: new Date().toISOString(),
    };
    localData.notifications.push(record);
    saveLocalData();
    return { ...record };
  },

  async listNotificationsForUser(
    recipientId: string,
    limit = 40
  ): Promise<StoredNotificationRecord[]> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) return [];
      const docs = await NotificationModel.find({ recipient: recipientId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return docs.map((d: unknown) => mapMongoNotification(d as Record<string, unknown>));
    }

    return localData.notifications
      .filter((n) => n.recipientId === recipientId)
      .map((n) => ({ ...n }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },

  async countUnreadNotifications(recipientId: string): Promise<number> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) return 0;
      return NotificationModel.countDocuments({ recipient: recipientId, read: false });
    }
    return localData.notifications.filter((n) => n.recipientId === recipientId && !n.read).length;
  },

  async markNotificationRead(id: string, recipientId: string): Promise<boolean> {
    if (mode === 'mongodb') {
      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(recipientId)
      ) {
        return false;
      }
      const res = await NotificationModel.findOneAndUpdate(
        { _id: id, recipient: recipientId },
        { $set: { read: true } }
      );
      return Boolean(res);
    }
    const target = localData.notifications.find(
      (n) => n.id === id && n.recipientId === recipientId
    );
    if (!target) return false;
    target.read = true;
    saveLocalData();
    return true;
  },

  async markAllNotificationsRead(recipientId: string): Promise<void> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) return;
      await NotificationModel.updateMany(
        { recipient: recipientId, read: false },
        { $set: { read: true } }
      );
      return;
    }
    let changed = false;
    for (const n of localData.notifications) {
      if (n.recipientId === recipientId && !n.read) {
        n.read = true;
        changed = true;
      }
    }
    if (changed) saveLocalData();
  },

  // ---- PUSH SUBSCRIPTIONS ----
  async upsertPushSubscription(input: {
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent: string;
  }): Promise<StoredPushSubscriptionRecord> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(input.userId)) {
        throw new Error('Invalid userId provided for push subscription.');
      }
      const doc = await PushSubscriptionModel.findOneAndUpdate(
        { endpoint: input.endpoint },
        {
          $set: {
            user: input.userId,
            endpoint: input.endpoint,
            keys: input.keys,
            userAgent: input.userAgent,
          },
        },
        { upsert: true, new: true, runValidators: true }
      ).lean();
      return mapMongoPushSub(doc as Record<string, unknown>);
    }

    const idx = localData.pushSubscriptions.findIndex((s) => s.endpoint === input.endpoint);
    if (idx !== -1) {
      localData.pushSubscriptions[idx] = {
        ...localData.pushSubscriptions[idx],
        userId: input.userId,
        keys: input.keys,
        userAgent: input.userAgent,
      };
      saveLocalData();
      return { ...localData.pushSubscriptions[idx] };
    }

    const record: StoredPushSubscriptionRecord = {
      id: generateObjectId(),
      userId: input.userId,
      endpoint: input.endpoint,
      keys: input.keys,
      userAgent: input.userAgent,
      createdAt: new Date().toISOString(),
    };
    localData.pushSubscriptions.push(record);
    saveLocalData();
    return { ...record };
  },

  async listPushSubscriptionsForUser(userId: string): Promise<StoredPushSubscriptionRecord[]> {
    if (mode === 'mongodb') {
      if (!mongoose.Types.ObjectId.isValid(userId)) return [];
      const docs = await PushSubscriptionModel.find({ user: userId }).lean();
      return docs.map((d: unknown) => mapMongoPushSub(d as Record<string, unknown>));
    }
    return localData.pushSubscriptions
      .filter((s) => s.userId === userId)
      .map((s) => ({ ...s }));
  },

  async deletePushSubscriptionByEndpoint(endpoint: string, userId?: string): Promise<void> {
    if (mode === 'mongodb') {
      const filter: Record<string, unknown> = { endpoint };
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user = userId;
      }
      await PushSubscriptionModel.deleteOne(filter);
      return;
    }

    const before = localData.pushSubscriptions.length;
    localData.pushSubscriptions = localData.pushSubscriptions.filter((s) => {
      if (s.endpoint !== endpoint) return true;
      if (userId && s.userId !== userId) return true;
      return false;
    });
    if (localData.pushSubscriptions.length < before) {
      saveLocalData();
    }
  },
};
