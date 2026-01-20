import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export supabaseUrl for use in other modules
export { supabaseUrl };

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '[PRESENT]' : '[MISSING]'
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'dj-blender-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test connection on initialization
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error);
  } else {
    console.log('Supabase connection successful:', {
      hasSession: !!data.session,
      user: data.session?.user?.email
    });
  }
}).catch(err => {
  console.error('Supabase connection error:', err);
});

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          plan: 'free' | 'pro' | 'premium' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          plan?: 'free' | 'pro' | 'premium' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          plan?: 'free' | 'pro' | 'premium' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          original_name: string;
          mime_type: string;
          size: number;
          url: string;
          status: 'uploading' | 'processing' | 'ready' | 'error';
          analysis: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          original_name: string;
          mime_type: string;
          size: number;
          url: string;
          status?: 'uploading' | 'processing' | 'ready' | 'error';
          analysis?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          original_name?: string;
          mime_type?: string;
          size?: number;
          url?: string;
          status?: 'uploading' | 'processing' | 'ready' | 'error';
          analysis?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_placements: {
        Row: {
          id: string;
          project_id: string;
          template_id: string;
          start_time: number;
          track_a_start: number;
          track_a_end: number;
          track_b_start: number;
          track_b_end: number;
          parameter_overrides: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          template_id: string;
          start_time: number;
          track_a_start: number;
          track_a_end: number;
          track_b_start: number;
          track_b_end: number;
          parameter_overrides?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          template_id?: string;
          start_time?: number;
          track_a_start?: number;
          track_a_end?: number;
          track_b_start?: number;
          track_b_end?: number;
          parameter_overrides?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: string;
          thumbnail_url: string;
          duration: number;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          is_popular: boolean;
          is_premium: boolean;
          author: string;
          downloads: number;
          rating: number;
          template_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          category: string;
          thumbnail_url: string;
          duration: number;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          is_popular?: boolean;
          is_premium?: boolean;
          author: string;
          downloads?: number;
          rating?: number;
          template_data?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: string;
          thumbnail_url?: string;
          duration?: number;
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          is_popular?: boolean;
          is_premium?: boolean;
          author?: string;
          downloads?: number;
          rating?: number;
          template_data?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          thumbnail_url: string | null;
          duration: number;
          bpm: number;
          status: 'draft' | 'processing' | 'completed' | 'error';
          template_id: string | null;
          track1_upload_id: string | null;
          track1_name: string | null;
          track1_url: string | null;
          track2_upload_id: string | null;
          track2_name: string | null;
          track2_url: string | null;
          project_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          thumbnail_url?: string | null;
          duration?: number;
          bpm?: number;
          status?: 'draft' | 'processing' | 'completed' | 'error';
          template_id?: string | null;
          track1_upload_id?: string | null;
          track1_name?: string | null;
          track1_url?: string | null;
          track2_upload_id?: string | null;
          track2_name?: string | null;
          track2_url?: string | null;
          project_data?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          duration?: number;
          bpm?: number;
          status?: 'draft' | 'processing' | 'completed' | 'error';
          template_id?: string | null;
          track1_upload_id?: string | null;
          track1_name?: string | null;
          track1_url?: string | null;
          track2_upload_id?: string | null;
          track2_name?: string | null;
          track2_url?: string | null;
          project_data?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_favorites: {
        Row: {
          id: string;
          user_id: string;
          template_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string;
          created_at?: string;
        };
      };
    };
  };
}