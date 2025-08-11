export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      creators: {
        Row: {
          id: string
          creator_token: string
          creator_slug: string
          channel_name: string
          avatar_url: string | null
          channel_url: string | null
          platform: 'twitch' | 'youtube' | 'kick' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_token: string
          creator_slug: string
          channel_name: string
          avatar_url?: string | null
          channel_url?: string | null
          platform?: 'twitch' | 'youtube' | 'kick' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_token?: string
          creator_slug?: string
          channel_name?: string
          avatar_url?: string | null
          channel_url?: string | null
          platform?: 'twitch' | 'youtube' | 'kick' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      perks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          main_icon_url: string | null
          main_media_id: string | null
          name: string
          tier_level: number
          type_icon_url: string | null
          type_media_id: string | null
          vote_count: number
          weapon_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          main_icon_url?: string | null
          main_media_id?: string | null
          name: string
          tier_level: number
          type_icon_url?: string | null
          type_media_id?: string | null
          vote_count?: number
          weapon_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          main_icon_url?: string | null
          main_media_id?: string | null
          name?: string
          tier_level?: number
          type_icon_url?: string | null
          type_media_id?: string | null
          vote_count?: number
          weapon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perks_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perks_main_media_id_fkey"
            columns: ["main_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perks_type_media_id_fkey"
            columns: ["type_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      weapons: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          image_media_id: string | null
          name: string
          vocation: string | null
          weapon_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          image_media_id?: string | null
          name: string
          vocation?: string | null
          weapon_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          image_media_id?: string | null
          name?: string
          vocation?: string | null
          weapon_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weapons_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      media: {
        Row: {
          id: string
          source_url: string | null
          storage_path: string
          width: number | null
          height: number | null
          format: string | null
          bytes: number | null
          sha256: string // bytea represented as base64/hex string in generated types; using string
          attribution: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_url?: string | null
          storage_path: string
          width?: number | null
          height?: number | null
          format?: string | null
          bytes?: number | null
          sha256: string
          attribution?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source_url?: string | null
          storage_path?: string
          width?: number | null
          height?: number | null
          format?: string | null
          bytes?: number | null
          sha256?: string
          attribution?: string | null
          created_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          selected_perks: Json
          updated_at: string
          user_session: string
          weapon_id: string
          creator_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          selected_perks: Json
          updated_at?: string
          user_session: string
          weapon_id: string
          creator_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          selected_perks?: Json
          updated_at?: string
          user_session?: string
          weapon_id?: string
          creator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          }
        ]
      }
      builds: {
        Row: {
          id: string
          weapon_id: string
          name: string
          description: string | null
          situation_tags: string[] | null
          selected_perks: Json
          creator_id: string | null
          user_session: string | null
          vote_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          weapon_id: string
          name: string
          description?: string | null
          situation_tags?: string[] | null
          selected_perks: Json
          creator_id?: string | null
          user_session?: string | null
          vote_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          weapon_id?: string
          name?: string
          description?: string | null
          situation_tags?: string[] | null
          selected_perks?: Json
          creator_id?: string | null
          user_session?: string | null
          vote_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builds_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          }
        ]
      }
      build_votes: {
        Row: {
          id: string
          build_id: string
          user_session: string
          creator_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          build_id: string
          user_session: string
          creator_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          build_id?: string
          user_session?: string
          creator_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_votes_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_votes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      creator_stats: {
        Row: {
          id: string
          creator_slug: string
          channel_name: string
          avatar_url: string | null
          channel_url: string | null
          platform: 'twitch' | 'youtube' | 'kick' | null
          weapons_voted: number
          total_votes: number
          last_vote_at: string | null
        }
        Relationships: []
      }
      popular_builds: {
        Row: {
          id: string
          weapon_id: string
          name: string
          description: string | null
          situation_tags: string[] | null
          selected_perks: Json
          creator_id: string | null
          user_session: string | null
          vote_count: number
          created_at: string
          updated_at: string
          weapon_name: string
          weapon_type: string | null
          weapon_image_url: string | null
          creator_name: string | null
          creator_slug: string | null
          total_votes: number
        }
        Relationships: []
      }
      builds_by_situation: {
        Row: {
          situation_tag: string
          build_count: number
          avg_votes: number
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
