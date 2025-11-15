import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  ic_number: string | null;
  nationality: string | null;
  phone_number: string | null;
  created_at: string;
}

interface InvitationData {
  id: string;
  email: string;
  resort_id: string;
  role: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string,
    icNumber: string,
    nationality: string,
    phoneNumber: string,
    invitation?: InvitationData | null
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (usernameOrEmail: string, password: string) => {
    let email = usernameOrEmail;

    if (!usernameOrEmail.includes('@')) {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', usernameOrEmail)
        .maybeSingle();

      if (profileError || !profileData) {
        throw new Error('Invalid username or password');
      }

      const { data: userData, error: userError } = await supabase
        .rpc('get_user_email_by_id', { user_id: profileData.id })
        .maybeSingle();

      if (userError || !userData) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profileData.id);
        if (authUser?.user?.email) {
          email = authUser.user.email;
        } else {
          throw new Error('Invalid username or password');
        }
      } else {
        email = userData.email;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    fullName: string,
    icNumber: string,
    nationality: string,
    phoneNumber: string,
    invitation?: InvitationData | null
  ) => {
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingProfile) {
      throw new Error('Username already taken');
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          username: username,
          full_name: fullName,
          ic_number: icNumber || null,
          nationality: nationality || null,
          phone_number: phoneNumber || null,
        });

      if (profileError) throw profileError;

      if (invitation) {
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: data.user.id,
          resort_id: invitation.resort_id,
          role: invitation.role,
          created_by: invitation.id,
        });

        if (roleError) {
          console.error('Error creating user role:', roleError);
        }

        const { error: updateError } = await supabase
          .from('user_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);

        if (updateError) {
          console.error('Error updating invitation:', updateError);
        }
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
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
