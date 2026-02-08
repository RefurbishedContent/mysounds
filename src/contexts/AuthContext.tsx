import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthState, User, UserCredits } from '../types';
import { databaseService } from '../lib/database';
import { supabase } from '../lib/supabase';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  credits: UserCredits | null;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const refreshCredits = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      setCredits(null);
      return;
    }

    try {
      const userCredits = await databaseService.getUserCredits(userId);
      setCredits(userCredits);
    } catch (error) {
      console.error('Failed to fetch user credits:', error);
      setCredits(null);
    }
  }, []);

  const ensureUserProfile = useCallback(async (userId: string, email: string, name: string) => {
    try {
      await supabase.from('users').upsert(
        { id: userId, email, name },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    } catch (err) {
      console.warn('ensureUserProfile failed (trigger likely handled it):', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      console.log('Starting auth check...');
      
      // Set a timeout to prevent infinite loading
      const authTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth check timed out after 5 seconds, proceeding without auth');
          currentUserIdRef.current = null;
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
        }
      }, 5000);

      try {
        console.log('Getting Supabase session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) {
          console.log('Component unmounted, skipping auth check');
          return;
        }
        
        clearTimeout(authTimeout);
        
        if (error) {
          console.error('Session check error:', error);
          currentUserIdRef.current = null;
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
          return;
        }
        
        if (session?.user) {
          console.log('Session found for user:', session.user.email);
          
          // Try to get user profile, but don't fail if it doesn't exist
          try {
            let { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (!profile) {
              const fallbackName = session.user.user_metadata?.name || session.user.email!.split('@')[0];
              await ensureUserProfile(session.user.id, session.user.email!, fallbackName);
              const { data: retryProfile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              profile = retryProfile;
            }

            const user: User = profile
              ? {
                  id: profile.id,
                  email: profile.email,
                  name: profile.name,
                  avatar: profile.avatar_url,
                  plan: profile.plan
                }
              : {
                  id: session.user.id,
                  email: session.user.email!,
                  name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
                  plan: 'free'
                };

            currentUserIdRef.current = user.id;
            setAuthState({
              isAuthenticated: true,
              user,
              loading: false,
            });
            
            // Try to fetch credits, but don't fail if it doesn't work
            refreshCredits().catch(err => {
              console.warn('Failed to fetch credits:', err);
            });
            
          } catch (profileError) {
            console.warn('Profile loading failed, using basic auth data:', profileError);

            // Fallback to basic user data from auth
            const user: User = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
              plan: 'free'
            };

            currentUserIdRef.current = user.id;
            setAuthState({
              isAuthenticated: true,
              user,
              loading: false,
            });
          }
        } else {
          console.log('No session found');
          currentUserIdRef.current = null;
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) {
          clearTimeout(authTimeout);
          currentUserIdRef.current = null;
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        // Handle session events that should maintain authentication
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            // Skip state update on TOKEN_REFRESHED if user hasn't changed
            if (event === 'TOKEN_REFRESHED' && lastUserIdRef.current === session.user.id) {
              console.log('Token refreshed for same user, skipping state update');
              return;
            }

            console.log('User session active:', session.user.email, 'Event:', event);
            lastUserIdRef.current = session.user.id;
            currentUserIdRef.current = session.user.id;

            // Set auth state immediately with basic user data to avoid blocking
            const basicUser: User = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
              plan: 'free'
            };

            setAuthState({
              isAuthenticated: true,
              user: basicUser,
              loading: false,
            });

            (async () => {
              try {
                let { data: profile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();

                if (!profile) {
                  const fallbackName = session.user.user_metadata?.name || session.user.email!.split('@')[0];
                  await ensureUserProfile(session.user.id, session.user.email!, fallbackName);
                  const { data: retryProfile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();
                  profile = retryProfile;
                }

                if (profile) {
                  const user: User = {
                    id: profile.id,
                    email: profile.email,
                    name: profile.name,
                    avatar: profile.avatar_url,
                    plan: profile.plan
                  };

                  currentUserIdRef.current = user.id;
                  setAuthState({
                    isAuthenticated: true,
                    user,
                    loading: false,
                  });
                }

                if (event === 'SIGNED_IN') {
                  refreshCredits().catch(err => {
                    console.warn('Failed to fetch credits:', err);
                  });
                }
              } catch (error) {
                console.error('Error updating user profile:', error);
              }
            })();
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          lastUserIdRef.current = null;
          currentUserIdRef.current = null;
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
          setCredits(null);
        }
        // Ignore other events (USER_UPDATED, PASSWORD_RECOVERY, etc.) to prevent unnecessary resets
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext signIn called for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('Supabase signIn error:', error);
        throw new Error(error.message);
      }
      
      console.log('Supabase signIn successful:', data.user?.email);
      
    } catch (error) {
      console.error('SignIn function error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log('AuthContext signUp called for:', email);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim()
          }
        }
      });

      if (error) {
        console.error('Supabase signUp error:', error);
        throw new Error(error.message);
      }

      console.log('Supabase signUp successful:', data.user?.email);

      if (data.user) {
        await ensureUserProfile(data.user.id, data.user.email!, name.trim());
      }

    } catch (error) {
      console.error('SignUp function error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    try {
      await supabase.auth.signOut();
      setCredits(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      signIn,
      signUp,
      signOut,
      credits,
      refreshCredits,
    }}>
      {children}
    </AuthContext.Provider>
  );
};