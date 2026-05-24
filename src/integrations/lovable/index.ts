import { supabase } from "../supabase/client"

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions
    ) => {
      return supabase.auth.signInWithOAuth({
        provider: provider as "google",
        options: {
          redirectTo:
            opts?.redirect_uri ||
            "https://beta.txlogpay.com/dashboard",
        },
      });
    },
  },
}