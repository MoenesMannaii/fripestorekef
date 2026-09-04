"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  name: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  activeShift: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  refreshShift: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = "http://localhost:4000/api";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setUserRole(null);
    setActiveShift(null);
    setIsAuthenticated(false);
    router.push('/auth/connexion');
  }, [router]);

  const refreshShift = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const res = await axios.get(`${API_BASE}/shifts/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setActiveShift(res.data.data);
      } else {
        setActiveShift(null);
      }
    } catch (error) {
      console.error('Failed to fetch active shift:', error);
      setActiveShift(null);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      setIsLoading(false);
      if (!pathname.includes('/auth') && !pathname.includes('/setup')) {
        router.replace('/auth/connexion');
      }
      return;
    }

    try {
      // 1. Verify token
      const verifyRes = await axios.get(`${API_BASE}/auth/verify-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!verifyRes.data.valid) {
        logout();
        return;
      }

      // 2. Get user info
      const userRes = await axios.get(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = userRes.data.user;
      setUser(userData);
      setUserRole(userData.role);
      setIsAuthenticated(true);
      
      // Cache user data for parts of app that use localStorage
      localStorage.setItem('user', JSON.stringify(userData));

      // 3. Get active shift in parallel or sequence
      await refreshShift();

    } catch (error) {
      console.error("Auth initialization error:", error);
      // Don't logout on network error, just stop loading
      if (axios.isAxiosError(error) && !error.response) {
         // Network error?
      } else {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router, logout, refreshShift]);

  // Initial load
  useEffect(() => {
    refreshAuth();
  }, []); // Run ONLY once on mount

  // 🔄 Re-validate when localStorage changes (e.g. admin switches account/role)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === 'user') {
        console.log('🔄 AuthContext - localStorage changed, re-validating auth...');
        refreshAuth();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 AuthContext - tab became visible, re-validating auth...');
        refreshAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      activeShift, 
      isAuthenticated, 
      isLoading, 
      refreshAuth, 
      refreshShift, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
