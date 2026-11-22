import {
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
  type PublicUser,
  REQUEST_FREQUENCIES,
  type RequestFrequency,
  REQUEST_STATUSES,
  type RequestStatus,
  SKILL_LEVELS,
  type SkillLevel,
} from '../../src/types/campus.ts';

export function asTrimmedString(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160;
}

export function sanitizeStringArray(value: unknown, maxItems = 15, maxItemLen = 50): string[] {
  let rawItems: string[] = [];
  if (Array.isArray(value)) {
    rawItems = value.filter((item): item is string => typeof item === 'string');
  } else if (typeof value === 'string') {
    rawItems = value.split(',');
  }
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of rawItems) {
    const trimmed = item.trim().slice(0, maxItemLen);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(trimmed);
    }
    if (cleaned.length >= maxItems) break;
  }
  return cleaned;
}

export function sanitizeImageUrl(value: unknown): string {
  const url = asTrimmedString(value, 500);
  if (!url) return '';
  // Allow generated local assets strictly within /src/assets/images/
  if (url.startsWith('/src/assets/images/') && !url.includes('..')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

export function isValidCategory(value: unknown): value is ActivityCategory {
  return typeof value === 'string' && (ACTIVITY_CATEGORIES as string[]).includes(value);
}

export function isValidSkillLevel(value: unknown): value is SkillLevel {
  return typeof value === 'string' && (SKILL_LEVELS as string[]).includes(value);
}

export function isValidFrequency(value: unknown): value is RequestFrequency {
  return typeof value === 'string' && (REQUEST_FREQUENCIES as string[]).includes(value);
}

export function isValidRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (REQUEST_STATUSES as string[]).includes(value);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

export interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  password: string | null;
  college: string;
  year: string;
  bio: string;
  profileImage: string;
  skills: string[];
  interests: string[];
  preferredActivities: string[];
  availability: string;
  skillLevel: SkillLevel;
  isCommunityProfile: boolean;
  createdAt: string;
}

export function toPublicUser(user: StoredUserRecord, includeEmail = false): PublicUser {
  const result: PublicUser = {
    id: user.id,
    name: user.name,
    college: user.college,
    year: user.year,
    bio: user.bio || '',
    profileImage: user.profileImage || '',
    skills: Array.isArray(user.skills) ? user.skills : [],
    interests: Array.isArray(user.interests) ? user.interests : [],
    preferredActivities: Array.isArray(user.preferredActivities) ? user.preferredActivities : [],
    availability: user.availability || '',
    skillLevel: user.skillLevel || 'Intermediate',
    createdAt: user.createdAt,
  };
  if (includeEmail) {
    result.email = user.email;
  }
  return result;
}
