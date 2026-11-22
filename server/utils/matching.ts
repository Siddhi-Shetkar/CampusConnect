import type { MatchBreakdown, PublicUser, SkillLevel } from '../../src/types/campus.ts';

interface RequestMatchTarget {
  activity: string;
  category: string;
  skillLevel: SkillLevel;
  availability: string;
  college: string;
}

const SKILL_RANK: Record<SkillLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function tokenize(items: string[]): Set<string> {
  const result = new Set<string>();
  for (const raw of items) {
    const clean = normalize(raw);
    if (!clean) continue;
    result.add(clean);
    for (const part of clean.split(/[\s/,&-]+/)) {
      if (part.length >= 2) {
        result.add(part);
      }
    }
  }
  return result;
}

interface TimeRange {
  startHour: number;
  endHour: number;
}

const MONTH_ABBR = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

export function parseDateISO(input: string): string | null {
  const text = normalize(input);
  if (!text) return null;

  const namedMatch = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i
  );
  if (namedMatch) {
    const monthIdx = MONTH_ABBR.indexOf(namedMatch[1].slice(0, 3).toLowerCase());
    if (monthIdx !== -1) {
      const year = Number(namedMatch[3]);
      const day = Number(namedMatch[2]);
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return null;
}

export function parseTimeRange(input: string): TimeRange | null {
  const text = normalize(input).replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
  if (!text) return null;

  const rangeMatch = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  );

  if (rangeMatch) {
    const startRaw = Number(rangeMatch[1]);
    const startMin = rangeMatch[2] ? Number(rangeMatch[2]) / 60 : 0;
    const endRaw = Number(rangeMatch[4]);
    const endMin = rangeMatch[5] ? Number(rangeMatch[5]) / 60 : 0;
    const endPeriod = (rangeMatch[6] || '').toLowerCase();
    const startPeriod = (rangeMatch[3] || endPeriod).toLowerCase();

    const to24 = (h: number, period: string) => {
      if (period === 'pm' && h < 12) return h + 12;
      if (period === 'am' && h === 12) return 0;
      return h;
    };

    const startHour = to24(startRaw, startPeriod) + startMin;
    let endHour = to24(endRaw, endPeriod || startPeriod) + endMin;
    if (endRaw === 12 && endPeriod === 'am' && startHour > 0) {
      endHour = 24;
    }
    if (endHour > startHour && startHour >= 0 && endHour <= 24) {
      return { startHour, endHour };
    }
  }

  if (text.includes('morning')) return { startHour: 6, endHour: 12 };
  if (text.includes('afternoon')) return { startHour: 12, endHour: 17 };
  if (text.includes('evening')) return { startHour: 17, endHour: 21 };
  if (text.includes('night')) return { startHour: 21, endHour: 24 };
  return null;
}

export function matchesAvailabilityFilter(recordAvailability: string, filterAvailability: string): boolean {
  const filterNorm = normalize(filterAvailability);
  if (!filterNorm || filterNorm === 'all') return true;

  const recordNorm = normalize(recordAvailability);
  if (!recordNorm) return false;

  const filterDate = parseDateISO(filterNorm);
  const recordDate = parseDateISO(recordNorm);

  if (filterDate) {
    if (!recordDate || recordDate !== filterDate) return false;
    const filterRange = parseTimeRange(filterNorm);
    if (!filterRange) return true;
    const recordRange = parseTimeRange(recordNorm);
    if (!recordRange) return false;
    const overlap =
      Math.min(recordRange.endHour, filterRange.endHour) -
      Math.max(recordRange.startHour, filterRange.startHour);
    return overlap > 0;
  }

  if (recordNorm.includes(filterNorm)) return true;

  if (filterNorm.includes('weekend')) {
    return recordNorm.includes('weekend');
  }
  if (filterNorm.includes('flexible')) {
    return recordNorm.includes('flexible');
  }

  const filterRange = parseTimeRange(filterNorm);
  if (!filterRange) return false;

  const recordRange = parseTimeRange(recordNorm);
  if (!recordRange) return false;

  const overlap =
    Math.min(recordRange.endHour, filterRange.endHour) -
    Math.max(recordRange.startHour, filterRange.startHour);
  return overlap > 0;
}

function evaluateAvailabilityOverlap(a: string, b: string): { points: number; label: string | null } {
  const normA = normalize(a);
  const normB = normalize(b);
  if (!normA || !normB) return { points: 0, label: null };

  if (normA === normB) {
    return { points: 20, label: 'Same date & time window' };
  }

  if (normA.includes('flexible') || normB.includes('flexible')) {
    return { points: 14, label: 'Flexible schedule compatibility' };
  }

  const dateA = parseDateISO(normA);
  const dateB = parseDateISO(normB);
  const rangeA = parseTimeRange(normA);
  const rangeB = parseTimeRange(normB);

  if (dateA && dateB && dateA !== dateB) {
    // Different explicit dates: give small partial credit only if time of day aligns
    if (rangeA && rangeB) {
      const overlap =
        Math.min(rangeA.endHour, rangeB.endHour) - Math.max(rangeA.startHour, rangeB.startHour);
      if (overlap >= 1) {
        return { points: 8, label: 'Similar time of day' };
      }
    }
    return { points: 0, label: null };
  }

  if (rangeA && rangeB) {
    const overlap = Math.min(rangeA.endHour, rangeB.endHour) - Math.max(rangeA.startHour, rangeB.startHour);
    if (overlap >= 1) {
      return {
        points: 20,
        label: dateA && dateB && dateA === dateB ? 'Same date & overlapping time' : 'Overlapping schedule',
      };
    }
    if (overlap > 0) {
      return { points: 12, label: 'Partial schedule overlap' };
    }
  }

  if (dateA && dateB && dateA === dateB) {
    return { points: 14, label: 'Same target date' };
  }

  if (normA.includes('weekend') && normB.includes('weekend')) {
    return { points: 18, label: 'Both available on weekends' };
  }

  return { points: 0, label: null };
}

function evaluateSkillCompatibility(levelA: SkillLevel | undefined, levelB: SkillLevel | undefined): {
  points: number;
  label: string | null;
} {
  if (!levelA || !levelB) return { points: 0, label: null };
  const diff = Math.abs(SKILL_RANK[levelA] - SKILL_RANK[levelB]);
  if (diff === 0) return { points: 20, label: `Matching ${levelB.toLowerCase()} level` };
  if (diff === 1) return { points: 10, label: 'Compatible skill level' };
  return { points: 0, label: null };
}

/**
 * Calculates deterministic, rule-based compatibility between a logged-in student
 * and a partner request (including its creator). Returns null if the viewer has
 * no comparable profile attributes yet.
 */
export function calculateRequestCompatibility(
  viewer: PublicUser,
  creator: PublicUser,
  request: RequestMatchTarget
): MatchBreakdown | null {
  const viewerHasSignals =
    Boolean(viewer.college) ||
    Boolean(viewer.availability) ||
    viewer.skills.length > 0 ||
    viewer.interests.length > 0 ||
    viewer.preferredActivities.length > 0;

  if (!viewerHasSignals) {
    return null;
  }

  let earned = 0;
  let maxPossible = 0;
  const reasons: string[] = [];

  // 1. Same activity / preferred activity (30 pts)
  const viewerActivities = tokenize([
    ...viewer.preferredActivities,
    ...viewer.interests,
    ...viewer.skills,
  ]);
  if (viewerActivities.size > 0) {
    maxPossible += 30;
    const reqActivity = normalize(request.activity);
    const reqCategory = normalize(request.category);
    const reqTokens = tokenize([request.activity]);
    const exactMatch = viewer.preferredActivities.some(
      (a) => normalize(a) === reqActivity
    );
    const tokenMatch = Array.from(reqTokens).some((t) => viewerActivities.has(t));

    if (exactMatch) {
      earned += 30;
      reasons.push(`Matches your preferred activity (${request.activity})`);
    } else if (tokenMatch || viewerActivities.has(reqCategory)) {
      earned += 20;
      reasons.push(`Aligned with your ${request.activity} interests`);
    }
  }

  // 2. Similar skill level (20 pts)
  if (viewer.skillLevel && request.skillLevel) {
    maxPossible += 20;
    const skillResult = evaluateSkillCompatibility(viewer.skillLevel, request.skillLevel);
    earned += skillResult.points;
    if (skillResult.label) reasons.push(skillResult.label);
  }

  // 3. Availability overlap (20 pts)
  if (viewer.availability && request.availability) {
    maxPossible += 20;
    const availResult = evaluateAvailabilityOverlap(viewer.availability, request.availability);
    earned += availResult.points;
    if (availResult.label) reasons.push(availResult.label);
  }

  // 4. Shared interests & skills with creator (20 pts)
  const viewerTags = tokenize([...viewer.skills, ...viewer.interests]);
  const creatorTags = tokenize([...creator.skills, ...creator.interests]);
  if (viewerTags.size > 0 && creatorTags.size > 0) {
    maxPossible += 20;
    const shared: string[] = [];
    for (const item of [...creator.skills, ...creator.interests]) {
      const clean = normalize(item);
      if (clean && viewerTags.has(clean) && !shared.includes(item)) {
        shared.push(item);
      }
    }
    if (shared.length > 0) {
      const ratio = Math.min(1, shared.length / 2);
      earned += Math.round(20 * ratio);
      reasons.push(`Shared focus: ${shared.slice(0, 2).join(', ')}`);
    }
  }

  // 5. Same college (10 pts)
  const targetCollege = request.college || creator.college;
  if (viewer.college && targetCollege) {
    maxPossible += 10;
    if (normalize(viewer.college) === normalize(targetCollege)) {
      earned += 10;
      reasons.push(`Same campus (${targetCollege})`);
    }
  }

  if (maxPossible < 30 || earned === 0) {
    return null;
  }

  const score = Math.min(99, Math.max(15, Math.round((earned / maxPossible) * 100)));
  return {
    score,
    reasons: reasons.slice(0, 3),
  };
}

/**
 * Calculates deterministic, rule-based compatibility between two student profiles.
 */
export function calculatePartnerCompatibility(
  viewer: PublicUser,
  candidate: PublicUser
): MatchBreakdown | null {
  let earned = 0;
  let maxPossible = 0;
  const reasons: string[] = [];

  // 1. Shared preferred activities (30 pts)
  if (viewer.preferredActivities.length > 0 && candidate.preferredActivities.length > 0) {
    maxPossible += 30;
    const viewerSet = new Set(viewer.preferredActivities.map(normalize));
    const sharedActs = candidate.preferredActivities.filter((a) => viewerSet.has(normalize(a)));
    if (sharedActs.length > 0) {
      earned += Math.min(30, sharedActs.length * 15);
      reasons.push(`Both interested in ${sharedActs[0]}`);
    }
  }

  // 2. Similar skill level (20 pts)
  if (viewer.skillLevel && candidate.skillLevel) {
    maxPossible += 20;
    const skillResult = evaluateSkillCompatibility(viewer.skillLevel, candidate.skillLevel);
    earned += skillResult.points;
    if (skillResult.label) reasons.push(skillResult.label);
  }

  // 3. Availability overlap (20 pts)
  if (viewer.availability && candidate.availability) {
    maxPossible += 20;
    const availResult = evaluateAvailabilityOverlap(viewer.availability, candidate.availability);
    earned += availResult.points;
    if (availResult.label) reasons.push(availResult.label);
  }

  // 4. Shared skills & interests (20 pts)
  const viewerTags = tokenize([...viewer.skills, ...viewer.interests]);
  const candidateTags = tokenize([...candidate.skills, ...candidate.interests]);
  if (viewerTags.size > 0 && candidateTags.size > 0) {
    maxPossible += 20;
    const shared = [...candidate.skills, ...candidate.interests].filter((item) =>
      viewerTags.has(normalize(item))
    );
    const uniqueShared = Array.from(new Set(shared));
    if (uniqueShared.length > 0) {
      earned += Math.min(20, uniqueShared.length * 10);
      reasons.push(`Shared interests: ${uniqueShared.slice(0, 2).join(', ')}`);
    }
  }

  // 5. Same college (10 pts)
  if (viewer.college && candidate.college) {
    maxPossible += 10;
    if (normalize(viewer.college) === normalize(candidate.college)) {
      earned += 10;
      reasons.push(`Same campus (${candidate.college})`);
    }
  }

  if (maxPossible < 30 || earned === 0) {
    return null;
  }

  const score = Math.min(99, Math.max(15, Math.round((earned / maxPossible) * 100)));
  return {
    score,
    reasons: reasons.slice(0, 3),
  };
}
