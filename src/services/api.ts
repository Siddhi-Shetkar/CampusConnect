import {
  ActivityCategory,
  ConnectionRequestDTO,
  ConversationDTO,
  DashboardSummaryDTO,
  MessageDTO,
  NotificationDTO,
  PartnerRequestDTO,
  PublicUser,
  PushConfigDTO,
  RequestFrequency,
  RequestStatus,
  SkillLevel,
} from '../types/campus';

// JWT held strictly in JS memory (never persisted to localStorage/sessionStorage).
// On full page reloads, GET /api/auth/me restores the session from the HttpOnly cookie.
let authToken: string | null = null;

export function setInMemoryToken(token: string | null): void {
  authToken = token;
}

export function getInMemoryToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  college: string;
  year: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export const authApi = {
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setInMemoryToken(res.token);
    return res;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setInMemoryToken(res.token);
    return res;
  },

  async restoreSession(): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/api/auth/me');
    setInMemoryToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setInMemoryToken(null);
    }
  },
};

export interface UpdateProfilePayload {
  name: string;
  college: string;
  year: string;
  bio: string;
  profileImage: string;
  skills: string[];
  interests: string[];
  preferredActivities: string[];
  availability: string;
  skillLevel: SkillLevel;
}

export const usersApi = {
  async getMe(): Promise<{ user: PublicUser }> {
    return request<{ user: PublicUser }>('/api/users/me');
  },

  async updateMe(payload: UpdateProfilePayload): Promise<{ user: PublicUser }> {
    return request<{ user: PublicUser }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getDashboard(): Promise<DashboardSummaryDTO> {
    return request<DashboardSummaryDTO>('/api/users/dashboard');
  },
};

export interface RequestSearchParams {
  category?: string;
  activity?: string;
  college?: string;
  skillLevel?: string;
  availability?: string;
  search?: string;
  sort?: 'newest' | 'match';
  includeOwn?: boolean;
}

export interface SavePartnerRequestPayload {
  title: string;
  category: ActivityCategory;
  activity: string;
  description: string;
  skillLevel: SkillLevel;
  availability: string;
  frequency: RequestFrequency;
  college: string;
  peopleNeeded: number;
  status?: RequestStatus;
}

export const requestsApi = {
  async list(params: RequestSearchParams = {}): Promise<{
    requests: PartnerRequestDTO[];
    facets: { colleges: string[]; activities: string[] };
  }> {
    const qs = new URLSearchParams();
    if (params.category && params.category !== 'All') qs.set('category', params.category);
    if (params.activity && params.activity !== 'All') qs.set('activity', params.activity);
    if (params.college && params.college !== 'All') qs.set('college', params.college);
    if (params.skillLevel && params.skillLevel !== 'All') qs.set('skillLevel', params.skillLevel);
    if (params.availability && params.availability !== 'All') {
      qs.set('availability', params.availability);
    }
    if (params.search) qs.set('search', params.search);
    if (params.sort) qs.set('sort', params.sort);
    if (params.includeOwn) qs.set('includeOwn', 'true');

    const query = qs.toString();
    return request(`/api/requests${query ? `?${query}` : ''}`);
  },

  async listMine(): Promise<{ requests: PartnerRequestDTO[] }> {
    return request('/api/requests/mine');
  },

  async getById(id: string): Promise<{ request: PartnerRequestDTO }> {
    return request(`/api/requests/${encodeURIComponent(id)}`);
  },

  async create(payload: SavePartnerRequestPayload): Promise<{ request: PartnerRequestDTO }> {
    return request('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(
    id: string,
    payload: SavePartnerRequestPayload
  ): Promise<{ request: PartnerRequestDTO }> {
    return request(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: string, status: RequestStatus): Promise<{ request: PartnerRequestDTO }> {
    return request(`/api/requests/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async remove(id: string): Promise<{ message: string }> {
    return request(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export interface ConnectionsOverviewResponse {
  connections: ConnectionRequestDTO[];
  received: ConnectionRequestDTO[];
  sent: ConnectionRequestDTO[];
  pendingReceivedCount: number;
}

export const connectionsApi = {
  async listOverview(): Promise<ConnectionsOverviewResponse> {
    return request('/api/connections');
  },

  async listInterested(requestId: string): Promise<{ interested: ConnectionRequestDTO[] }> {
    return request(`/api/connections/request/${encodeURIComponent(requestId)}`);
  },

  async send(
    partnerRequestId: string,
    message = ''
  ): Promise<{ connection: ConnectionRequestDTO }> {
    return request('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ partnerRequestId, message }),
    });
  },

  async respond(
    connectionId: string,
    status: 'Accepted' | 'Rejected'
  ): Promise<{ connection: ConnectionRequestDTO; conversationId?: string | null }> {
    return request(`/api/connections/${encodeURIComponent(connectionId)}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export const messagesApi = {
  async listConversations(): Promise<{
    conversations: ConversationDTO[];
    totalUnreadCount: number;
  }> {
    return request('/api/messages/conversations');
  },

  async openWithUser(partnerId: string): Promise<{ conversation: ConversationDTO }> {
    return request(`/api/messages/conversations/with/${encodeURIComponent(partnerId)}`, {
      method: 'POST',
    });
  },

  async getMessages(conversationId: string): Promise<{
    conversationId: string;
    partner: PublicUser | null;
    messages: MessageDTO[];
  }> {
    return request(`/api/messages/conversations/${encodeURIComponent(conversationId)}`);
  },

  async sendMessage(conversationId: string, text: string): Promise<{ message: MessageDTO }> {
    return request(`/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async markRead(conversationId: string): Promise<{ readIds: string[]; readAt: string }> {
    return request(`/api/messages/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'POST',
    });
  },
};

export const notificationsApi = {
  async list(): Promise<{ notifications: NotificationDTO[]; unreadCount: number }> {
    return request('/api/notifications');
  },

  async markRead(id: string): Promise<{ ok: boolean; unreadCount: number }> {
    return request(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
  },

  async markAllRead(): Promise<{ ok: boolean; unreadCount: number }> {
    return request('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  async getPushConfig(): Promise<PushConfigDTO> {
    return request('/api/notifications/push-config');
  },

  async subscribePush(subscription: PushSubscriptionJSON): Promise<{ ok: boolean; message: string }> {
    return request('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  },

  async unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
    return request('/api/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  },

  async testPush(): Promise<{ ok: boolean; sent: number; failed: number }> {
    return request('/api/notifications/test-push', {
      method: 'POST',
    });
  },
};
