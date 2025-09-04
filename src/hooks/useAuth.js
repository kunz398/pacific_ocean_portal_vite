import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/GlobalRedux/hooks';
import { login, logout, updateCountry, updateToken } from '@/GlobalRedux/Features/auth/authSlice';
import { getSession, createSession, deleteSession, isLoggedIn } from '@/utils/session';
import { login as loginAPI } from '@/utils/api';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { isLoggedin, country, token } = useAppSelector((state) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state from session on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('useAuth: Starting auth initialization...');
        const session = await getSession();
        console.log('useAuth: Retrieved session:', session);
        const isValid = await isLoggedIn();
        console.log('useAuth: Session validity check:', isValid);
        
        if (session && session.userId && isValid) {
          // User has valid session, restore full auth state
          console.log('useAuth: Restoring auth state from valid session');
          dispatch(login());
          if (session.countryId) {
            console.log('useAuth: Restoring country:', session.countryId);
            dispatch(updateCountry(session.countryId));
          }
          if (session.token) {
            console.log('useAuth: Restoring token');
            dispatch(updateToken(session.token));
          }
          console.log('useAuth: Auth restored from session:', { userId: session.userId, countryId: session.countryId });
        } else if (session && !isValid) {
          // Session exists but is expired, clear it
          console.log('useAuth: Session expired, clearing auth state');
          await deleteSession();
          dispatch(logout());
          dispatch(updateCountry(null));
          dispatch(updateToken(null));
        } else {
          // No session, ensure clean state
          console.log('useAuth: No session found, ensuring clean auth state');
          dispatch(logout());
          dispatch(updateCountry(null));
          dispatch(updateToken(null));
        }
      } catch (error) {
        console.error('useAuth: Error initializing auth:', error);
        // On error, ensure clean state
        dispatch(logout());
        dispatch(updateCountry(null));
        dispatch(updateToken(null));
      } finally {
        console.log('useAuth: Auth initialization complete');
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Login function
  const loginUser = async (credentials) => {
    try {
      // Use the API utility function
      const result = await loginAPI(credentials.username || credentials.email, credentials.password);
      
      if (result.success) {
        // Create JWT session with countryId, userId, and token
        await createSession(result.countryId, credentials.username || credentials.email, result.token);
        
        // Update Redux state
        dispatch(login());
        if (result.countryId) dispatch(updateCountry(result.countryId));
        if (result.token) dispatch(updateToken(result.token));

        return { success: true, user: { countryId: result.countryId, token: result.token } };
      } else {
        return { success: false, error: result.message || 'Login failed' };
      }
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
