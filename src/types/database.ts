// Auto-generated from Supabase schema. Run `npm run generate-types` to refresh.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MoodType =
  | 'cozy'
  | 'happy'
  | 'reflective'
  | 'adventurous'
  | 'melancholic'
  | 'excited'
  | 'peaceful'
  | 'anxious'
  | 'grateful'
  | 'nostalgic';

export type RoomType =
  | 'bedroom'
  | 'studio'
  | 'loft'
  | 'treehouse'
  | 'rooftop'
  | 'basement'
  | 'cabin'
  | 'van';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Database {
  public: {
    Tables: {

      users: {
        Row: {
          id: string;
          phone_number: string | null;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          avatar_emoji: string | null;
          push_token: string | null;
          bio: string | null;
          birthday: string | null;
          room_type: RoomType;
          room_theme: Json;
          current_mood: MoodType | null;
          mood_updated_at: string | null;
          is_online: boolean;
          last_seen_at: string | null;
          invite_code: string;
          timezone: string;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']> & {
          id: string;
          username: string;
          room_type: RoomType;
          room_theme: Json;
        };
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };

      invite_codes: {
        Row: {
          id: string;
          code: string;
          created_by: string;
          used_by: string | null;
          used_at: string | null;
          use_count: number;
          max_uses: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['invite_codes']['Row']> & {
          code: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['invite_codes']['Row']>;
      };

      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: FriendshipStatus;
          friendship_level: number;
          xp_points: number;
          streak_days: number;
          last_interaction_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['friendships']['Row']> & {
          user_id: string;
          friend_id: string;
          status: FriendshipStatus;
        };
        Update: Partial<Database['public']['Tables']['friendships']['Row']>;
      };

      posts: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          thumbnail_url: string | null;
          storage_path: string;
          note: string | null;
          mood: MoodType | null;
          development_status: string;
          development_delay_mins: number;
          developed_at: string | null;
          reaction_counts: Json;
          view_count: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['posts']['Row']> & {
          user_id: string;
          image_url: string;
          storage_path: string;
        };
        Update: Partial<Database['public']['Tables']['posts']['Row']>;
      };

      post_recipients: {
        Row: {
          id: string;
          post_id: string;
          recipient_id: string;
          development_delay_mins: number;
          developed_at: string | null;
          viewed_at: string | null;
          reacted_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['post_recipients']['Row']> & {
          post_id: string;
          recipient_id: string;
        };
        Update: Partial<Database['public']['Tables']['post_recipients']['Row']>;
      };

      reactions: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['reactions']['Row']> & {
          post_id: string;
          user_id: string;
          emoji: string;
        };
        Update: never;
      };

      // ── Time Capsules ────────────────────────────────────────────────────────

      capsules: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          cover_emoji: string;
          unlock_type: string;
          unlock_at: string | null;
          milestone_label: string | null;
          is_opened: boolean;
          opened_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['capsules']['Row']> & {
          creator_id: string;
          title: string;
          unlock_type: string;
        };
        Update: Partial<Database['public']['Tables']['capsules']['Row']>;
      };

      capsule_members: {
        Row: {
          id: string;
          capsule_id: string;
          user_id: string;
          has_submitted: boolean;
          joined_at: string;
        };
        Insert: Partial<Database['public']['Tables']['capsule_members']['Row']> & {
          capsule_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['capsule_members']['Row']>;
      };

      capsule_submissions: {
        Row: {
          id: string;
          capsule_id: string;
          user_id: string;
          image_url: string | null;
          thumbnail_url: string | null;
          storage_path: string | null;
          note: string | null;
          submitted_at: string;
        };
        Insert: Partial<Database['public']['Tables']['capsule_submissions']['Row']> & {
          capsule_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['capsule_submissions']['Row']>;
      };

      // ── Scrapbooks ───────────────────────────────────────────────────────────

      scrapbooks: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          cover_emoji: string;
          description: string | null;
          is_finished: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['scrapbooks']['Row']> & {
          creator_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['scrapbooks']['Row']>;
      };

      scrapbook_members: {
        Row: {
          id: string;
          scrapbook_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Partial<Database['public']['Tables']['scrapbook_members']['Row']> & {
          scrapbook_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['scrapbook_members']['Row']>;
      };

      scrapbook_pages: {
        Row: {
          id: string;
          scrapbook_id: string;
          page_number: number;
          layout: string;
          title: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['scrapbook_pages']['Row']> & {
          scrapbook_id: string;
          page_number: number;
        };
        Update: Partial<Database['public']['Tables']['scrapbook_pages']['Row']>;
      };

      scrapbook_items: {
        Row: {
          id: string;
          page_id: string;
          scrapbook_id: string;
          creator_id: string;
          image_url: string | null;
          thumbnail_url: string | null;
          storage_path: string | null;
          note: string | null;
          pos_x: number;
          pos_y: number;
          rotation: number;
          scale: number;
          order_index: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['scrapbook_items']['Row']> & {
          page_id: string;
          scrapbook_id: string;
          creator_id: string;
        };
        Update: Partial<Database['public']['Tables']['scrapbook_items']['Row']>;
      };

      // ── Cork Boards ──────────────────────────────────────────────────────────

      cork_boards: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          cover_emoji: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['cork_boards']['Row']> & {
          creator_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['cork_boards']['Row']>;
      };

      cork_board_members: {
        Row: {
          id: string;
          board_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Partial<Database['public']['Tables']['cork_board_members']['Row']> & {
          board_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['cork_board_members']['Row']>;
      };

      cork_board_items: {
        Row: {
          id: string;
          board_id: string;
          creator_id: string;
          type: string;
          image_url: string | null;
          thumbnail_url: string | null;
          storage_path: string | null;
          note_text: string | null;
          sticker_id: string | null;
          color: string;
          pos_x: number;
          pos_y: number;
          rotation: number;
          z_index: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['cork_board_items']['Row']> & {
          board_id: string;
          creator_id: string;
          type: string;
        };
        Update: Partial<Database['public']['Tables']['cork_board_items']['Row']>;
      };

      // ── Camera Passes ────────────────────────────────────────────────────────

      camera_passes: {
        Row: {
          id: string;
          creator_id: string;
          title: string | null;
          is_complete: boolean;
          current_holder_id: string | null;
          time_limit_hours: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['camera_passes']['Row']> & {
          creator_id: string;
        };
        Update: Partial<Database['public']['Tables']['camera_passes']['Row']>;
      };

      pass_participants: {
        Row: {
          id: string;
          pass_id: string;
          user_id: string;
          order_index: number;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['pass_participants']['Row']> & {
          pass_id: string;
          user_id: string;
          order_index: number;
        };
        Update: Partial<Database['public']['Tables']['pass_participants']['Row']>;
      };

      pass_shots: {
        Row: {
          id: string;
          pass_id: string;
          photographer_id: string;
          image_url: string | null;
          thumbnail_url: string | null;
          storage_path: string;
          note: string | null;
          order_index: number;
          taken_at: string;
        };
        Insert: Partial<Database['public']['Tables']['pass_shots']['Row']> & {
          pass_id: string;
          photographer_id: string;
          storage_path: string;
          order_index: number;
        };
        Update: Partial<Database['public']['Tables']['pass_shots']['Row']>;
      };

      // ── Desk Drops ───────────────────────────────────────────────────────────

      desk_drops: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          image_url: string | null;
          thumbnail_url: string | null;
          storage_path: string | null;
          note: string | null;
          is_discovered: boolean;
          discovered_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['desk_drops']['Row']> & {
          sender_id: string;
          recipient_id: string;
        };
        Update: Partial<Database['public']['Tables']['desk_drops']['Row']>;
      };

    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      mood_type: MoodType;
      room_type: RoomType;
      friendship_status: FriendshipStatus;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
