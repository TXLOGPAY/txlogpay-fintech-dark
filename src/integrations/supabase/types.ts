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
      operations: {
        Row: {
          activated_at: string | null
          bank_name: string | null
          beneficiary_city: string | null
          beneficiary_country: string | null
          bl_awb: string | null
          created_at: string
          currency: string
          current_operational_status: string | null
          duimp: string | null
          exporter_name: string | null
          fee_amount: number
          fx_currency_used: string | null
          fx_rate_to_usd: number | null
          fx_reference_date: string | null
          iban: string | null
          id: string
          importer_name: string | null
          incoterm: string | null
          invoice_number: string | null
          operation_code: string
          operation_currency: string | null
          operation_value: number
          operation_wallet: string | null
          payment_proof_url: string | null
          payment_receipt_name: string | null
          payment_receipt_url: string | null
          payment_submitted_at: string | null
          protected_amount: number
          release_trigger: string | null
          siscomex_reference: string | null
          status: Database["public"]["Enums"]["operation_status"]
          swift: string | null
          total_amount: number
          total_fees: number
          updated_at: string
          usd_conversion_rate: number | null
          usd_normalized_value: number | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          bank_name?: string | null
          beneficiary_city?: string | null
          beneficiary_country?: string | null
          bl_awb?: string | null
          created_at?: string
          currency?: string
          current_operational_status?: string | null
          duimp?: string | null
          exporter_name?: string | null
          fee_amount?: number
          fx_currency_used?: string | null
          fx_rate_to_usd?: number | null
          fx_reference_date?: string | null
          iban?: string | null
          id?: string
          importer_name?: string | null
          incoterm?: string | null
          invoice_number?: string | null
          operation_code: string
          operation_currency?: string | null
          operation_value?: number
          operation_wallet?: string | null
          payment_proof_url?: string | null
          payment_receipt_name?: string | null
          payment_receipt_url?: string | null
          payment_submitted_at?: string | null
          protected_amount?: number
          release_trigger?: string | null
          siscomex_reference?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          swift?: string | null
          total_amount?: number
          total_fees?: number
          updated_at?: string
          usd_conversion_rate?: number | null
          usd_normalized_value?: number | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          bank_name?: string | null
          beneficiary_city?: string | null
          beneficiary_country?: string | null
          bl_awb?: string | null
          created_at?: string
          currency?: string
          current_operational_status?: string | null
          duimp?: string | null
          exporter_name?: string | null
          fee_amount?: number
          fx_currency_used?: string | null
          fx_rate_to_usd?: number | null
          fx_reference_date?: string | null
          iban?: string | null
          id?: string
          importer_name?: string | null
          incoterm?: string | null
          invoice_number?: string | null
          operation_code?: string
          operation_currency?: string | null
          operation_value?: number
          operation_wallet?: string | null
          payment_proof_url?: string | null
          payment_receipt_name?: string | null
          payment_receipt_url?: string | null
          payment_submitted_at?: string | null
          protected_amount?: number
          release_trigger?: string | null
          siscomex_reference?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          swift?: string | null
          total_amount?: number
          total_fees?: number
          updated_at?: string
          usd_conversion_rate?: number | null
          usd_normalized_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount: number
          asset: string
          asset_code: string | null
          confirmation_code: string | null
          created_at: string
          destination_wallet: string
          id: string
          ledger: number | null
          network: string
          operation_currency: string | null
          operation_id: string
          source_wallet: string | null
          status: string
          successful: boolean
          tx_hash: string
          user_id: string
        }
        Insert: {
          amount?: number
          asset?: string
          asset_code?: string | null
          confirmation_code?: string | null
          created_at?: string
          destination_wallet: string
          id?: string
          ledger?: number | null
          network?: string
          operation_currency?: string | null
          operation_id: string
          source_wallet?: string | null
          status?: string
          successful?: boolean
          tx_hash: string
          user_id: string
        }
        Update: {
          amount?: number
          asset?: string
          asset_code?: string | null
          confirmation_code?: string | null
          created_at?: string
          destination_wallet?: string
          id?: string
          ledger?: number | null
          network?: string
          operation_currency?: string | null
          operation_id?: string
          source_wallet?: string | null
          status?: string
          successful?: boolean
          tx_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      operation_status:
        | "PENDING_PAYMENT"
        | "PAYMENT_UNDER_REVIEW"
        | "OPERATION_MONITORING"
        | "PAYMENT_RELEASED"
        | "ACTIVE"
        | "COMPLETED"
        | "CANCELLED"
        | "SETTLEMENT_IN_PROGRESS"
      user_tier: "STANDARD" | "ENTERPRISE" | "VIP" | "ANCHOR_PARTNER"
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
      operation_status: [
        "PENDING_PAYMENT",
        "PAYMENT_UNDER_REVIEW",
        "OPERATION_MONITORING",
        "PAYMENT_RELEASED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
        "SETTLEMENT_IN_PROGRESS",
      ],
      user_tier: ["STANDARD", "ENTERPRISE", "VIP", "ANCHOR_PARTNER"],
    },
  },
} as const
