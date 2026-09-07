/**
 * Custom Hook: useAuth
 * Provides convenient reactive binding to auth state and service actions.
 */

import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const loginAction = useAuthStore((state) => state.login);
  const registerAction = useAuthStore((state) => state.register);
  const logoutAction = useAuthStore((state) => state.logout);

  const handleLogin = useCallback(
    async (email: string, password?: string) => {
      const response = await authService.login(email, password);
      loginAction(response.user.email, password);
      return response;
    },
    [loginAction]
  );

  const handleRegister = useCallback(
    async (name: string, email: string, password?: string) => {
      const response = await authService.register(name, email, password);
      registerAction(response.user.name, response.user.email, password);
      return response;
    },
    [registerAction]
  );

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: logoutAction,
  };
};

export default useAuth;
