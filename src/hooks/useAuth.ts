import { useState, useEffect, useCallback } from 'react';
import { authService, type User } from '../services/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检查当前用户
    authService.getCurrentUser().then((user) => {
      setUser(user);
      setIsLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    setUser,
  };
}
