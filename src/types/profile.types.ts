import type { Tables, Enums } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type UserTier = Enums<"user_tier">;

export const USER_TIER_BADGE: Record<UserTier, { label: string; className: string }> = {
  STANDARD:       { label: "Standard",       className: "chip-info" },
  ENTERPRISE:     { label: "Enterprise",     className: "chip-cargo" },
  VIP:            { label: "VIP",            className: "chip-success" },
  ANCHOR_PARTNER: { label: "Anchor Partner", className: "chip-warning" },
};
