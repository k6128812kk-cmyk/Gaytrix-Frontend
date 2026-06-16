import { create } from 'zustand';
import type { UserProfile } from '@/types';

// ==========================================================================
// Session store — authenticated user profile, onboarding state, and
// global unread message count (for the TabBar badge).
//
// hasCompletedOnboarding is persisted in localStorage so it survives
// page reloads.
//
// profileLooksComplete is intentionally lenient — we only require a
// displayName so new users aren't bounced back to onboarding on every
// refresh if they only partially filled their profile.
// ==========================================================================

const ONBOARDING_KEY = 'k5_onboarding_done';

// A profile is "complete enough" to skip onboarding only when:
//   1. The backend has set registration_complete = TRUE (name + photo
//      were both submitted via completeRegistration)
//   2. The user has a non-empty displayName as a belt-and-suspenders check
//
// We intentionally DO NOT fall back to just checking displayName —
// that would let a partially-filled profile (created by authMiddleware's
// INSERT) bypass onboarding and appear in the feed.
function profileLooksComplete(profile: UserProfile): boolean {
  return Boolean(profile.registrationComplete) &&
    profile.displayName != null &&
    profile.displayName.trim().length > 0;
}

function loadOnboardingFlag(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

function saveOnboardingFlag() {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {}
}

interface SessionState {
  profile: UserProfile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  totalUnreadCount: number;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  completeOnboarding: () => void;
  setTotalUnread: (count: number) => void;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  isActive: () => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  profile: null,
  isLoading: true,
  // Restore from localStorage on first load
  hasCompletedOnboarding: loadOnboardingFlag(),
  totalUnreadCount: 0,

  setProfile: (profile) => {
    // Only auto-mark onboarding done if localStorage already says so,
    // OR if the profile genuinely looks complete (has a display name).
    // This prevents a new user (empty displayName from backend) from
    // being considered "done" and skipping onboarding.
    const alreadyDone = loadOnboardingFlag();
    const looksComplete = profileLooksComplete(profile);
    const done = alreadyDone || looksComplete;
    if (done) saveOnboardingFlag();
    set({ profile, hasCompletedOnboarding: done });
  },

  updateProfile: (patch) =>
    set((state) => {
      const profile = state.profile ? { ...state.profile, ...patch } : state.profile;
      const done =
        state.hasCompletedOnboarding ||
        (profile != null && profileLooksComplete(profile));
      if (done) saveOnboardingFlag();
      return { profile, hasCompletedOnboarding: done };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  completeOnboarding: () => {
    saveOnboardingFlag();
    set({ hasCompletedOnboarding: true });
  },

  setTotalUnread: (count) => set({ totalUnreadCount: count }),

  isAdmin: () => {
    const role = get().profile?.adminRole;
    return role === 'super_admin' || role === 'admin';
  },
  isModerator: () => {
    const role = get().profile?.adminRole;
    return role === 'super_admin' || role === 'admin' || role === 'moderator';
  },
  isActive: () => get().profile?.accountStatus === 'active',
}));
