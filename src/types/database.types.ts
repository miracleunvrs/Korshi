export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      access_events: {
        Row: {
          checkpoint: string
          complex_id: string
          direction: string
          id: string
          occurred_at: string
          pass_id: string | null
          provider_event_id: string | null
          result: string
          subject: string
        }
        Insert: {
          checkpoint: string
          complex_id: string
          direction: string
          id?: string
          occurred_at?: string
          pass_id?: string | null
          provider_event_id?: string | null
          result: string
          subject: string
        }
        Update: {
          checkpoint?: string
          complex_id?: string
          direction?: string
          id?: string
          occurred_at?: string
          pass_id?: string | null
          provider_event_id?: string | null
          result?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_events_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "access_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      access_integration_commands: {
        Row: {
          command: string
          completed_at: string | null
          complex_id: string
          created_at: string
          device_id: string
          id: string
          provider: string
          provider_response: Json | null
          requested_by: string
          status: string
        }
        Insert: {
          command: string
          completed_at?: string | null
          complex_id?: string
          created_at?: string
          device_id: string
          id?: string
          provider: string
          provider_response?: Json | null
          requested_by?: string
          status?: string
        }
        Update: {
          command?: string
          completed_at?: string | null
          complex_id?: string
          created_at?: string
          device_id?: string
          id?: string
          provider?: string
          provider_response?: Json | null
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_integration_commands_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_integration_commands_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      access_lists: {
        Row: {
          complex_id: string
          created_at: string
          created_by: string
          id: string
          list_type: string
          reason: string | null
          subject_type: string
          subject_value: string
          valid_until: string | null
        }
        Insert: {
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          list_type: string
          reason?: string | null
          subject_type: string
          subject_value: string
          valid_until?: string | null
        }
        Update: {
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          list_type?: string
          reason?: string | null
          subject_type?: string
          subject_value?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_lists_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      access_passes: {
        Row: {
          access_code: string
          complex_id: string
          created_at: string
          guest_name: string
          id: string
          kind: string
          max_uses: number | null
          resident_id: string
          revoked_at: string | null
          status: string
          token_hash: string
          used_count: number
          valid_from: string
          valid_until: string
          vehicle_plate: string | null
        }
        Insert: {
          access_code?: string
          complex_id?: string
          created_at?: string
          guest_name: string
          id?: string
          kind: string
          max_uses?: number | null
          resident_id?: string
          revoked_at?: string | null
          status?: string
          token_hash?: string
          used_count?: number
          valid_from?: string
          valid_until: string
          vehicle_plate?: string | null
        }
        Update: {
          access_code?: string
          complex_id?: string
          created_at?: string
          guest_name?: string
          id?: string
          kind?: string
          max_uses?: number | null
          resident_id?: string
          revoked_at?: string | null
          status?: string
          token_hash?: string
          used_count?: number
          valid_from?: string
          valid_until?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_passes_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_passes_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          complex_id: string | null
          created_at: string
          id: number
          ip_hash: string | null
          new_data: Json | null
          old_data: Json | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          complex_id?: string | null
          created_at?: string
          id?: never
          ip_hash?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          complex_id?: string | null
          created_at?: string
          id?: never
          ip_hash?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feature: string
          helpful: boolean
          id: string
          job_id: string | null
          response_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feature: string
          helpful: boolean
          id?: string
          job_id?: string | null
          response_id?: string | null
          user_id?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feature?: string
          helpful?: boolean
          id?: string
          job_id?: string | null
          response_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          completed_at: string | null
          complex_id: string
          created_at: string
          error_code: string | null
          feature: string
          human_review_required: boolean
          id: string
          input_hash: string
          provider_response_id: string | null
          result: Json | null
          source_ids: string[]
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          complex_id?: string
          created_at?: string
          error_code?: string | null
          feature: string
          human_review_required?: boolean
          id?: string
          input_hash: string
          provider_response_id?: string | null
          result?: Json | null
          source_ids?: string[]
          status?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          complex_id?: string
          created_at?: string
          error_code?: string | null
          feature?: string
          human_review_required?: boolean
          id?: string
          input_hash?: string
          provider_response_id?: string | null
          result?: Json | null
          source_ids?: string[]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      amenity_bookings: {
        Row: {
          approval_status: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          ends_at: string
          id: string
          payment_status: string
          provider_payment_id: string | null
          reminder_sent_at: string | null
          resource_id: string
          starts_at: string
          status: Database["public"]["Enums"]["amenity_booking_status"]
          user_id: string
        }
        Insert: {
          approval_status?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at: string
          id?: string
          payment_status?: string
          provider_payment_id?: string | null
          reminder_sent_at?: string | null
          resource_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["amenity_booking_status"]
          user_id: string
        }
        Update: {
          approval_status?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          payment_status?: string
          provider_payment_id?: string | null
          reminder_sent_at?: string | null
          resource_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["amenity_booking_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenity_bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "amenity_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      amenity_resources: {
        Row: {
          advance_booking_days: number
          capacity: number | null
          complex_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: string
          location: string
          max_duration_minutes: number
          min_duration_minutes: number
          name: string
          price: number
          requires_approval: boolean
          rules: string | null
        }
        Insert: {
          advance_booking_days?: number
          capacity?: number | null
          complex_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          location: string
          max_duration_minutes?: number
          min_duration_minutes?: number
          name: string
          price?: number
          requires_approval?: boolean
          rules?: string | null
        }
        Update: {
          advance_booking_days?: number
          capacity?: number | null
          complex_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          location?: string
          max_duration_minutes?: number
          min_duration_minutes?: number
          name?: string
          price?: number
          requires_approval?: boolean
          rules?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amenity_resources_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          complex_id: string | null
          event_name: string
          id: number
          occurred_at: string
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          complex_id?: string | null
          event_name: string
          id?: never
          occurred_at?: string
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          complex_id?: string | null
          event_name?: string
          id?: never
          occurred_at?: string
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments: {
        Row: {
          area_sqm: number | null
          created_at: string
          entrance_id: string
          floor: number | null
          id: string
          number: string
        }
        Insert: {
          area_sqm?: number | null
          created_at?: string
          entrance_id: string
          floor?: number | null
          id?: string
          number: string
        }
        Update: {
          area_sqm?: number | null
          created_at?: string
          entrance_id?: string
          floor?: number | null
          id?: string
          number?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartments_entrance_id_fkey"
            columns: ["entrance_id"]
            isOneToOne: false
            referencedRelation: "entrances"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          complex_id: string
          created_at: string
          id: string
          number: string
        }
        Insert: {
          complex_id: string
          created_at?: string
          id?: string
          number: string
        }
        Update: {
          complex_id?: string
          created_at?: string
          id?: string
          number?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: Database["public"]["Enums"]["chat_member_role"]
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: Database["public"]["Enums"]["chat_member_role"]
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: Database["public"]["Enums"]["chat_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          avatar_url: string | null
          building_id: string | null
          complex_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entrance_id: string | null
          id: string
          is_official: boolean
          last_message_at: string | null
          name: string | null
          type: Database["public"]["Enums"]["chat_type"]
        }
        Insert: {
          avatar_url?: string | null
          building_id?: string | null
          complex_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entrance_id?: string | null
          id?: string
          is_official?: boolean
          last_message_at?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["chat_type"]
        }
        Update: {
          avatar_url?: string | null
          building_id?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entrance_id?: string | null
          id?: string
          is_official?: boolean
          last_message_at?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["chat_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chats_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_entrance_id_fkey"
            columns: ["entrance_id"]
            isOneToOne: false
            referencedRelation: "entrances"
            referencedColumns: ["id"]
          },
        ]
      }
      classifieds: {
        Row: {
          author_id: string
          category: string
          complex_id: string
          created_at: string
          currency: string
          description: string
          id: string
          image_path: string | null
          listing_type: string
          location: string | null
          price: number | null
          promoted_until: string | null
          provider_verified: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category: string
          complex_id: string
          created_at?: string
          currency?: string
          description: string
          id?: string
          image_path?: string | null
          listing_type?: string
          location?: string | null
          price?: number | null
          promoted_until?: string | null
          provider_verified?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          complex_id?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          image_path?: string | null
          listing_type?: string
          location?: string | null
          price?: number | null
          promoted_until?: string | null
          provider_verified?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classifieds_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classifieds_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_mutation_receipts: {
        Row: {
          complex_id: string
          created_at: string
          id: string
          input: Json
          result: Json | null
          user_id: string
        }
        Insert: {
          complex_id: string
          created_at?: string
          id: string
          input: Json
          result?: Json | null
          user_id?: string
        }
        Update: {
          complex_id?: string
          created_at?: string
          id?: string
          input?: Json
          result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_mutation_receipts_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_mutation_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "community_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_clubs: {
        Row: {
          chat_id: string | null
          complex_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean
          name: string
        }
        Insert: {
          chat_id?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
        }
        Update: {
          chat_id?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_clubs_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_clubs_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_event_albums: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          id: string
          uploaded_by: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          id?: string
          uploaded_by?: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          id?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_event_albums_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_event_albums_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_event_rsvps: {
        Row: {
          choice: string
          event_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          choice: string
          event_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          choice?: string
          event_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          capacity: number | null
          complex_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          location: string
          reminder_offsets_minutes: number[]
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          capacity?: number | null
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location: string
          reminder_offsets_minutes?: number[]
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          capacity?: number | null
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string
          reminder_offsets_minutes?: number[]
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_events_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notices: {
        Row: {
          complex_id: string
          created_at: string
          created_by: string
          current_quantity: number | null
          description: string
          id: string
          kind: string
          price: number | null
          status: string
          target_quantity: number | null
          title: string
          updated_at: string
        }
        Insert: {
          complex_id?: string
          created_at?: string
          created_by?: string
          current_quantity?: number | null
          description: string
          id?: string
          kind: string
          price?: number | null
          status?: string
          target_quantity?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          complex_id?: string
          created_at?: string
          created_by?: string
          current_quantity?: number | null
          description?: string
          id?: string
          kind?: string
          price?: number | null
          status?: string
          target_quantity?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notices_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complex_memberships: {
        Row: {
          apartment_id: string | null
          complex_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          is_verified: boolean
          ownership_share: number | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment_id?: string | null
          complex_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_verified?: boolean
          ownership_share?: number | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment_id?: string | null
          complex_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_verified?: boolean
          ownership_share?: number | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complex_memberships_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complex_memberships_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complex_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complex_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complex_settings: {
        Row: {
          complex_id: string
          custom_domain: string | null
          custom_roles: Json
          house_rules: string | null
          languages: string[]
          logo_url: string | null
          management_email: string | null
          management_phone: string | null
          name: string
          primary_color: string
          request_categories: Json
          updated_at: string
          updated_by: string | null
          white_label: boolean
        }
        Insert: {
          complex_id?: string
          custom_domain?: string | null
          custom_roles?: Json
          house_rules?: string | null
          languages?: string[]
          logo_url?: string | null
          management_email?: string | null
          management_phone?: string | null
          name: string
          primary_color?: string
          request_categories?: Json
          updated_at?: string
          updated_by?: string | null
          white_label?: boolean
        }
        Update: {
          complex_id?: string
          custom_domain?: string | null
          custom_roles?: Json
          house_rules?: string | null
          languages?: string[]
          logo_url?: string | null
          management_email?: string | null
          management_phone?: string | null
          name?: string
          primary_color?: string
          request_categories?: Json
          updated_at?: string
          updated_by?: string | null
          white_label?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "complex_settings_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: true
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complex_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complexes: {
        Row: {
          address: string | null
          city: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          address?: string | null
          city?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          id: string
          source_page: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          id?: string
          source_page?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          source_page?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "house_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alert_acknowledgements: {
        Row: {
          alert_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_alert_acknowledgements_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "emergency_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alert_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alerts: {
        Row: {
          active: boolean
          affected_areas: string[]
          building_ids: string[]
          complex_id: string
          contact_phone: string | null
          created_at: string
          created_by: string
          entrance_ids: string[]
          expected_resolution: string | null
          final_report: string | null
          final_report_document_id: string | null
          id: string
          map_geometry: Json | null
          message: string
          resolved_at: string | null
          title: string
        }
        Insert: {
          active?: boolean
          affected_areas?: string[]
          building_ids?: string[]
          complex_id: string
          contact_phone?: string | null
          created_at?: string
          created_by: string
          entrance_ids?: string[]
          expected_resolution?: string | null
          final_report?: string | null
          final_report_document_id?: string | null
          id?: string
          map_geometry?: Json | null
          message: string
          resolved_at?: string | null
          title: string
        }
        Update: {
          active?: boolean
          affected_areas?: string[]
          building_ids?: string[]
          complex_id?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          entrance_ids?: string[]
          expected_resolution?: string | null
          final_report?: string | null
          final_report_document_id?: string | null
          id?: string
          map_geometry?: Json | null
          message?: string
          resolved_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_alerts_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_final_report_document_id_fkey"
            columns: ["final_report_document_id"]
            isOneToOne: false
            referencedRelation: "house_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_updates: {
        Row: {
          alert_id: string
          created_at: string
          created_by: string
          expected_resolution: string | null
          id: string
          message: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          created_by?: string
          expected_resolution?: string | null
          id?: string
          message: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          created_by?: string
          expected_resolution?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_updates_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "emergency_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entrances: {
        Row: {
          building_id: string
          created_at: string
          id: string
          number: number
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          number: number
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          number?: number
        }
        Relationships: [
          {
            foreignKeyName: "entrances_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invitations: {
        Row: {
          apartment_id: string | null
          complex_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          phone: string
          role: string
          status: string
          token_hash: string
        }
        Insert: {
          apartment_id?: string | null
          complex_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          phone: string
          role?: string
          status?: string
          token_hash?: string
        }
        Update: {
          apartment_id?: string | null
          complex_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          phone?: string
          role?: string
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts: {
        Row: {
          balance: number
          complex_id: string
          currency: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          balance?: number
          complex_id: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          complex_id?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: true
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budget_items: {
        Row: {
          actual: number
          category: string
          complex_id: string
          id: string
          planned: number
          updated_at: string
          year: number
        }
        Insert: {
          actual?: number
          category: string
          complex_id: string
          id?: string
          planned?: number
          updated_at?: string
          year: number
        }
        Update: {
          actual?: number
          category?: string
          complex_id?: string
          id?: string
          planned?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_budget_items_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          created_by: string
          direction: string
          document_id: string | null
          id: string
          occurred_on: string
          official_vote_id: string | null
          title: string
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          created_at?: string
          created_by: string
          direction: string
          document_id?: string | null
          id?: string
          occurred_on: string
          official_vote_id?: string | null
          title: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          direction?: string
          document_id?: string | null
          id?: string
          occurred_on?: string
          official_vote_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "house_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_official_vote_id_fkey"
            columns: ["official_vote_id"]
            isOneToOne: false
            referencedRelation: "official_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraiser_payments: {
        Row: {
          amount: number
          comment: string | null
          confirmed_at: string | null
          created_at: string
          fundraiser_id: string
          id: string
          is_anonymous: boolean
          user_id: string | null
        }
        Insert: {
          amount: number
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string
          fundraiser_id: string
          id?: string
          is_anonymous?: boolean
          user_id?: string | null
        }
        Update: {
          amount?: number
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string
          fundraiser_id?: string
          id?: string
          is_anonymous?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fundraiser_payments_fundraiser_id_fkey"
            columns: ["fundraiser_id"]
            isOneToOne: false
            referencedRelation: "fundraisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraiser_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraisers: {
        Row: {
          created_at: string
          currency: string
          current_amount: number
          ends_at: string | null
          id: string
          initiative_id: string | null
          payment_url: string | null
          post_id: string
          qr_url: string | null
          status: Database["public"]["Enums"]["fundraiser_status"]
          target_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_amount?: number
          ends_at?: string | null
          id?: string
          initiative_id?: string | null
          payment_url?: string | null
          post_id: string
          qr_url?: string | null
          status?: Database["public"]["Enums"]["fundraiser_status"]
          target_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_amount?: number
          ends_at?: string | null
          id?: string
          initiative_id?: string | null
          payment_url?: string | null
          post_id?: string
          qr_url?: string | null
          status?: Database["public"]["Enums"]["fundraiser_status"]
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraisers_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraisers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      home_schedule_items: {
        Row: {
          complex_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["home_schedule_kind"]
          location: string
          starts_at: string
          status: Database["public"]["Enums"]["home_schedule_status"]
          title: string
        }
        Insert: {
          complex_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["home_schedule_kind"]
          location: string
          starts_at: string
          status?: Database["public"]["Enums"]["home_schedule_status"]
          title: string
        }
        Update: {
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["home_schedule_kind"]
          location?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["home_schedule_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_schedule_items_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_schedule_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      house_document_acknowledgements: {
        Row: {
          created_at: string
          document_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_document_acknowledgements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "house_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_document_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      house_document_folders: {
        Row: {
          complex_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "house_document_folders_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "house_document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      house_documents: {
        Row: {
          building_id: string | null
          category: Database["public"]["Enums"]["house_document_category"]
          complex_id: string
          created_at: string
          description: string | null
          entrance_id: string | null
          file_name: string
          file_path: string
          folder_id: string | null
          id: string
          is_important: boolean
          mime_type: string
          preview_status: string
          published_at: string
          published_by: string
          requires_acknowledgement: boolean
          searchable_text: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["house_document_status"]
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          building_id?: string | null
          category?: Database["public"]["Enums"]["house_document_category"]
          complex_id: string
          created_at?: string
          description?: string | null
          entrance_id?: string | null
          file_name: string
          file_path: string
          folder_id?: string | null
          id?: string
          is_important?: boolean
          mime_type: string
          preview_status?: string
          published_at?: string
          published_by: string
          requires_acknowledgement?: boolean
          searchable_text?: string | null
          size_bytes: number
          status?: Database["public"]["Enums"]["house_document_status"]
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          building_id?: string | null
          category?: Database["public"]["Enums"]["house_document_category"]
          complex_id?: string
          created_at?: string
          description?: string | null
          entrance_id?: string | null
          file_name?: string
          file_path?: string
          folder_id?: string | null
          id?: string
          is_important?: boolean
          mime_type?: string
          preview_status?: string
          published_at?: string
          published_by?: string
          requires_acknowledgement?: boolean
          searchable_text?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["house_document_status"]
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_documents_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_documents_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_documents_entrance_id_fkey"
            columns: ["entrance_id"]
            isOneToOne: false
            referencedRelation: "entrances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "house_document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_documents_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      initiative_supports: {
        Row: {
          created_at: string
          id: string
          initiative_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiative_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initiative_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiative_supports_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiative_supports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          goal: string | null
          id: string
          post_id: string
          stage: Database["public"]["Enums"]["initiative_stage"]
          supporters: number
          updated_at: string
        }
        Insert: {
          goal?: string | null
          id?: string
          post_id: string
          stage?: Database["public"]["Enums"]["initiative_stage"]
          supporters?: number
          updated_at?: string
        }
        Update: {
          goal?: string | null
          id?: string
          post_id?: string
          stage?: Database["public"]["Enums"]["initiative_stage"]
          supporters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhook_events: {
        Row: {
          error_code: string | null
          id: string
          payload_hash: string
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          signature_valid: boolean
          status: string
        }
        Insert: {
          error_code?: string | null
          id?: string
          payload_hash: string
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          signature_valid: boolean
          status?: string
        }
        Update: {
          error_code?: string | null
          id?: string
          payload_hash?: string
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          signature_valid?: boolean
          status?: string
        }
        Relationships: []
      }
      marketplace_favorites: {
        Row: {
          classified_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          classified_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          classified_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_classified_id_fkey"
            columns: ["classified_id"]
            isOneToOne: false
            referencedRelation: "classifieds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_promotions: {
        Row: {
          amount: number
          classified_id: string
          created_at: string
          ends_at: string
          id: string
          payment_status: string
          provider_payment_id: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          amount: number
          classified_id: string
          created_at?: string
          ends_at: string
          id?: string
          payment_status?: string
          provider_payment_id?: string | null
          starts_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          classified_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          payment_status?: string
          provider_payment_id?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_promotions_classified_id_fkey"
            columns: ["classified_id"]
            isOneToOne: false
            referencedRelation: "classifieds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reports: {
        Row: {
          classified_id: string
          complex_id: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          reviewed_by: string | null
          status: string
        }
        Insert: {
          classified_id: string
          complex_id?: string
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          classified_id?: string
          complex_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reports_classified_id_fkey"
            columns: ["classified_id"]
            isOneToOne: false
            referencedRelation: "classifieds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reports_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          author_id: string
          classified_id: string
          created_at: string
          id: string
          rating: number
          text: string | null
        }
        Insert: {
          author_id?: string
          classified_id: string
          created_at?: string
          id?: string
          rating: number
          text?: string | null
        }
        Update: {
          author_id?: string
          classified_id?: string
          created_at?: string
          id?: string
          rating?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_classified_id_fkey"
            columns: ["classified_id"]
            isOneToOne: false
            referencedRelation: "classifieds"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          id: string
          is_deleted: boolean
          reply_to_id: string | null
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
          updated_at: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          reply_to_id?: string | null
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          reply_to_id?: string | null
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action"]
          created_at: string
          id: string
          moderator_id: string
          reason: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["moderation_target"]
        }
        Insert: {
          action: Database["public"]["Enums"]["moderation_action"]
          created_at?: string
          id?: string
          moderator_id: string
          reason?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["moderation_target"]
        }
        Update: {
          action?: Database["public"]["Enums"]["moderation_action"]
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["moderation_target"]
        }
        Relationships: [
          {
            foreignKeyName: "moderation_logs_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_broadcasts: {
        Row: {
          audience: Json
          body: string
          channels: string[]
          complex_id: string
          created_at: string
          created_by: string
          id: string
          scheduled_at: string
          status: string
          title: string
        }
        Insert: {
          audience?: Json
          body: string
          channels?: string[]
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          scheduled_at?: string
          status?: string
          title: string
        }
        Update: {
          audience?: Json
          body?: string
          channels?: string[]
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          scheduled_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_broadcasts_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_outbox: {
        Row: {
          attempts: number
          channel: string
          complex_id: string
          created_at: string
          id: string
          last_error: string | null
          notification_id: string | null
          provider_message_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          complex_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id?: string | null
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          complex_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id?: string | null
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_outbox_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preference_events: {
        Row: {
          changes: Json
          complex_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          changes: Json
          complex_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          changes?: Json
          complex_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preference_events_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preference_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          community: boolean
          complex_id: string
          email_critical: boolean
          emergency: boolean
          finance: boolean
          in_app: boolean
          payments: boolean
          push: boolean
          quiet_hours: Json
          requests: boolean
          sms_critical: boolean
          updated_at: string
          user_id: string
          voting: boolean
        }
        Insert: {
          community?: boolean
          complex_id?: string
          email_critical?: boolean
          emergency?: boolean
          finance?: boolean
          in_app?: boolean
          payments?: boolean
          push?: boolean
          quiet_hours?: Json
          requests?: boolean
          sms_critical?: boolean
          updated_at?: string
          user_id?: string
          voting?: boolean
        }
        Update: {
          community?: boolean
          complex_id?: string
          email_critical?: boolean
          emergency?: boolean
          finance?: boolean
          in_app?: boolean
          payments?: boolean
          push?: boolean
          quiet_hours?: Json
          requests?: boolean
          sms_critical?: boolean
          updated_at?: string
          user_id?: string
          voting?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      official_vote_ballots: {
        Row: {
          apartment_id: string
          choice: Database["public"]["Enums"]["official_vote_choice"]
          created_at: string
          id: string
          vote_id: string
          voter_id: string
          weight: number
        }
        Insert: {
          apartment_id: string
          choice: Database["public"]["Enums"]["official_vote_choice"]
          created_at?: string
          id?: string
          vote_id: string
          voter_id: string
          weight: number
        }
        Update: {
          apartment_id?: string
          choice?: Database["public"]["Enums"]["official_vote_choice"]
          created_at?: string
          id?: string
          vote_id?: string
          voter_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "official_vote_ballots_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_vote_ballots_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "official_votes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_vote_ballots_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      official_vote_documents: {
        Row: {
          document_id: string
          vote_id: string
        }
        Insert: {
          document_id: string
          vote_id: string
        }
        Update: {
          document_id?: string
          vote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_vote_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "house_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_vote_documents_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "official_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      official_vote_protocols: {
        Row: {
          created_at: string
          generated_by: string
          id: string
          pdf_url: string | null
          sha256: string
          signature_provider: string | null
          signature_status: string
          signed_at: string | null
          snapshot: Json
          vote_id: string
        }
        Insert: {
          created_at?: string
          generated_by?: string
          id?: string
          pdf_url?: string | null
          sha256: string
          signature_provider?: string | null
          signature_status?: string
          signed_at?: string | null
          snapshot: Json
          vote_id: string
        }
        Update: {
          created_at?: string
          generated_by?: string
          id?: string
          pdf_url?: string | null
          sha256?: string
          signature_provider?: string | null
          signature_status?: string
          signed_at?: string | null
          snapshot?: Json
          vote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_vote_protocols_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_vote_protocols_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: true
            referencedRelation: "official_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      official_votes: {
        Row: {
          agenda: Json
          auto_close: boolean
          basis: Database["public"]["Enums"]["official_vote_basis"]
          complex_id: string
          created_at: string
          created_by: string
          description: string
          eligible_units: number
          eligible_weight: number
          ends_at: string
          id: string
          protocol_path: string | null
          quorum_percent: number
          reminder_offsets_minutes: number[]
          requires_signature: boolean
          starts_at: string
          status: Database["public"]["Enums"]["official_vote_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: Json
          auto_close?: boolean
          basis?: Database["public"]["Enums"]["official_vote_basis"]
          complex_id: string
          created_at?: string
          created_by: string
          description: string
          eligible_units?: number
          eligible_weight?: number
          ends_at: string
          id?: string
          protocol_path?: string | null
          quorum_percent?: number
          reminder_offsets_minutes?: number[]
          requires_signature?: boolean
          starts_at: string
          status?: Database["public"]["Enums"]["official_vote_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: Json
          auto_close?: boolean
          basis?: Database["public"]["Enums"]["official_vote_basis"]
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string
          eligible_units?: number
          eligible_weight?: number
          ends_at?: string
          id?: string
          protocol_path?: string | null
          quorum_percent?: number
          reminder_offsets_minutes?: number[]
          requires_signature?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["official_vote_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_votes_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_votes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_bookings: {
        Row: {
          complex_id: string
          created_at: string
          ends_at: string
          id: string
          parking_spot_id: string
          starts_at: string
          status: string
          user_id: string
          vehicle_plate: string
        }
        Insert: {
          complex_id?: string
          created_at?: string
          ends_at: string
          id?: string
          parking_spot_id: string
          starts_at: string
          status?: string
          user_id?: string
          vehicle_plate: string
        }
        Update: {
          complex_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          parking_spot_id?: string
          starts_at?: string
          status?: string
          user_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_bookings_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_bookings_parking_spot_id_fkey"
            columns: ["parking_spot_id"]
            isOneToOne: false
            referencedRelation: "parking_spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_reports: {
        Row: {
          complex_id: string
          created_at: string
          created_by: string
          id: string
          parking_spot_id: string | null
          photo_url: string | null
          reason: string
          status: string
          vehicle_plate: string | null
        }
        Insert: {
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          parking_spot_id?: string | null
          photo_url?: string | null
          reason: string
          status?: string
          vehicle_plate?: string | null
        }
        Update: {
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          parking_spot_id?: string | null
          photo_url?: string | null
          reason?: string
          status?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parking_reports_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_reports_parking_spot_id_fkey"
            columns: ["parking_spot_id"]
            isOneToOne: false
            referencedRelation: "parking_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_spots: {
        Row: {
          apartment_id: string | null
          complex_id: string
          id: string
          kind: string
          label: string
          map_x: number | null
          map_y: number | null
          status: string
          zone: string
        }
        Insert: {
          apartment_id?: string | null
          complex_id?: string
          id?: string
          kind: string
          label: string
          map_x?: number | null
          map_y?: number | null
          status?: string
          zone: string
        }
        Update: {
          apartment_id?: string | null
          complex_id?: string
          id?: string
          kind?: string
          label?: string
          map_x?: number | null
          map_y?: number | null
          status?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_spots_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_spots_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          created_at: string
          fiscal_data: Json | null
          id: string
          payment_id: string
          pdf_url: string | null
          receipt_number: string
        }
        Insert: {
          created_at?: string
          fiscal_data?: Json | null
          id?: string
          payment_id: string
          pdf_url?: string | null
          receipt_number: string
        }
        Update: {
          created_at?: string
          fiscal_data?: Json | null
          id?: string
          payment_id?: string
          pdf_url?: string | null
          receipt_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "resident_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          position: number
          text: string
          votes_count: number
        }
        Insert: {
          id?: string
          poll_id: string
          position?: number
          text: string
          votes_count?: number
        }
        Update: {
          id?: string
          poll_id?: string
          position?: number
          text?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          ends_at: string | null
          id: string
          is_multiple: boolean
          post_id: string
          total_votes: number
        }
        Insert: {
          ends_at?: string | null
          id?: string
          is_multiple?: boolean
          post_id: string
          total_votes?: number
        }
        Update: {
          ends_at?: string | null
          id?: string
          is_multiple?: boolean
          post_id?: string
          total_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_attachments: {
        Row: {
          created_at: string
          id: string
          name: string | null
          post_id: string
          size: number | null
          type: Database["public"]["Enums"]["attachment_type"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          post_id: string
          size?: number | null
          type?: Database["public"]["Enums"]["attachment_type"]
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          post_id?: string
          size?: number | null
          type?: Database["public"]["Enums"]["attachment_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          building_id: string | null
          complex_id: string
          content: string
          created_at: string
          currency: string | null
          entrance_id: string | null
          id: string
          is_official: boolean
          price: number | null
          status: Database["public"]["Enums"]["post_status"]
          territory: Database["public"]["Enums"]["territory_type"]
          title: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id: string
          building_id?: string | null
          complex_id: string
          content: string
          created_at?: string
          currency?: string | null
          entrance_id?: string | null
          id?: string
          is_official?: boolean
          price?: number | null
          status?: Database["public"]["Enums"]["post_status"]
          territory?: Database["public"]["Enums"]["territory_type"]
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string
          building_id?: string | null
          complex_id?: string
          content?: string
          created_at?: string
          currency?: string | null
          entrance_id?: string | null
          id?: string
          is_official?: boolean
          price?: number | null
          status?: Database["public"]["Enums"]["post_status"]
          territory?: Database["public"]["Enums"]["territory_type"]
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_entrance_id_fkey"
            columns: ["entrance_id"]
            isOneToOne: false
            referencedRelation: "entrances"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apartment_id: string | null
          avatar_url: string | null
          bio: string | null
          complex_id: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          apartment_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          complex_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          apartment_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          complex_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          bucket_key: string
          count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          bucket_key?: string
          count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          type?: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          type?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_invoices: {
        Row: {
          amount: number
          apartment_id: string
          complex_id: string
          created_at: string
          document_id: string | null
          due_on: string
          id: string
          period: string
          status: string
        }
        Insert: {
          amount: number
          apartment_id: string
          complex_id: string
          created_at?: string
          document_id?: string | null
          due_on: string
          id?: string
          period: string
          status?: string
        }
        Update: {
          amount?: number
          apartment_id?: string
          complex_id?: string
          created_at?: string
          document_id?: string | null
          due_on?: string
          id?: string
          period?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "resident_invoices_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_invoices_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "house_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_payments: {
        Row: {
          amount: number
          apartment_id: string
          created_at: string
          id: string
          invoice_id: string | null
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          apartment_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          provider: string
          provider_payment_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          apartment_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resident_payments_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "resident_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_vehicles: {
        Row: {
          complex_id: string
          created_at: string
          id: string
          label: string | null
          plate: string
          resident_id: string
        }
        Insert: {
          complex_id: string
          created_at?: string
          id?: string
          label?: string | null
          plate: string
          resident_id: string
        }
        Update: {
          complex_id?: string
          created_at?: string
          id?: string
          label?: string | null
          plate?: string
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resident_vehicles_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_vehicles_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          complex_id: string
          enabled: boolean
          permission: string
          role: string
        }
        Insert: {
          complex_id: string
          enabled?: boolean
          permission: string
          role: string
        }
        Update: {
          complex_id?: string
          enabled?: boolean
          permission?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          categories: string[]
          created_at: string
          description: string | null
          id: string
          is_verified: boolean
          profile_id: string
          rating: number
          recommended_by: string | null
          reviews_count: number
          service_areas: string[]
          updated_at: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          profile_id: string
          rating?: number
          recommended_by?: string | null
          reviews_count?: number
          service_areas?: string[]
          updated_at?: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          profile_id?: string
          rating?: number
          recommended_by?: string | null
          reviews_count?: number
          service_areas?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_recommended_by_fkey"
            columns: ["recommended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["service_request_attachment_kind"]
          mime_type: string
          path: string
          request_id: string
          size_bytes: number
          uploader_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: Database["public"]["Enums"]["service_request_attachment_kind"]
          mime_type: string
          path: string
          request_id: string
          size_bytes: number
          uploader_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["service_request_attachment_kind"]
          mime_type?: string
          path?: string
          request_id?: string
          size_bytes?: number
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_attachments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_duplicates: {
        Row: {
          approved_by: string | null
          confidence: number | null
          created_at: string
          duplicate_request_id: string
          primary_request_id: string
          suggested_by: string
        }
        Insert: {
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          duplicate_request_id: string
          primary_request_id: string
          suggested_by?: string
        }
        Update: {
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          duplicate_request_id?: string
          primary_request_id?: string
          suggested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_duplicates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_duplicates_duplicate_request_id_fkey"
            columns: ["duplicate_request_id"]
            isOneToOne: true
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_duplicates_primary_request_id_fkey"
            columns: ["primary_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["service_request_event_kind"]
          message: string | null
          metadata: Json
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["service_request_event_kind"]
          message?: string | null
          metadata?: Json
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["service_request_event_kind"]
          message?: string | null
          metadata?: Json
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["service_request_category"]
          closed_at: string | null
          complex_id: string
          created_at: string
          created_by: string
          description: string
          entrance_id: string | null
          id: string
          location: string
          priority: Database["public"]["Enums"]["service_request_priority"]
          public_for_complex: boolean
          rating: number | null
          resolution_note: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          building_id?: string | null
          category: Database["public"]["Enums"]["service_request_category"]
          closed_at?: string | null
          complex_id: string
          created_at?: string
          created_by: string
          description: string
          entrance_id?: string | null
          id?: string
          location: string
          priority?: Database["public"]["Enums"]["service_request_priority"]
          public_for_complex?: boolean
          rating?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          building_id?: string | null
          category?: Database["public"]["Enums"]["service_request_category"]
          closed_at?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string
          entrance_id?: string | null
          id?: string
          location?: string
          priority?: Database["public"]["Enums"]["service_request_priority"]
          public_for_complex?: boolean
          rating?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_entrance_id_fkey"
            columns: ["entrance_id"]
            isOneToOne: false
            referencedRelation: "entrances"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_incidents: {
        Row: {
          acknowledged_by: string | null
          complex_id: string
          created_at: string
          created_by: string
          id: string
          location: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          acknowledged_by?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          location: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          acknowledged_by?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string
          id?: string
          location?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_incidents_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_incidents_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          apartment_number: string
          building_number: string
          created_at: string
          document_path: string
          document_type: string
          entrance_number: number
          full_name: string
          id: string
          phone: string | null
          review_reason: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment_number: string
          building_number: string
          created_at?: string
          document_path: string
          document_type: string
          entrance_number: number
          full_name: string
          id?: string
          phone?: string | null
          review_reason?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment_number?: string
          building_number?: string
          created_at?: string
          document_path?: string
          document_type?: string
          entrance_number?: number
          full_name?: string
          id?: string
          phone?: string | null
          review_reason?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_passes: {
        Row: {
          access_code: string
          complex_id: string
          created_at: string
          guest_name: string
          id: string
          kind: Database["public"]["Enums"]["visitor_pass_kind"]
          resident_id: string
          status: Database["public"]["Enums"]["visitor_pass_status"]
          valid_from: string
          valid_until: string
          vehicle_plate: string | null
        }
        Insert: {
          access_code?: string
          complex_id: string
          created_at?: string
          guest_name: string
          id?: string
          kind?: Database["public"]["Enums"]["visitor_pass_kind"]
          resident_id: string
          status?: Database["public"]["Enums"]["visitor_pass_status"]
          valid_from?: string
          valid_until: string
          vehicle_plate?: string | null
        }
        Update: {
          access_code?: string
          complex_id?: string
          created_at?: string
          guest_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["visitor_pass_kind"]
          resident_id?: string
          status?: Database["public"]["Enums"]["visitor_pass_status"]
          valid_from?: string
          valid_until?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_passes_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_attachments: {
        Row: {
          created_at: string
          id: string
          kind: string
          mime_type: string
          uploaded_by: string
          url: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          mime_type: string
          uploaded_by?: string
          url: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string
          uploaded_by?: string
          url?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          label: string
          position: number
          work_order_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          label: string
          position?: number
          work_order_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          label?: string
          position?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_checklist_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          building_id: string | null
          completed_at: string | null
          complex_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          entrance_id: string | null
          id: string
          kind: string
          location: string
          performer_geo: unknown
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          building_id?: string | null
          completed_at?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          entrance_id?: string | null
          id?: string
          kind: string
          location: string
          performer_geo?: unknown
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          building_id?: string | null
          completed_at?: string | null
          complex_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          entrance_id?: string | null
          id?: string
          kind?: string
          location?: string
          performer_geo?: unknown
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_entrance_id_fkey"
            columns: ["entrance_id"]
            isOneToOne: false
            referencedRelation: "entrances"
            referencedColumns: ["id"]
          },
        ]
      }
      work_ratings: {
        Row: {
          comment: string | null
          created_at: string
          rating: number
          user_id: string
          work_order_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          rating: number
          user_id?: string
          work_order_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          rating?: number
          user_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_ratings_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_service_request_comment: {
        Args: { p_message: string; p_request_id: string }
        Returns: {
          actor_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["service_request_event_kind"]
          message: string | null
          metadata: Json
          request_id: string
        }
        SetofOptions: {
          from: "*"
          to: "service_request_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_user_apartment_id: { Args: never; Returns: string }
      auth_user_can_manage: { Args: never; Returns: boolean }
      auth_user_complex_id: { Args: never; Returns: string }
      auth_user_membership_role: { Args: never; Returns: string }
      auth_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      auth_user_verified: { Args: never; Returns: boolean }
      book_guest_parking: {
        Args: {
          p_ends_at: string
          p_spot_id: string
          p_starts_at: string
          p_vehicle_plate: string
        }
        Returns: {
          complex_id: string
          created_at: string
          ends_at: string
          id: string
          parking_spot_id: string
          starts_at: string
          status: string
          user_id: string
          vehicle_plate: string
        }
        SetofOptions: {
          from: "*"
          to: "parking_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_view_service_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      cancel_amenity_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: {
          approval_status: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          ends_at: string
          id: string
          payment_status: string
          provider_payment_id: string | null
          reminder_sent_at: string | null
          resource_id: string
          starts_at: string
          status: Database["public"]["Enums"]["amenity_booking_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "amenity_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cast_official_vote: {
        Args: {
          p_choice: Database["public"]["Enums"]["official_vote_choice"]
          p_vote_id: string
        }
        Returns: {
          apartment_id: string
          choice: Database["public"]["Enums"]["official_vote_choice"]
          created_at: string
          id: string
          vote_id: string
          voter_id: string
          weight: number
        }
        SetofOptions: {
          from: "*"
          to: "official_vote_ballots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_expired_official_votes: { Args: never; Returns: number }
      complete_ai_job: {
        Args: {
          p_human_review_required: boolean
          p_job_id: string
          p_provider_response_id: string
          p_result: Json
        }
        Returns: {
          completed_at: string | null
          complex_id: string
          created_at: string
          error_code: string | null
          feature: string
          human_review_required: boolean
          id: string
          input_hash: string
          provider_response_id: string | null
          result: Json | null
          source_ids: string[]
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_rate_limit: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_amenity_booking: {
        Args: { p_ends_at: string; p_resource_id: string; p_starts_at: string }
        Returns: {
          approval_status: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          ends_at: string
          id: string
          payment_status: string
          provider_payment_id: string | null
          reminder_sent_at: string | null
          resource_id: string
          starts_at: string
          status: Database["public"]["Enums"]["amenity_booking_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "amenity_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_direct_chat: { Args: { p_target_user: string }; Returns: string }
      execute_platform_mutation: {
        Args: { p_complex_id: string; p_id: string; p_mutation: Json }
        Returns: Json
      }
      fail_ai_job: {
        Args: { p_error_code: string; p_job_id: string }
        Returns: {
          completed_at: string | null
          complex_id: string
          created_at: string
          error_code: string | null
          feature: string
          human_review_required: boolean
          id: string
          input_hash: string
          provider_response_id: string | null
          result: Json | null
          source_ids: string[]
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_document_acknowledgement_stats: {
        Args: { p_document_id: string }
        Returns: {
          acknowledged: number
          eligible: number
          percentage: number
        }[]
      }
      get_official_vote_results: {
        Args: { p_vote_id: string }
        Returns: {
          ballot_count: number
          choice: Database["public"]["Enums"]["official_vote_choice"]
          total_weight: number
        }[]
      }
      is_chat_member: { Args: { p_chat_id: string }; Returns: boolean }
      mark_overdue_service_requests: { Args: never; Returns: number }
      merge_service_requests: {
        Args: {
          p_confidence?: number
          p_duplicate_id: string
          p_primary_id: string
          p_suggested_by?: string
        }
        Returns: undefined
      }
      publish_emergency_alert: {
        Args: {
          p_affected_areas?: string[]
          p_contact_phone?: string
          p_expected_resolution?: string
          p_message: string
          p_title: string
        }
        Returns: {
          active: boolean
          affected_areas: string[]
          building_ids: string[]
          complex_id: string
          contact_phone: string | null
          created_at: string
          created_by: string
          entrance_ids: string[]
          expected_resolution: string | null
          final_report: string | null
          final_report_document_id: string | null
          id: string
          map_geometry: Json | null
          message: string
          resolved_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "emergency_alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rate_service_request: {
        Args: { p_rating: number; p_request_id: string }
        Returns: {
          assignee_id: string | null
          assignee_name: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["service_request_category"]
          closed_at: string | null
          complex_id: string
          created_at: string
          created_by: string
          description: string
          entrance_id: string | null
          id: string
          location: string
          priority: Database["public"]["Enums"]["service_request_priority"]
          public_for_complex: boolean
          rating: number | null
          resolution_note: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_finance_transaction: {
        Args: {
          p_amount: number
          p_category: string
          p_direction: string
          p_document_id?: string
          p_occurred_on: string
          p_title: string
        }
        Returns: {
          account_id: string
          amount: number
          category: string
          created_at: string
          created_by: string
          direction: string
          document_id: string | null
          id: string
          occurred_on: string
          official_vote_id: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "finance_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_fundraiser_payment: {
        Args: {
          p_amount: number
          p_comment?: string
          p_fundraiser_id: string
          p_is_anonymous?: boolean
        }
        Returns: {
          amount: number
          comment: string | null
          confirmed_at: string | null
          created_at: string
          fundraiser_id: string
          id: string
          is_anonymous: boolean
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "fundraiser_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reopen_service_request: {
        Args: { p_message: string; p_request_id: string }
        Returns: {
          assignee_id: string | null
          assignee_name: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["service_request_category"]
          closed_at: string | null
          complex_id: string
          created_at: string
          created_by: string
          description: string
          entrance_id: string | null
          id: string
          location: string
          priority: Database["public"]["Enums"]["service_request_priority"]
          public_for_complex: boolean
          rating: number | null
          resolution_note: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_emergency_alert: {
        Args: { p_alert_id: string }
        Returns: undefined
      }
      review_verification_request: {
        Args: { p_approved: boolean; p_reason?: string; p_request_id: string }
        Returns: {
          apartment_number: string
          building_number: string
          created_at: string
          document_path: string
          document_type: string
          entrance_number: number
          full_name: string
          id: string
          phone: string | null
          review_reason: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_request_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "verification_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rsvp_community_event: {
        Args: { p_choice: string; p_event_id: string }
        Returns: {
          choice: string
          event_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "community_event_rsvps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      switch_active_membership: {
        Args: { p_membership_id: string }
        Returns: {
          apartment_id: string | null
          complex_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          is_verified: boolean
          ownership_share: number | null
          role: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "complex_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_service_request_status: {
        Args: {
          p_assignee_id?: string
          p_assignee_name?: string
          p_note?: string
          p_request_id: string
          p_sla_due_at?: string
          p_status: Database["public"]["Enums"]["service_request_status"]
        }
        Returns: {
          assignee_id: string | null
          assignee_name: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["service_request_category"]
          closed_at: string | null
          complex_id: string
          created_at: string
          created_by: string
          description: string
          entrance_id: string | null
          id: string
          location: string
          priority: Database["public"]["Enums"]["service_request_priority"]
          public_for_complex: boolean
          rating: number | null
          resolution_note: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      amenity_booking_status: "confirmed" | "cancelled" | "completed"
      attachment_type: "image" | "document" | "video"
      chat_member_role: "member" | "admin"
      chat_type: "complex" | "building" | "entrance" | "thematic" | "direct"
      fundraiser_status: "active" | "completed" | "cancelled"
      home_schedule_kind: "cleaning" | "maintenance" | "outage" | "event"
      home_schedule_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled"
      house_document_category:
        | "finance"
        | "protocol"
        | "rules"
        | "contract"
        | "notice"
        | "report"
        | "other"
      house_document_status: "active" | "archived"
      initiative_stage:
        | "proposal"
        | "discussion"
        | "voting"
        | "hoa_review"
        | "approved"
        | "fundraising"
        | "implementation"
        | "completed"
        | "rejected"
      message_type: "text" | "image" | "document" | "system"
      moderation_action: "warn" | "hide" | "delete" | "ban" | "restore"
      moderation_target: "post" | "comment" | "profile" | "chat_message"
      official_vote_basis: "owner" | "area"
      official_vote_choice: "yes" | "no" | "abstain"
      official_vote_status: "draft" | "active" | "completed" | "cancelled"
      post_status: "active" | "closed" | "archived" | "under_review"
      post_type:
        | "post"
        | "announcement"
        | "service"
        | "help_request"
        | "poll"
        | "initiative"
        | "event"
        | "official_news"
        | "official_poll"
        | "fundraiser"
      reaction_type: "like" | "support" | "thanks"
      service_request_attachment_kind: "evidence" | "resolution"
      service_request_category:
        | "utilities"
        | "cleaning"
        | "repair"
        | "safety"
        | "territory"
        | "other"
      service_request_event_kind:
        | "created"
        | "comment"
        | "assigned"
        | "status_changed"
        | "resolution"
        | "rated"
        | "reopened"
        | "merged"
        | "sla_breached"
      service_request_priority: "normal" | "important" | "emergency"
      service_request_status:
        | "submitted"
        | "in_progress"
        | "resolved"
        | "closed"
      territory_type: "entrance" | "building" | "complex"
      user_role: "resident" | "hoa_official" | "service_provider" | "admin"
      verification_request_status: "pending" | "approved" | "rejected"
      visitor_pass_kind: "guest" | "courier" | "vehicle"
      visitor_pass_status: "active" | "used" | "revoked" | "expired"
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
      amenity_booking_status: ["confirmed", "cancelled", "completed"],
      attachment_type: ["image", "document", "video"],
      chat_member_role: ["member", "admin"],
      chat_type: ["complex", "building", "entrance", "thematic", "direct"],
      fundraiser_status: ["active", "completed", "cancelled"],
      home_schedule_kind: ["cleaning", "maintenance", "outage", "event"],
      home_schedule_status: [
        "planned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      house_document_category: [
        "finance",
        "protocol",
        "rules",
        "contract",
        "notice",
        "report",
        "other",
      ],
      house_document_status: ["active", "archived"],
      initiative_stage: [
        "proposal",
        "discussion",
        "voting",
        "hoa_review",
        "approved",
        "fundraising",
        "implementation",
        "completed",
        "rejected",
      ],
      message_type: ["text", "image", "document", "system"],
      moderation_action: ["warn", "hide", "delete", "ban", "restore"],
      moderation_target: ["post", "comment", "profile", "chat_message"],
      official_vote_basis: ["owner", "area"],
      official_vote_choice: ["yes", "no", "abstain"],
      official_vote_status: ["draft", "active", "completed", "cancelled"],
      post_status: ["active", "closed", "archived", "under_review"],
      post_type: [
        "post",
        "announcement",
        "service",
        "help_request",
        "poll",
        "initiative",
        "event",
        "official_news",
        "official_poll",
        "fundraiser",
      ],
      reaction_type: ["like", "support", "thanks"],
      service_request_attachment_kind: ["evidence", "resolution"],
      service_request_category: [
        "utilities",
        "cleaning",
        "repair",
        "safety",
        "territory",
        "other",
      ],
      service_request_event_kind: [
        "created",
        "comment",
        "assigned",
        "status_changed",
        "resolution",
        "rated",
        "reopened",
        "merged",
        "sla_breached",
      ],
      service_request_priority: ["normal", "important", "emergency"],
      service_request_status: [
        "submitted",
        "in_progress",
        "resolved",
        "closed",
      ],
      territory_type: ["entrance", "building", "complex"],
      user_role: ["resident", "hoa_official", "service_provider", "admin"],
      verification_request_status: ["pending", "approved", "rejected"],
      visitor_pass_kind: ["guest", "courier", "vehicle"],
      visitor_pass_status: ["active", "used", "revoked", "expired"],
    },
  },
} as const
