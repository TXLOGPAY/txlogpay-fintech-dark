import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { Profile } from "./profile.types";

export type AuthUser = SupabaseUser;
export type AuthSession = Session;

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
}
