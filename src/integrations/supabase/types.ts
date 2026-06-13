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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contracts: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          pdf_hash: string
          pdf_path: string
          proposal_id: string
          signed_by_owner: boolean
          signed_by_owner_at: string | null
          signed_by_tenant: boolean
          signed_by_tenant_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          pdf_hash: string
          pdf_path: string
          proposal_id: string
          signed_by_owner?: boolean
          signed_by_owner_at?: string | null
          signed_by_tenant?: boolean
          signed_by_tenant_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          pdf_hash?: string
          pdf_path?: string
          proposal_id?: string
          signed_by_owner?: boolean
          signed_by_owner_at?: string | null
          signed_by_tenant?: boolean
          signed_by_tenant_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          escrow_split: Json
          id: string
          opened_by: string
          proposal_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          escrow_split?: Json
          id?: string
          opened_by: string
          proposal_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          escrow_split?: Json
          id?: string
          opened_by?: string
          proposal_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          created_at: string
          id: string
          items: Json
          photos: string[]
          proposal_id: string
          signed_by_owner_at: string | null
          signed_by_tenant_at: string | null
          type: Database["public"]["Enums"]["inspection_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          photos?: string[]
          proposal_id: string
          signed_by_owner_at?: string | null
          signed_by_tenant_at?: string | null
          type: Database["public"]["Enums"]["inspection_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          photos?: string[]
          proposal_id?: string
          signed_by_owner_at?: string | null
          signed_by_tenant_at?: string | null
          type?: Database["public"]["Enums"]["inspection_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          amenities: string[]
          area: number
          bathrooms: number
          bedrooms: number
          certification: Database["public"]["Enums"]["property_certification"]
          created_at: string
          deposit: number
          description: string
          id: string
          image: string
          neighborhood: string
          owner_id: string
          price: number
          score: number
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          amenities?: string[]
          area?: number
          bathrooms?: number
          bedrooms?: number
          certification?: Database["public"]["Enums"]["property_certification"]
          created_at?: string
          deposit?: number
          description?: string
          id?: string
          image?: string
          neighborhood: string
          owner_id: string
          price: number
          score?: number
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: string[]
          area?: number
          bathrooms?: number
          bedrooms?: number
          certification?: Database["public"]["Enums"]["property_certification"]
          created_at?: string
          deposit?: number
          description?: string
          id?: string
          image?: string
          neighborhood?: string
          owner_id?: string
          price?: number
          score?: number
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          deposit: number
          escrow_amount: number
          extra_deposit: number
          id: string
          monthly_price: number
          owner_id: string
          property_id: string
          property_snapshot: Json
          signature_name: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          deposit?: number
          escrow_amount?: number
          extra_deposit?: number
          id?: string
          monthly_price?: number
          owner_id: string
          property_id: string
          property_snapshot?: Json
          signature_name?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          deposit?: number
          escrow_amount?: number
          extra_deposit?: number
          id?: string
          monthly_price?: number
          owner_id?: string
          property_id?: string
          property_snapshot?: Json
          signature_name?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_passport: {
        Row: {
          cpf: string | null
          created_at: string
          credit_score: number | null
          credit_status: Database["public"]["Enums"]["passport_credit_status"]
          doc_status: Database["public"]["Enums"]["passport_doc_status"]
          full_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          credit_score?: number | null
          credit_status?: Database["public"]["Enums"]["passport_credit_status"]
          doc_status?: Database["public"]["Enums"]["passport_doc_status"]
          full_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          credit_score?: number | null
          credit_status?: Database["public"]["Enums"]["passport_credit_status"]
          doc_status?: Database["public"]["Enums"]["passport_doc_status"]
          full_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: string[]
          author_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[]
          author_id: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          attachments?: string[]
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          description: string
          id: string
          owner_id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          proposal_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description?: string
          id?: string
          owner_id: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          proposal_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description?: string
          id?: string
          owner_id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          proposal_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "tenant"
      dispute_status: "aberta" | "mediando" | "resolvida"
      inspection_type: "checkin" | "checkout"
      passport_credit_status: "pendente" | "aprovado" | "reprovado"
      passport_doc_status: "none" | "pending" | "approved" | "rejected"
      property_certification: "parede_seca" | "pendente" | "atencao"
      property_status: "draft" | "published" | "paused"
      proposal_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "signed"
        | "escrow"
        | "active"
        | "ended"
        | "cancelled"
      ticket_category: "manutencao" | "financeiro" | "convivencia" | "outros"
      ticket_priority: "baixa" | "media" | "alta"
      ticket_status: "aberto" | "em_andamento" | "resolvido" | "escalado"
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
      app_role: ["admin", "owner", "tenant"],
      dispute_status: ["aberta", "mediando", "resolvida"],
      inspection_type: ["checkin", "checkout"],
      passport_credit_status: ["pendente", "aprovado", "reprovado"],
      passport_doc_status: ["none", "pending", "approved", "rejected"],
      property_certification: ["parede_seca", "pendente", "atencao"],
      property_status: ["draft", "published", "paused"],
      proposal_status: [
        "pending",
        "accepted",
        "rejected",
        "signed",
        "escrow",
        "active",
        "ended",
        "cancelled",
      ],
      ticket_category: ["manutencao", "financeiro", "convivencia", "outros"],
      ticket_priority: ["baixa", "media", "alta"],
      ticket_status: ["aberto", "em_andamento", "resolvido", "escalado"],
    },
  },
} as const
