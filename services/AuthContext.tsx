import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { login as apiLogin } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string, roles: string[], organizationId: string, organizationName: string } | null;
  login: (username, password) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string, roles: string[], organizationId: string, organizationName: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
          setToken(storedToken);
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
              setUser(JSON.parse(storedUser));
          }
          setIsAuthenticated(true);
      }
  }, []);

  const login = async (username, password) => {
      const response = await apiLogin(username, password);
      const { token, userId, organizationId, organizationName } = response;
      const userDetails = {
          username: response.username,
          roles: [], // Assuming roles are not in the response for now
          organizationId,
          organizationName
      };
      setToken(token);
      setUser(userDetails);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userDetails));
      localStorage.setItem('organizationId', organizationId);
      localStorage.setItem('userId', userId);
      setIsAuthenticated(true);
  };

  const logout = () => {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('organizationId');
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