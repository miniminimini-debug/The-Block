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

export type JourneyType = 'geographic' | 'temporal' | 'emotional' | 'curated' | 'shared';

export type NarrativeRole = 'opening' | 'turning_point' | 'climax' | 'reflection';

export type InsightType = 'pattern' | 'growth' | 'recurring_place' | 'mood_arc';

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
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at' | 'invite_code'> & {
          id?: string;
          invite_code?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };

      posts: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          caption: string | null;
          mood: MoodType | null;
          latitude: number | null;
          longitude: number | null;
          location_name: string | null;
          weather_condition: string | null;
          temperature_c: number | null;
          is_ghost: boolean;
          ghost_expires_at: string | null;
          visible_to: string[];
          circle_visibility: string;
          reaction_counts: Json;
          view_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'id' | 'created_at' | 'reaction_counts' | 'view_count'>;
        Update: Partial<Database['public']['Tables']['posts']['Insert']>;
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
          circle_label: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['friendships']['Row'], 'id' | 'created_at' | 'updated_at' | 'friendship_level' | 'xp_points' | 'streak_days'>;
        Update: Partial<Database['public']['Tables']['friendships']['Insert']>;
      };

      reactions: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reactions']['Row'], 'id' | 'created_at'>;
        Update: never;
      };

      room_visits: {
        Row: {
          id: string;
          visitor_id: string;
          host_id: string;
          visited_at: string;
          duration_seconds: number | null;
        };
        Insert: Omit<Database['public']['Tables']['room_visits']['Row'], 'id'>;
        Update: never;
      };

      photo_journeys: {
        Row: {
          id: string;
          user_id: string;
          journey_type: JourneyType;
          title: string;
          description: string | null;
          cover_photo_id: string | null;
          start_date: string;
          end_date: string;
          season: string | null;
          month: number | null;
          year: number | null;
          dominant_mood: MoodType | null;
          emotional_arc: Json | null;
          mood_distribution: Json | null;
          geographic_bounds: Json | null;
          primary_location: string | null;
          distance_miles: number | null;
          shared_with_user_ids: string[];
          overlapping_moments: number;
          generated_by: string;
          photo_count: number;
          day_count: number;
          is_public: boolean;
          shared_with_friends: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['photo_journeys']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['photo_journeys']['Insert']>;
      };

      daily_prompts: {
        Row: {
          id: string;
          prompt_text: string;
          category: string;
          mood_tags: string[];
          season: string | null;
          active_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_prompts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['daily_prompts']['Insert']>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };

    Views: {
      friend_rooms: {
        Row: {
          friend_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          room_type: RoomType;
          room_theme: Json;
          current_mood: MoodType | null;
          is_online: boolean;
          last_seen_at: string | null;
          latest_post_at: string | null;
          has_new_post: boolean;
          friendship_level: number;
        };
      };
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
        Insert: Omit<Database['public']['Tables']['invite_codes']['Row'], 'id' | 'created_at' | 'use_count'>;
        Update: Partial<Database['public']['Tables']['invite_codes']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['post_recipients']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['post_recipients']['Insert']>;
      };
    };

    Functions: {
      validate_invite_code: {
        Args: { code: string };
        Returns: { valid: boolean; owner_id: string | null };
      };
      get_neighborhood: {
        Args: { user_id: string };
        Returns: Database['public']['Views']['friend_rooms']['Row'][];
      };
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
