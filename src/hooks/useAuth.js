import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/GlobalRedux/hooks';
import { login, logout, updateCountry, updateToken } from '@/GlobalRedux/Features/auth/authSlice';
import { getSession, createSession, deleteSession, isLoggedIn } from '@/utils/session';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { isLoggedin, country, token } = useAppSelector((state) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state from session on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await getSession();
        if (session && session.userId) {
          dispatch(login());
          if (session.countryId) dispatch(updateCountry(session.countryId));
          // Note: token is not stored in JWT session, only countryId and userId
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Login function
  const loginUser = async (credentials) => {
    try {
      // Make your login API call here
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const userData = await response.json();
      
      // Create JWT session with userId and countryId
      await createSession(userData.countryId, userData.userId);
      
      // Update Redux state
      dispatch(login());
      if (userData.countryId) dispatch(updateCountry(userData.countryId));
      if (userData.token) dispatch(updateToken(userData.token));

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logoutUser = async () => {
    try {
      await deleteSession();
      dispatch(logout());
      dispatch(updateCountry(null));
      dispatch(updateToken(null));
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check session validity
  const checkSession = async () => {
    try {
      const session = await getSession();
      const isValid = await isLoggedIn();
      
      if (!isValid && isLoggedin) {
        // Session expired, logout user
        await logoutUser();
      }
      
      return {
        isLoggedin: isValid,
        userId: session?.userId,
        countryId: session?.countryId,
        expiresAt: session?.expiresAt,
      };
    } catch (error) {
      console.error('Check session error:', error);
      return {
        isLoggedin: false,
        userId: null,
        countryId: null,
        expiresAt: null,
      };
    }
  };

  return {
    isLoggedin,
    country,
    token,
    isInitialized,
    loginUser,
    logoutUser,
    checkSession,
  };
};
