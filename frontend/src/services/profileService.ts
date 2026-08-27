import { UserProfile } from '@/store/authStore';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export class ProfileService {
  async getProfile(): Promise<UserProfile> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        id: 'usr_guest_123',
        name: 'Guest User',
        email: 'guest@meeracrackersworld.com',
        role: 'user',
        membership: 'Standard Member',
        ordersCount: 0,
      };
    }
    const { data: res } = await apiClient.get('/auth/me');
    const user = res.data || res;
    const normalizedRole =
      user?.role?.toUpperCase() === 'ADMIN' ? 'admin' : 'user';
    return {
      id: user.id || user._id || `usr_${Date.now()}`,
      name: user.full_name || user.name || 'User',
      email: user.email || '',
      role: normalizedRole as 'admin' | 'user',
      membership:
        normalizedRole === 'admin'
          ? 'Administrator'
          : user.membership || 'Standard Member',
      ordersCount: user.ordersCount || 0,
      avatarUrl: user.avatar_url || user.avatarUrl,
      phone: user.phone || '',
    };
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        id: updates.id || 'usr_guest_123',
        name: updates.name || 'User',
        email: updates.email || '',
        role: updates.role || 'user',
        membership: updates.membership || 'Standard Member',
        ordersCount: updates.ordersCount ?? 0,
        avatarUrl: updates.avatarUrl,
        phone: updates.phone,
      };
    }
    const { data: res } = await apiClient.put('/auth/me', updates);
    const user = res.data || res;
    const normalizedRole =
      user?.role?.toUpperCase() === 'ADMIN' ? 'admin' : 'user';
    return {
      id: user.id || user._id,
      name: user.full_name || user.name,
      email: user.email,
      role: normalizedRole as 'admin' | 'user',
      membership:
        normalizedRole === 'admin'
          ? 'Administrator'
          : user.membership || 'Standard Member',
      ordersCount: user.ordersCount || 0,
      avatarUrl: user.avatar_url || user.avatarUrl,
      phone: user.phone,
    };
  }
}

export const profileService = new ProfileService();
export default profileService;

