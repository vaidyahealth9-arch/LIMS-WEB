import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { login as apiLogin } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string, roles: string[], organizationId: string, organizationName: string } | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

type LoginResponse = {
  token: string;
  userId: number;
  username: string;
  roles?: string[];
  organizationId: number | string;
  organizationName: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<{ username: string, roles: string[], organizationId: string, organizationName: string } | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

    const login = async (username: string, password: string) => {
      const response = await apiLogin(username, password) as LoginResponse;
      const { token, userId, organizationId, organizationName, roles } = response;
      const userDetails = {
          username: response.username,
        roles: Array.isArray(roles) ? roles : [],
        organizationId: String(organizationId),
          organizationName
      };
      setToken(token);
      setUser(userDetails);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userDetails));
      localStorage.setItem('organizationId', String(organizationId));
      localStorage.setItem('userId', String(userId));
      setIsAuthenticated(true);
  };

  const logout = () => {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('organizationId');
      localStorage.removeItem('userId');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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