import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const refreshCredits = async () => {
    if (!authState.user) {
      setCredits(null);
      return;
    }

    try {
      const userCredits = await databaseService.getUserCredits(authState.user.id);
      setCredits(userCredits);
    } catch (error) {
      console.error('Failed to fetch user credits:', error);
      setCredits(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      console.log('Starting auth check...');
      
      // Set a timeout to prevent infinite loading
      const authTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth check timed out after 5 seconds, proceeding without auth');
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
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.warn('Profile fetch error (this is normal for new users):', profileError);
              // For now, just use the auth user data
              const user: User = {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
                plan: 'free'
              };

              setAuthState({
                isAuthenticated: true,
                user,
                loading: false,
              });
              return;
            }

            const user: User = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              avatar: profile.avatar_url,
              plan: profile.plan
            };

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

            setAuthState({
              isAuthenticated: true,
              user,
              loading: false,
            });
          }
        } else {
          console.log('No session found');
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
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          
          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
            plan: 'free'
          };

          setAuthState({
            isAuthenticated: true,
            user,
            loading: false,
          });
          
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
          setCredits(null);
        }
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
      
      // Note: User profile creation will be handled by the auth state change listener
      
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