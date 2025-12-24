import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SessionTimeoutModal from '@/components/auth/SessionTimeoutModal';

interface SessionTimeoutContextType {
  resetTimeout: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // Show warning 2 minutes before timeout
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(WARNING_BEFORE_TIMEOUT);
  
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setTimeRemaining(WARNING_BEFORE_TIMEOUT);
    
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
    }
    await signOut();
    navigate('/auth', { state: { message: 'Your session has expired. Please sign in again.' } });
  }, [signOut, navigate]);

  const handleStayLoggedIn = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  // Check for timeout
  useEffect(() => {
    if (!user) return;

    // Don't run timeout on auth page
    if (location.pathname === '/auth') return;

    const checkTimeout = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      const timeUntilTimeout = TIMEOUT_DURATION - timeSinceLastActivity;

      if (timeUntilTimeout <= 0) {
        // Session expired
        handleLogout();
      } else if (timeUntilTimeout <= WARNING_BEFORE_TIMEOUT && !showWarning) {
        // Show warning
        setShowWarning(true);
        setTimeRemaining(timeUntilTimeout);
        
        // Start countdown
        warningIntervalRef.current = setInterval(() => {
          const remaining = TIMEOUT_DURATION - (Date.now() - lastActivityRef.current);
          if (remaining <= 0) {
            handleLogout();
          } else {
            setTimeRemaining(remaining);
          }
        }, 1000);
      }
    };

    // Check every 10 seconds
    timeoutRef.current = setInterval(checkTimeout, 10000);
    
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
    };
  }, [user, handleLogout, showWarning, location.pathname]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, showWarning]);

  return (
    <SessionTimeoutContext.Provider value={{ resetTimeout }}>
      {children}
      <SessionTimeoutModal
        open={showWarning}
        timeRemaining={timeRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleLogout}
      />
    </SessionTimeoutContext.Provider>
  );
}

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within SessionTimeoutProvider');
  }
  return context;
}
