import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Profile } from "@/types/profile.types";

export const authService = {
  async signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUpWithEmail(email: string, password: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
  },

  async signInWithGoogle(redirectPath = "/dashboard") {
    return lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + redirectPath,
    });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("[auth.service] getProfile error", error);
      return null;
    }
    return data;
  },
};
