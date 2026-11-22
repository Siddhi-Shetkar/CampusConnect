export type ActivityCategory = 'Learning' | 'Building' | 'Sports' | 'Other';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type RequestFrequency = 'Once' | 'Daily' | 'Few times a week' | 'Flexible';
export type RequestStatus = 'Active' | 'Filled' | 'Closed';
export type ConnectionStatus = 'Pending' | 'Accepted' | 'Rejected';

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  'Learning',
  'Building',
  'Sports',
  'Other',
];

export const ACTIVITIES_BY_CATEGORY: Record<ActivityCategory, string[]> = {
  Learning: [
    'DSA Partner',
    'Study Partner',
    'Lab Partner',
    'Exam Preparation Partner',
  ],
  Building: [
    'Project Partner',
    'Hackathon Teammate',
    'Coding Contest Partner',
    'Developer / Designer Teammate',
  ],
  Sports: [
    'Badminton',
    'Football',
    'Basketball',
    'Cricket',
    'Running',
    'Gym',
  ],
  Other: [
    'Club Activities',
    'Photography',
    'Content Creation',
    'Music',
    'Competitions',
  ],
};

export const ALL_ACTIVITIES: string[] = ACTIVITY_CATEGORIES.flatMap(
  (category) => ACTIVITIES_BY_CATEGORY[category]
);

export const SKILL_LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export const REQUEST_FREQUENCIES: RequestFrequency[] = [
  'Once',
  'Daily',
  'Few times a week',
  'Flexible',
];

export const REQUEST_STATUSES: RequestStatus[] = ['Active', 'Filled', 'Closed'];

export const YEARS_OF_STUDY: string[] = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate',
];

export const AVAILABILITY_SUGGESTIONS: string[] = [
  '6 AM – 8 AM',
  '4 PM – 6 PM',
  '6 PM – 8 PM',
  '7 PM – 9 PM',
  '8 PM – 10 PM',
  'Weekends',
  'Flexible',
];

export const AVAILABILITY_FILTER_OPTIONS: string[] = [
  'Morning (6 AM – 12 PM)',
  'Afternoon (12 PM – 5 PM)',
  'Evening (5 PM – 9 PM)',
  'Night (9 PM – 12 AM)',
  'Weekends',
  'Flexible',
];

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  college: string;
  year: string;
  bio: string;
  profileImage: string;
  skills: string[];
  interests: string[];
  preferredActivities: string[];
  availability: string;
  skillLevel: SkillLevel;
  createdAt: string;
}

export interface MatchBreakdown {
  score: number;
  reasons: string[];
}

export interface PartnerRequestDTO {
  id: string;
  creator: PublicUser;
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
  compatibility?: MatchBreakdown | null;
  connectionStatus?: ConnectionStatus | null;
  connectionId?: string | null;
  pendingInterestedCount?: number;
}

export interface ConnectionRequestDTO {
  id: string;
  sender: PublicUser;
  receiver: PublicUser;
  partnerRequest: {
    id: string;
    title: string;
    category: ActivityCategory;
    activity: string;
    college: string;
    availability: string;
    skillLevel: SkillLevel;
    status: RequestStatus;
  } | null;
  message: string;
  status: ConnectionStatus;
  createdAt: string;
}

export interface RecommendedPartnerDTO {
  user: PublicUser;
  compatibility: MatchBreakdown;
  activeRequestCount: number;
  latestRequestId?: string;
  latestRequestTitle?: string;
}

export interface DashboardSummaryDTO {
  recentRequests: PartnerRequestDTO[];
  recommendedPartners: RecommendedPartnerDTO[];
  myActiveRequests: PartnerRequestDTO[];
  pendingReceivedRequests: ConnectionRequestDTO[];
  myConnections: ConnectionRequestDTO[];
  stats: {
    activeRequestsCount: number;
    pendingReceivedCount: number;
    connectionsCount: number;
  };
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  sender: PublicUser;
  recipientId: string;
  text: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  partner: PublicUser;
  connectedActivity: string | null;
  connectedRequestTitle: string | null;
  lastMessageText: string;
  lastMessageSenderId: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected'
  | 'new_message';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  actor: PublicUser | null;
  createdAt: string;
}

export interface PushConfigDTO {
  publicKey: string;
  supported: boolean;
  configuredInEnv: boolean;
}

