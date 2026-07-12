const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

let isRefreshing = false;

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing) return false;
  isRefreshing = true;
  try {
    const refreshToken = localStorage.getItem('hfa_refresh_token');
    const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;

    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body && { body }),
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('hfa_token', data.token);
        isRefreshing = false;
        return true;
      }
    }
  } catch (err) {
    console.error('Error refreshing token:', err);
  }
  isRefreshing = false;
  return false;
}

async function apiFetch(path: string, options: RequestInit = {}, timeoutMs = 10000) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hfa_token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && typeof window !== 'undefined') {
    if (!path.includes('/auth/login') && !path.includes('/auth/refresh') && !path.includes('/auth/logout')) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        const newToken = localStorage.getItem('hfa_token');
        const updatedHeaders = {
          ...headers,
          ...(newToken ? { 'Authorization': `Bearer ${newToken}` } : {}),
        };
        const ctrl2 = new AbortController();
        const timer2 = setTimeout(() => ctrl2.abort(), timeoutMs);
        try {
          res = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: updatedHeaders,
            credentials: 'include',
            signal: ctrl2.signal,
          });
        } finally {
          clearTimeout(timer2);
        }
      }
    }
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('hfa_user');
    localStorage.removeItem('hfa_token');
    localStorage.removeItem('hfa_refresh_token');
    const path = window.location.pathname;
    const isPublic = path === '/' || 
                     path.startsWith('/login') || 
                     path.startsWith('/register') || 
                     path.startsWith('/forgot-password') || 
                     path.startsWith('/reset-password') ||
                     path.startsWith('/terms') ||
                     path.startsWith('/privacy');
    if (!isPublic) {
      window.location.href = '/login?session=expired';
    }
    return null;
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

export const API = {
  get: (path: string, opts?: RequestInit) =>
    apiFetch(path, { method: 'GET', ...opts }),
  post: (path: string, body?: any, opts?: RequestInit) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  postAuth: (path: string, body?: any, opts?: RequestInit) =>
    // Auth endpoints do bcrypt + remote DB (Supabase pooler) — needs generous timeout
    apiFetch(path, { method: 'POST', body: JSON.stringify(body), ...opts }, 35000),
  patch: (path: string, body?: any, opts?: RequestInit) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: (path: string, opts?: RequestInit) =>
    apiFetch(path, { method: 'DELETE', ...opts }),
};

/* ============================================================
   TYPED HELPER FUNCTIONS
   ============================================================ */

export interface UserProfile {
  id: string;
  email: string;
  role: 'startup' | 'investor' | 'mentor' | 'admin' | 'government' | 'corporate' | 'student' | 'service_provider';
  first_name: string;
  last_name: string;
  phone?: string;
  country?: string;
  bio?: string;
  avatar_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  website_url?: string;
  is_verified?: boolean;
  onboarding_completed?: boolean;
  verification_status?: string;
  hope_score?: number;
  profile_completion?: number;
  funding_readiness?: string;
  opportunity_readiness?: string;
  startup_profile?: any;
  investor_profile?: any;
  mentor_profile?: any;
}

export const HFAApi = {
  // Auth
  async getAuthStatus(): Promise<{ success: boolean; user: any }> {
    return API.get('/auth/status');
  },

  async getProfile(): Promise<{ success: boolean; data: UserProfile }> {
    return API.get('/users/me');
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; message: string }> {
    return API.patch('/users/me', updates);
  },

  async verifyEmail(code: string): Promise<{ success: boolean; message: string }> {
    return API.post('/auth/verify', { code });
  },

  // Startups & Investors
  async updateStartup(updates: any): Promise<{ success: boolean; data: any }> {
    return API.post('/startups', updates);
  },

  async loadStartup(id: string): Promise<{ success: boolean; data: any }> {
    return API.get(`/startups/${id}`);
  },

  async updateInvestor(updates: any): Promise<{ success: boolean; data: any }> {
    return API.post('/investors', updates);
  },

  // Matches
  async loadMatches(filters: { minScore?: number; targetType?: string; status?: string; limit?: number } = {}): Promise<{ success: boolean; data: any[] }> {
    const params = new URLSearchParams();
    if (filters.minScore !== undefined) params.set('min_score', filters.minScore.toString());
    if (filters.targetType) params.set('target_type', filters.targetType);
    if (filters.status) params.set('status', filters.status);
    if (filters.limit) params.set('limit', filters.limit.toString());
    return API.get(`/matches/my?${params}`);
  },

  async updateMatchStatus(matchId: string, status: string): Promise<{ success: boolean; message: string }> {
    return API.patch(`/matches/${matchId}/status`, { status });
  },

  // Grants
  async loadMyGrants(): Promise<{ success: boolean; data: any[] }> {
    return API.get('/grants/my');
  },

  async submitGrantApplication(payload: any): Promise<{ success: boolean; data: any }> {
    return API.post('/grants/apply', payload);
  },

  // Mentors
  async loadMentors(limit = 20): Promise<{ success: boolean; data: any[] }> {
    return API.get(`/mentors?limit=${limit}`);
  },

  async bookSession(payload: any): Promise<{ success: boolean; data: any }> {
    return API.post('/sessions', payload);
  },

  async loadMySessions(): Promise<{ success: boolean; data: any[] }> {
    return API.get('/sessions');
  },

  async updateSessionStatus(sessionId: string, status: string, notes?: string): Promise<{ success: boolean; data: any }> {
    return API.patch(`/sessions/${sessionId}/status`, { status, notes });
  },

  // Messaging & Notifications
  async loadThreads(): Promise<{ success: boolean; data: any[] }> {
    return API.get('/messages/threads');
  },

  async loadNotifications(): Promise<{ success: boolean; data: any[]; unread: number }> {
    return API.get('/notifications');
  },

  async markAllNotificationsRead(): Promise<{ success: boolean; message: string }> {
    return API.patch('/notifications/read-all');
  },
};
