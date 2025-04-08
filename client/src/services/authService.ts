import { createClient } from '@supabase/supabase-js';
import tokenService from './tokenService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name?: string;
}

// Login
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Store the access token
  if (data.session?.access_token) {
    tokenService.setToken(data.session.access_token);
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      role: profile?.role || 'user',
      name: profile?.name
    },
    session: data.session
  };
};

// Get current user
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    tokenService.removeToken();
    return null;
  }

  // Update stored token if it exists
  if (session.access_token) {
    tokenService.setToken(session.access_token);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, name, company_name')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return {
      id: session.user.id,
      email: session.user.email!,
      role: 'user',
      name: null
    };
  }

  return {
    id: session.user.id,
    email: profile.email || session.user.email!,
    role: 'user',
    name: profile.name
  };
};

// Update profile
export const updateProfile = async (data: { name?: string; email?: string }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return profile;
};

// Change password
export const changePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
  return true;
};

// Logout
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  tokenService.removeToken();
  if (error) throw error;
};

// Get access token
export const getAccessToken = async () => {
  // First try to get token from tokenService
  const storedToken = tokenService.getToken();
  if (storedToken && !tokenService.isTokenExpired()) {
    return storedToken;
  }

  // If no valid token in storage, try to get from session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    tokenService.setToken(session.access_token);
    return session.access_token;
  }

  return null;
};
