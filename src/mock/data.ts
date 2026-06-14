import type {
  UserProfile, MapLocation, Conversation,
  ChatMessage, VerificationRequest, UserReport, PlatformStats, AdminAction,
} from '@/types';

// ==========================================================================
// Mock data — STRIPPED of fake/demo profiles.
// Only the super admin is kept as a placeholder until real Telegram auth
// populates the session. ALL mock profiles (u1–u5) have been removed.
// SUPER ADMIN is @k54lid (telegramId 528269003). This is enforced
// server-side by checking telegramId on every authenticated request;
// the client role display is purely cosmetic and driven by the server response.
// ==========================================================================

export const SUPER_ADMIN_TELEGRAM_ID = 528269003;
export const SUPER_ADMIN_USERNAME = 'k54lid';

export const currentUser: UserProfile = {
  id: 'u_super_admin',
  telegramId: SUPER_ADMIN_TELEGRAM_ID,
  telegramUsername: SUPER_ADMIN_USERNAME,
  displayName: 'Khalid',
  photos: [],
  age: 29,
  heightCm: 178,
  weightKg: 72,
  country: 'Turkey',
  city: 'Istanbul',
  nationality: 'Turkish',
  relationshipStatus: 'single',
  lookingFor: ['friends', 'community'],
  bio: 'Building K5. Coffee, code, and city walks.',
  languages: ['English', 'Turkish'],
  interests: ['Tech', 'Coffee', 'Hiking'],
  occupation: 'Founder',
  lastActiveAt: new Date().toISOString(),
  isOnline: true,
  verification: 'none',
  membership: 'free',
  adminRole: 'super_admin',
  accountStatus: 'active',
  registeredAt: new Date(Date.now() - 86400000 * 90).toISOString(),
  privacy: {
    hideExactLocation: true,
    invisibleMode: false,
    hideOnlineStatus: false,
    privateProfile: false,
  },
};

// No fake profiles — all discovery comes from the real API
export const mockProfiles: UserProfile[] = [];

export const mockLocations: MapLocation[] = [];

export const mockMessages: Record<string, ChatMessage[]> = {};

// No fake conversations — real conversations come from the API
export const mockConversations: Conversation[] = [];

export const mockVerificationRequests: VerificationRequest[] = [];

export const mockReports: UserReport[] = [];

export const mockAdminActions: AdminAction[] = [];

export const mockStats: PlatformStats = {
  totalUsers: 0,
  activeToday: 0,
  activeThisMonth: 0,
  verifiedUsers: 0,
  premiumUsers: 0,
  pendingVerifications: 0,
  pendingReports: 0,
  bannedUsers: 0,
  newUsersToday: 0,
  newUsersThisWeek: 0,
};
