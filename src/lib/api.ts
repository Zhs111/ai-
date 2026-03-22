const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Request failed with status ${response.status}`,
        };
      }

      return data;
    } catch (error: any) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // Auth endpoints
  async register(email: string, password: string, username: string) {
    const result = await this.request<{ user: any; session: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });

    if (result.success && result.data?.session?.access_token) {
      this.setToken(result.data.session.access_token);
    }

    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ user: any; session: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.success && result.data?.session?.access_token) {
      this.setToken(result.data.session.access_token);
    }

    return result;
  }

  async logout() {
    const result = await this.request('/auth/logout', {
      method: 'POST',
    });

    this.setToken(null);
    return result;
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  // Games endpoints
  async getGames(params?: { category?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const endpoint = `/games${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<{ games: any[]; total: number }>(endpoint);
  }

  async getGame(id: string) {
    return this.request<any>(`/games/${id}`);
  }

  async createGame(gameData: any) {
    return this.request<any>('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  }

  async updateGame(id: string, gameData: any) {
    return this.request<any>(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gameData),
    });
  }

  async deleteGame(id: string) {
    return this.request(`/games/${id}`, {
      method: 'DELETE',
    });
  }

  async likeGame(id: string) {
    return this.request<any>(`/games/${id}/like`, {
      method: 'POST',
    });
  }

  // Profile endpoints
  async getMyProfile() {
    return this.request<any>('/profiles');
  }

  async getProfile(id: string) {
    return this.request<any>(`/profiles/${id}`);
  }

  async updateProfile(data: { username?: string; bio?: string; avatar_url?: string }) {
    return this.request<any>('/profiles', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
