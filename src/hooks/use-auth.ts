import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/auth.service";
import { useUserStore } from "@/stores/user.store";
import type { Profile } from "@/types/profile.types";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const setProfile = useUserStore((s) => s.setProfile);

  useEffect(() => {
    // Listener FIRST (avoids missing events during initial getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) {
        setProfile(null);
        queryClient.removeQueries({ queryKey: ["profile"] });
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient, setProfile]);

  const userId = user?.id;
  const profileQuery = useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: () => (userId ? authService.getProfile(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Sync profile into the global user store
  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
  }, [profileQuery.data, setProfile]);

  return {
    session,
    user,
    profile: profileQuery.data ?? null,
    loading,
    profileLoading: profileQuery.isLoading,
    isAuthenticated: !!session,
  };
}

export async function signOut() {
  await authService.signOut();
}
