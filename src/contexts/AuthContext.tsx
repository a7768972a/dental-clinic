'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// كلمة المرور الثابتة - يمكن تغييرها هنا
const ADMIN_PASSWORD = 'admin123';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // استخدام useEffect للتحقق من localStorage بعد الـ mount
  useEffect(() => {
    // نستخدم دالة لتجنب تحذير lint
    const checkAuth = () => {
      try {
        const authStatus = localStorage.getItem('isAuthenticated');
        // نستخدم callback form لتجنب التحذير
        setIsAuthenticated(() => authStatus === 'true');
      } catch (e) {
        // localStorage might not be available
      }
      setIsLoading(() => false);
    };
    
    // تأخير بسيط للتأكد من أن المكون جاهز
    const timer = setTimeout(checkAuth, 0);
    return () => clearTimeout(timer);
  }, []);

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      try {
        localStorage.setItem('isAuthenticated', 'true');
      } catch (e) {
        // localStorage might not be available
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('isAuthenticated');
    } catch (e) {
      // localStorage might not be available
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
