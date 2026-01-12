export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      game_actions: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          day_number: number
          id: string
          phase: Database["public"]["Enums"]["game_phase"]
          result: string | null
          room_id: string
          target_id: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          day_number: number
          id?: string
          phase: Database["public"]["Enums"]["game_phase"]
          result?: string | null
          room_id: string
          target_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          day_number?: number
          id?: string
          phase?: Database["public"]["Enums"]["game_phase"]
          result?: string | null
          room_id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      game_state: {
        Row: {
          created_at: string
          day_number: number
          detective_result: string | null
          detective_target_id: string | null
          doctor_target_id: string | null
          id: string
          last_detective_target_name: string | null
          last_doctor_target_name: string | null
          last_mafia_target_name: string | null
          mafia_target_id: string | null
          phase: Database["public"]["Enums"]["game_phase"]
          phase_end_time: string | null
          room_id: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          day_number?: number
          detective_result?: string | null
          detective_target_id?: string | null
          doctor_target_id?: string | null
          id?: string
          last_detective_target_name?: string | null
          last_doctor_target_name?: string | null
          last_mafia_target_name?: string | null
          mafia_target_id?: string | null
          phase?: Database["public"]["Enums"]["game_phase"]
          phase_end_time?: string | null
          room_id: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          detective_result?: string | null
          detective_target_id?: string | null
          doctor_target_id?: string | null
          id?: string
          last_detective_target_name?: string | null
          last_doctor_target_name?: string | null
          last_mafia_target_name?: string | null
          mafia_target_id?: string | null
          phase?: Database["public"]["Enums"]["game_phase"]
          phase_end_time?: string | null
          room_id?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_state_detective_target_id_fkey"
            columns: ["detective_target_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_detective_target_id_fkey"
            columns: ["detective_target_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_doctor_target_id_fkey"
            columns: ["doctor_target_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_doctor_target_id_fkey"
            columns: ["doctor_target_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_mafia_target_id_fkey"
            columns: ["mafia_target_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_mafia_target_id_fkey"
            columns: ["mafia_target_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      kicked_players: {
        Row: {
          id: string
          kicked_at: string
          player_id: string
          room_id: string
        }
        Insert: {
          id?: string
          kicked_at?: string
          player_id: string
          room_id: string
        }
        Update: {
          id?: string
          kicked_at?: string
          player_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kicked_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kicked_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_mafia_only: boolean
          is_system: boolean
          player_id: string | null
          role_type: string | null
          room_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_mafia_only?: boolean
          is_system?: boolean
          player_id?: string | null
          role_type?: string | null
          room_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_mafia_only?: boolean
          is_system?: boolean
          player_id?: string | null
          role_type?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          browser_id: string
          correct_investigations: number
          created_at: string
          games_played: number
          games_won: number
          games_won_as_civilian: number
          games_won_as_mafia: number
          id: string
          nickname: string
          profile_id: string | null
          total_kills: number
          total_saves: number
          updated_at: string
          visittotal_investigations: number
        }
        Insert: {
          browser_id: string
          correct_investigations?: number
          created_at?: string
          games_played?: number
          games_won?: number
          games_won_as_civilian?: number
          games_won_as_mafia?: number
          id?: string
          nickname?: string
          profile_id?: string | null
          total_kills?: number
          total_saves?: number
          updated_at?: string
          visittotal_investigations?: number
        }
        Update: {
          browser_id?: string
          correct_investigations?: number
          created_at?: string
          games_played?: number
          games_won?: number
          games_won_as_civilian?: number
          games_won_as_mafia?: number
          id?: string
          nickname?: string
          profile_id?: string | null
          total_kills?: number
          total_saves?: number
          updated_at?: string
          visittotal_investigations?: number
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          correct_investigations: number
          created_at: string
          display_name: string | null
          email: string | null
          games_played: number
          games_won: number
          games_won_as_civilian: number
          games_won_as_mafia: number
          id: string
          is_premium: boolean
          total_investigations: number
          total_kills: number
          total_saves: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          correct_investigations?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          games_played?: number
          games_won?: number
          games_won_as_civilian?: number
          games_won_as_mafia?: number
          id?: string
          is_premium?: boolean
          total_investigations?: number
          total_kills?: number
          total_saves?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          correct_investigations?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          games_played?: number
          games_won?: number
          games_won_as_civilian?: number
          games_won_as_mafia?: number
          id?: string
          is_premium?: boolean
          total_investigations?: number
          total_kills?: number
          total_saves?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          is_alive: boolean
          is_ready: boolean
          joined_at: string
          kicked: boolean
          player_id: string
          role: Database["public"]["Enums"]["role_type"] | null
          room_id: string
        }
        Insert: {
          id?: string
          is_alive?: boolean
          is_ready?: boolean
          joined_at?: string
          kicked?: boolean
          player_id: string
          role?: Database["public"]["Enums"]["role_type"] | null
          room_id: string
        }
        Update: {
          id?: string
          is_alive?: boolean
          is_ready?: boolean
          joined_at?: string
          kicked?: boolean
          player_id?: string
          role?: Database["public"]["Enums"]["role_type"] | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          day_duration: number | null
          detective_count: number
          doctor_count: number
          host_id: string | null
          id: string
          mafia_count: number
          max_players: number
          min_players: number
          night_duration: number | null
          night_mode: string
          reveal_roles_on_death: boolean
          show_vote_counts: boolean
          status: string
          updated_at: string
          voting_duration: number | null
        }
        Insert: {
          code: string
          created_at?: string
          day_duration?: number | null
          detective_count?: number
          doctor_count?: number
          host_id?: string | null
          id?: string
          mafia_count?: number
          max_players?: number
          min_players?: number
          night_duration?: number | null
          night_mode?: string
          reveal_roles_on_death?: boolean
          show_vote_counts?: boolean
          status?: string
          updated_at?: string
          voting_duration?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          day_duration?: number | null
          detective_count?: number
          doctor_count?: number
          host_id?: string | null
          id?: string
          mafia_count?: number
          max_players?: number
          min_players?: number
          night_duration?: number | null
          night_mode?: string
          reveal_roles_on_death?: boolean
          show_vote_counts?: boolean
          status?: string
          updated_at?: string
          voting_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          day_number: number
          id: string
          room_id: string
          target_id: string | null
          voter_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          room_id: string
          target_id?: string | null
          voter_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          room_id?: string
          target_id?: string | null
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "room_players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      game_state_safe: {
        Row: {
          created_at: string | null
          day_number: number | null
          id: string | null
          last_detective_target_name: string | null
          last_doctor_target_name: string | null
          last_mafia_target_name: string | null
          phase: Database["public"]["Enums"]["game_phase"] | null
          phase_end_time: string | null
          room_id: string | null
          updated_at: string | null
          winner: string | null
        }
        Insert: {
          created_at?: string | null
          day_number?: number | null
          id?: string | null
          last_detective_target_name?: never
          last_doctor_target_name?: never
          last_mafia_target_name?: never
          phase?: Database["public"]["Enums"]["game_phase"] | null
          phase_end_time?: string | null
          room_id?: string | null
          updated_at?: string | null
          winner?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number | null
          id?: string | null
          last_detective_target_name?: never
          last_doctor_target_name?: never
          last_mafia_target_name?: never
          phase?: Database["public"]["Enums"]["game_phase"] | null
          phase_end_time?: string | null
          room_id?: string | null
          updated_at?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players_safe: {
        Row: {
          id: string | null
          is_alive: boolean | null
          is_ready: boolean | null
          joined_at: string | null
          kicked: boolean | null
          player_id: string | null
          role: Database["public"]["Enums"]["role_type"] | null
          room_id: string | null
        }
        Insert: {
          id?: string | null
          is_alive?: boolean | null
          is_ready?: boolean | null
          joined_at?: string | null
          kicked?: boolean | null
          player_id?: string | null
          role?: never
          room_id?: string | null
        }
        Update: {
          id?: string | null
          is_alive?: boolean | null
          is_ready?: boolean | null
          joined_at?: string | null
          kicked?: boolean | null
          player_id?: string | null
          role?: never
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_idle_rooms: { Args: { p_idle_minutes?: number }; Returns: number }
      get_mafia_partners: {
        Args: { p_player_id: string; p_room_id: string }
        Returns: {
          nickname: string
          partner_player_id: string
          room_player_id: string
        }[]
      }
      get_own_role: {
        Args: { p_player_id: string; p_room_id: string }
        Returns: string
      }
      kick_player: {
        Args: {
          p_host_player_id: string
          p_room_id: string
          p_target_room_player_id: string
        }
        Returns: boolean
      }
      restart_game: {
        Args: { p_host_player_id: string; p_room_id: string }
        Returns: boolean
      }
      start_game: {
        Args: { p_host_player_id: string; p_room_id: string }
        Returns: boolean
      }
      update_room_config:
        | {
            Args: {
              p_day_duration?: number
              p_detective_count?: number
              p_doctor_count?: number
              p_host_player_id: string
              p_mafia_count?: number
              p_night_duration?: number
              p_night_mode?: string
              p_reveal_roles_on_death?: boolean
              p_room_id: string
              p_show_vote_counts?: boolean
              p_voting_duration?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_day_duration?: number
              p_detective_count?: number
              p_doctor_count?: number
              p_host_player_id: string
              p_mafia_count?: number
              p_night_duration?: number
              p_night_mode?: string
              p_reveal_roles_on_death?: boolean
              p_room_id: string
              p_show_vote_counts?: boolean
            }
            Returns: boolean
          }
    }
    Enums: {
      game_phase:
        | "lobby"
        | "night"
        | "day_discussion"
        | "day_voting"
        | "game_over"
      role_type: "mafia" | "detective" | "doctor" | "civilian"
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
    Enums: {
      game_phase: [
        "lobby",
        "night",
        "day_discussion",
        "day_voting",
        "game_over",
      ],
      role_type: ["mafia", "detective", "doctor", "civilian"],
    },
  },
} as const
