/**
 * Auth Service
 * Provides typed authentication methods (Login, Register, Forgot Password, Refresh Token).
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { UserProfile } from '@/store/authStore';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface GoogleAuthPayload {
  email: string;
  fullName?: string;
  avatarUrl?: string;
  googleId?: string;
  idToken?: string;
}

const MOCK_ADMIN_USER: UserProfile = {
  id: 'usr_alex_123',
  name: 'Alex Stratos',
  email: 'alex@cloudcrackers.com',
  role: 'admin',
  membership: 'Gold Member',
  ordersCount: 12,
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCV8-3FhZVtA0Fjt6AaZnw3cE85M_e5pmdgyClV-cum995gGLSs44boitmYLkFiElaofmZZ-XiDtoDRe1tZpY3Vtjb5ovmMAI9oUundqO81Hy9izCvBWjFJ5nkOks888gR8BNKXO_7SXwk8QEfe1nCFtdlDdyLEjL5TEwOwazUCQCBFhM7fVa30e2OnfN6dJtMZZQKLEwmvFuHbdo785SSSrYeunKhSMDkmiRZi264pCA6aLAhv9eC_',
};

export class AuthService {
  private mapUserResponse(user: any): UserProfile {
    const normalizedRole =
      user?.role?.toUpperCase() === 'ADMIN' ? 'admin' : 'user';
    return {
      id: user.id || user._id || `usr_${Date.now()}`,
      name: user.full_name || user.name || 'User',
      email: user.email,
      phone: user.phone || user.phone_number || '',
      role: normalizedRole,
      membership: user.membership || (normalizedRole === 'admin' ? 'Administrator' : 'Standard Member'),
      ordersCount: user.ordersCount || 0,
      avatarUrl: user.avatarUrl || user.avatar_url,
    };
  }

  async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthResponse> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        user: {
          id: `usr_google_${Date.now()}`,
          name: payload.fullName || 'Google User',
          email: payload.email,
          role: 'user',
          membership: 'Standard Member',
          ordersCount: 0,
          avatarUrl: payload.avatarUrl,
        },
        accessToken: 'mock_jwt_access_token_2026',
        refreshToken: 'mock_jwt_refresh_token_2026',
      };
    }
    const { data: res } = await apiClient.post('/auth/google', {
      email: payload.email,
      full_name: payload.fullName,
      avatar_url: payload.avatarUrl,
      google_id: payload.googleId,
      id_token: payload.idToken,
    });
    const data = res.data || res;
    return {
      user: this.mapUserResponse(data.user),
      accessToken: data.access_token || data.accessToken,
      refreshToken: data.refresh_token || data.refreshToken,
    };
  }

  async login(email: string, password?: string): Promise<AuthResponse> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        user: { ...MOCK_ADMIN_USER, email },
        accessToken: 'mock_jwt_access_token_2026',
        refreshToken: 'mock_jwt_refresh_token_2026',
      };
    }
    const { data: res } = await apiClient.post('/auth/login', {
      email,
      password,
    });
    const payload = res.data || res;
    return {
      user: this.mapUserResponse(payload.user),
      accessToken: payload.access_token || payload.accessToken,
      refreshToken: payload.refresh_token || payload.refreshToken,
    };
  }

  async register(
    name: string,
    email: string,
    password?: string,
    phone?: string,
    confirmPassword?: string
  ): Promise<AuthResponse> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        user: {
          id: `usr_${Date.now()}`,
          name,
          email,
          role: 'user',
          membership: 'Standard Member',
          ordersCount: 0,
        },
        accessToken: 'mock_jwt_access_token_2026',
        refreshToken: 'mock_jwt_refresh_token_2026',
      };
    }
    const { data: res } = await apiClient.post('/auth/register', {
      full_name: name,
      email,
      phone: phone || '9876543210',
      password,
      confirm_password: confirmPassword || password,
    });
    const payload = res.data || res;
    return {
      user: this.mapUserResponse(payload.user),
      accessToken: payload.access_token || payload.accessToken,
      refreshToken: payload.refresh_token || payload.refreshToken,
    };
  }

  async forgotPassword(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        success: true,
        message: `Password reset instructions sent to ${email}`,
      };
    }
    const { data: res } = await apiClient.post('/auth/forgot-password', { email });
    return {
      success: res.success !== undefined ? res.success : true,
      message: res.message || 'Password reset link sent',
    };
  }

  async resetPassword(
    email: string,
    password?: string,
    confirmPassword?: string
  ): Promise<AuthResponse> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        user: { ...MOCK_ADMIN_USER, email },
        accessToken: 'mock_jwt_access_token_2026',
        refreshToken: 'mock_jwt_refresh_token_2026',
      };
    }
    const { data: res } = await apiClient.post('/auth/reset-password', {
      email,
      password,
      confirm_password: confirmPassword || password,
    });
    const payload = res.data || res;
    return {
      user: this.mapUserResponse(payload.user),
      accessToken: payload.access_token || payload.accessToken,
      refreshToken: payload.refresh_token || payload.refreshToken,
    };
  }

  async updateProfile(
    name?: string,
    phone?: string,
    avatarBase64?: string
  ): Promise<UserProfile> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        ...MOCK_ADMIN_USER,
        name: name || MOCK_ADMIN_USER.name,
        phone: phone || MOCK_ADMIN_USER.phone,
        avatarUrl: avatarBase64 || MOCK_ADMIN_USER.avatarUrl,
      };
    }
    const { data: res } = await apiClient.put('/auth/me', {
      full_name: name,
      phone: phone,
      avatar_base64: avatarBase64,
    });
    const payload = res.data || res;
    return this.mapUserResponse(payload);
  }

  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string }> {
    if (ENV.ENABLE_MOCK_API) {
      return { accessToken: 'mock_refreshed_jwt_access_token_2026' };
    }
    const { data: res } = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    const payload = res.data || res;
    return { accessToken: payload.access_token || payload.accessToken };
  }
}

export const authService = new AuthService();
export default authService;
