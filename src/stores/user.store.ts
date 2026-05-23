import { create } from "zustand";
import type { Profile, UserTier } from "@/types/profile.types";

interface UserState {
  profile: Profile | null;
  tier: UserTier;
  setProfile: (profile: Profile | null) => void;
  setTier: (tier: UserTier) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  tier: "STANDARD",
  setProfile: (profile) =>
    set({ profile, tier: profile?.tier ?? "STANDARD" }),
  setTier: (tier) => set({ tier }),
}));
