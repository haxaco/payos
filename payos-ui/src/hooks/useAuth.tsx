import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

interface Organization {
  id: string;
  name: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, organizationName: string, userName?: string) => Promise<{ apiKeys: any }>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    const storedOrg = localStorage.getItem('organization');

    if (storedToken && storedUser && storedOrg) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
      setOrganization(JSON.parse(storedOrg));
      // Verify token is still valid
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function verifyToken(token: string) {
    try {
      const response = await fetch(`${API_URL}/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setOrganization(data.tenant);
        setLoading(false);
      } else {
        // Token is invalid, clear auth state
        clearAuthState();
        setLoading(false);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuthState();
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch(`${API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    
    setUser(data.user);
    setOrganization(data.tenant);
    setAccessToken(data.session.accessToken);

    // Store in localStorage
    localStorage.setItem('access_token', data.session.accessToken);
    localStorage.setItem('refresh_token', data.session.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('organization', JSON.stringify(data.tenant));

    navigate('/');
  }

  async function signup(email: string, password: string, organizationName: string, userName?: string) {
    const response = await fetch(`${API_URL}/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        organizationName,
        userName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.details?.[0]?.message || 'Signup failed');
    }

    const data = await response.json();
    
    setUser(data.user);
    setOrganization(data.tenant);
    setAccessToken(data.session.accessToken);

    // Store in localStorage
    localStorage.setItem('access_token', data.session.accessToken);
    localStorage.setItem('refresh_token', data.session.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('organization', JSON.stringify(data.tenant));

    return { apiKeys: data.apiKeys };
  }

  function logout() {
    clearAuthState();
    navigate('/login');
  }

  function clearAuthState() {
    setUser(null);
    setOrganization(null);
    setAccessToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
  }

  async function refreshAuth() {
    const token = localStorage.getItem('access_token');
    if (token) {
      await verifyToken(token);
    }
  }

  const value: AuthContextType = {
    user,
    organization,
    accessToken,
    loading,
    login,
    signup,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route wrapper
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

