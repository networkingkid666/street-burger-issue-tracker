import { createClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Issue, User, UserRole, IssueStatus, IssuePriority } from '../types';

// Supabase Configuration
const SUPABASE_URL = 'https://yvyygolgwrmmwdovdlsb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eXlnb2xnd3JtbXdkb3ZkbHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDcxMTUsImV4cCI6MjA4MDgyMzExNX0.4729ErMNv6S_1zcHm2gFjDg6GvywVLYtt34USHyIxAo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to map DB row to Issue type with safety checks
const mapIssue = (row: any): Issue => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: (row.status?.toUpperCase() as IssueStatus) || IssueStatus.OPEN,
  priority: (row.priority?.toUpperCase() as IssuePriority) || IssuePriority.MEDIUM,
  category: row.category,
  subCategory: row.sub_category,
  place: row.place || 'Outlet',
  reportedBy: row.reported_by,
  reportedByName: row.reported_by_name || 'Unknown',
  assignedTo: row.assigned_to,
  assignedToName: row.assigned_to_name,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  comments: row.comments || [],
  attachments: row.attachments || [],
  location: row.location,
  aiAnalysis: row.ai_analysis
});

// Helper to map Profile row to User type with safety checks
const mapProfile = (row: any): User => ({
  id: row.id,
  email: row.email,
  name: row.full_name || 'User',
  role: (row.role?.toUpperCase() as UserRole) || UserRole.STAFF,
  avatar: row.avatar_url
});

// Centralized error handler
const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  if (error?.code === 'PGRST205') {
    throw new Error("Database setup incomplete. The 'issues' table is missing. Please run the SQL setup script.");
  }
  if (error?.code === '42P17') {
    throw new Error("Database configuration error. Infinite recursion in policies detected. Please run the SQL fix script.");
  }
  if (error?.message) {
    throw new Error(error.message);
  }
  throw new Error("An unexpected database error occurred.");
};

export const StorageService = {
  // Subscribe to Auth Events (Login, Logout, Password Recovery)
  onAuthChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data.subscription;
  },

  // Authentication
  signUp: async (email: string, password: string, name: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
          avatar_url: `https://ui-avatars.com/api/?name=${name}&background=random`
        }
      }
    });
    if (error) handleSupabaseError(error, 'signUp');
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) handleSupabaseError(error, 'signIn');
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Use maybeSingle() to avoid errors if the profile doesn't exist yet
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
       // Log but don't crash, fallback to metadata
       console.warn("Profile fetch warning (falling back to metadata):", error);
    }

    if (profile) {
      return mapProfile(profile);
    }

    // Fallback to metadata if profile table entry is missing or fetch failed
    const metadata = session.user.user_metadata;
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: metadata.full_name || 'User',
      role: (metadata.role?.toUpperCase() as UserRole) || UserRole.STAFF,
      avatar: metadata.avatar_url
    };
  },

  updateProfile: async (userId: string, updates: { name?: string; avatar?: string }) => {
    // 1. Update the public 'profiles' table
    const payload: any = {};
    if (updates.name) payload.full_name = updates.name;
    if (updates.avatar) payload.avatar_url = updates.avatar;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) handleSupabaseError(error, 'updateProfile');

    // 2. Ideally, we also update Supabase Auth User Metadata so the session stays fresh
    // Note: Only the user themselves can update their own metadata
    if (updates.name || updates.avatar) {
      await supabase.auth.updateUser({
        data: {
          full_name: updates.name,
          avatar_url: updates.avatar
        }
      });
    }
  },

  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) handleSupabaseError(error, 'updatePassword');
  },

  // User Management (Admin)
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (error) {
      handleSupabaseError(error, 'getUsers');
      return [];
    }
    return data.map(mapProfile);
  },

  createUserAsAdmin: async (email: string, password: string, name: string, role: UserRole) => {
    // Create a temporary client with no persistence to avoid logging out the current admin
    const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    
    const { data, error } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
          avatar_url: `https://ui-avatars.com/api/?name=${name}&background=random`
        }
      }
    });

    if (error) handleSupabaseError(error, 'createUserAsAdmin');
    return data;
  },

  updateUserRole: async (userId: string, newRole: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) handleSupabaseError(error, 'updateUserRole');
  },
  
  // Directly updates user password via Database RPC (Requires SQL function setup)
  adminUpdateUserPassword: async (userId: string, newPassword: string) => {
    const { error } = await supabase.rpc('admin_reset_password', {
      target_user_id: userId,
      new_password: newPassword
    });

    if (error) {
      if (error.code === '42883') {
         throw new Error("Missing SQL Function. Please run the 'admin_reset_password' SQL script.");
      }
      handleSupabaseError(error, 'adminUpdateUserPassword');
    }
  },

  // Securely delete user from Auth and Profiles via RPC
  deleteUser: async (userId: string) => {
    const { error } = await supabase.rpc('delete_user', {
      target_user_id: userId
    });

    if (error) {
      if (error.code === '42883') {
         throw new Error("Missing SQL Function. Please run the 'delete_user' SQL script in Supabase.");
      }
      handleSupabaseError(error, 'deleteUser');
    }
  },

  // Issues
  getIssues: async (): Promise<Issue[]> => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      handleSupabaseError(error, 'getIssues');
      return [];
    }
    return data.map(mapIssue);
  },

  getIssueById: async (id: string): Promise<Issue | null> => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      handleSupabaseError(error, 'getIssueById');
      return null;
    }
    if (!data) return null;
    return mapIssue(data);
  },

  saveIssue: async (issue: Partial<Issue>): Promise<void> => {
    const dbPayload: any = {
        updated_at: new Date().toISOString()
    };

    if (issue.title !== undefined) dbPayload.title = issue.title;
    if (issue.description !== undefined) dbPayload.description = issue.description;
    if (issue.status !== undefined) dbPayload.status = issue.status;
    if (issue.priority !== undefined) dbPayload.priority = issue.priority;
    if (issue.category !== undefined) dbPayload.category = issue.category;
    if (issue.subCategory !== undefined) dbPayload.sub_category = issue.subCategory;
    if (issue.place !== undefined) dbPayload.place = issue.place;
    if (issue.location !== undefined) dbPayload.location = issue.location;
    if (issue.comments !== undefined) dbPayload.comments = issue.comments;
    if (issue.attachments !== undefined) dbPayload.attachments = issue.attachments;
    if (issue.aiAnalysis !== undefined) dbPayload.ai_analysis = issue.aiAnalysis;
    if (issue.assignedTo !== undefined) dbPayload.assigned_to = issue.assignedTo;
    if (issue.assignedToName !== undefined) dbPayload.assigned_to_name = issue.assignedToName;
    if (issue.reportedBy !== undefined) dbPayload.reported_by = issue.reportedBy;
    if (issue.reportedByName !== undefined) dbPayload.reported_by_name = issue.reportedByName;

    if (issue.id) {
       const { error } = await supabase
         .from('issues')
         .update(dbPayload)
         .eq('id', issue.id);
       if (error) handleSupabaseError(error, 'saveIssue (update)');
    } else {
      dbPayload.created_at = new Date().toISOString();
      const { error } = await supabase
        .from('issues')
        .insert(dbPayload);
      if (error) handleSupabaseError(error, 'saveIssue (insert)');
    }
  },

  deleteIssue: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id);
    if (error) handleSupabaseError(error, 'deleteIssue');
  },
  
  generateId: (): string => crypto.randomUUID()
};