import { api } from './client';
import type {
  UserProfile, MapLocation, MapEvent, EventAttendee, GroupMessage,
  Conversation, ChatMessage,
  DiscoveryFilters, VerificationRequest,
  UserReport, AdminAction, PlatformStats,
  Story, MyStory, StoryViewer, CommunityGroup, CommunityGroupMessage, GroupSortOption,
  GroupJoinRequest,
} from '@/types';
import {
  currentUser, mockProfiles, mockLocations, mockConversations,
  mockMessages, mockVerificationRequests, mockReports,
  mockAdminActions, mockStats,
} from '@/mock/data';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ==========================================================================
// Profile service
// ==========================================================================
export const profileService = {
  async getMe(): Promise<UserProfile> {
    if (USE_MOCKS) { await delay(150); return currentUser; }
    const { data } = await api.get<UserProfile>('/profile/me');
    return data;
  },
  async uploadPhoto(file: File): Promise<string> {
    if (USE_MOCKS) {
      await delay(300);
      return URL.createObjectURL(file); // local blob only in mock mode
    }
    const form = new FormData();
    form.append('photo', file);
    const { data } = await api.post<{ url: string }>('/profile/photos', form);
    // Backend now returns an absolute URL directly
    return data.url;
  },
  async updateMe(patch: Partial<UserProfile>): Promise<UserProfile> {
    if (USE_MOCKS) { await delay(200); return { ...currentUser, ...patch }; }
    const { data } = await api.patch<UserProfile>('/profile/me', patch);
    return data;
  },
  async requestVerification(selfieFile: File): Promise<{ status: 'pending' }> {
    if (USE_MOCKS) { await delay(400); return { status: 'pending' }; }
    const form = new FormData();
    form.append('selfie', selfieFile);
    const { data } = await api.post('/verification/request', form);
    return data;
  },
  async reportUser(userId: string, reason: string, details?: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(200); console.log('Reported user', userId, reason); return { ok: true }; }
    const { data } = await api.post(`/users/${userId}/report`, { reason, details });
    return data;
  },
  async blockUser(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(200); return { ok: true }; }
    const { data } = await api.post(`/users/${userId}/block`);
    return data;
  },
};

// ==========================================================================
// Discovery service
// ==========================================================================
export const discoveryService = {
  async getNearby(filters?: Partial<DiscoveryFilters>): Promise<UserProfile[]> {
    if (USE_MOCKS) {
      await delay(300);
      // Filter out suspended/banned accounts from discovery
      return mockProfiles.filter(p => p.accountStatus === 'active');
    }
    const { data } = await api.get<UserProfile[]>('/discovery/nearby', { params: filters });
    return data;
  },
  async getExplore(section: 'trending' | 'new' | 'verified' | 'recent', filters?: Partial<DiscoveryFilters>): Promise<UserProfile[]> {
    if (USE_MOCKS) {
      await delay(250);
      const active = mockProfiles.filter(p => p.accountStatus === 'active');
      switch (section) {
        case 'trending': return active.filter(p => p.membership === 'premium');
        case 'new': return [...active].reverse();
        case 'verified': return active.filter(p => p.verification === 'verified');
        case 'recent': return active.filter(p => p.isOnline);
      }
    }
    const { data } = await api.get<UserProfile[]>(`/discovery/explore/${section}`, { params: filters });
    return data;
  },
  async getProfile(id: string): Promise<UserProfile | undefined> {
    if (USE_MOCKS) {
      await delay(150);
      const p = mockProfiles.find(p => p.id === id) ?? currentUser;
      // Don't expose suspended/banned profiles to regular users
      if (p.accountStatus !== 'active' && p.id !== currentUser.id) return undefined;
      return p;
    }
    const { data } = await api.get<UserProfile>(`/profiles/${id}`);
    return data;
  },
};

// ==========================================================================
// Map service
// ==========================================================================
export const mapService = {
  async getLocations(): Promise<MapLocation[]> {
    if (USE_MOCKS) { await delay(250); return mockLocations; }
    const { data } = await api.get<MapLocation[]>('/map/locations');
    return data;
  },
  async upvote(locationId: string): Promise<{ upvotes: number }> {
    if (USE_MOCKS) {
      await delay(150);
      const loc = mockLocations.find(l => l.id === locationId);
      return { upvotes: (loc?.upvotes ?? 0) + 1 };
    }
    const { data } = await api.post(`/map/locations/${locationId}/upvote`);
    return data;
  },
  async report(locationId: string, reason: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.post(`/map/locations/${locationId}/report`, { reason });
    return data;
  },
  async createLocation(payload: Omit<MapLocation, 'id' | 'upvotes' | 'reportsCount' | 'createdAt'>): Promise<MapLocation> {
    if (USE_MOCKS) {
      await delay(250);
      return { ...payload, id: `loc_${Date.now()}`, upvotes: 0, reportsCount: 0, createdAt: new Date().toISOString() };
    }
    const { data } = await api.post<MapLocation>('/map/locations', payload);
    return data;
  },
};

// ==========================================================================
// Chat service
// ==========================================================================
export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    if (USE_MOCKS) { await delay(250); return mockConversations; }
    const { data } = await api.get<Conversation[]>('/messages/conversations');
    return data;
  },
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    if (USE_MOCKS) { await delay(200); return mockMessages[conversationId] ?? []; }
    const { data } = await api.get<ChatMessage[]>(`/messages/conversations/${conversationId}`);
    return data;
  },
  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    if (USE_MOCKS) {
      await delay(150);
      return {
        id: `m_${Date.now()}`, conversationId,
        senderId: currentUser.id, type: 'text', text,
        sentAt: new Date().toISOString(), readAt: null,
      };
    }
    const { data } = await api.post<ChatMessage>(`/messages/conversations/${conversationId}`, { text });
    return data;
  },
  async startConversation(targetUserId: string): Promise<{ conversationId: string }> {
    if (USE_MOCKS) {
      await delay(200);
      return { conversationId: `conv_${Date.now()}` };
    }
    const { data } = await api.post<{ conversationId: string }>('/messages/start', { targetUserId });
    return data;
  },
  async deleteConversation(conversationId: string): Promise<{ ok: boolean; fullyDeleted: boolean }> {
    if (USE_MOCKS) { await delay(200); return { ok: true, fullyDeleted: false }; }
    const { data } = await api.delete(`/messages/conversations/${conversationId}`);
    return data;
  },
  async sendPhotoMessage(conversationId: string, file: File): Promise<ChatMessage> {
    if (USE_MOCKS) {
      await delay(300);
      return {
        id: `m_${Date.now()}`, conversationId,
        senderId: currentUser.id, type: 'image',
        mediaUrl: URL.createObjectURL(file),
        sentAt: new Date().toISOString(), readAt: null,
      };
    }
    const form = new FormData();
    form.append('photo', file);
    const { data } = await api.post<ChatMessage>(
      `/messages/conversations/${conversationId}/photo`, form
    );
    return data;
  },
};

// ==========================================================================
// Event service
// ==========================================================================
export const eventService = {
  async getEvents(): Promise<MapEvent[]> {
    if (USE_MOCKS) { await delay(250); return []; }
    const { data } = await api.get<MapEvent[]>('/events');
    return data;
  },
  async createEvent(payload: {
    title: string; description: string; category: string;
    lat: number; lng: number; startsAt: string; endsAt?: string; maxAttendees?: number;
  }): Promise<MapEvent> {
    if (USE_MOCKS) {
      await delay(300);
      return { ...payload, id: `ev_${Date.now()}`, createdBy: currentUser.id,
        creatorName: currentUser.displayName, creatorPhoto: currentUser.photos[0],
        status: 'active', attendeeCount: 1, isAttending: true,
        createdAt: new Date().toISOString(), reportsCount: 0,
        groupConversationId: undefined } as MapEvent;
    }
    const { data } = await api.post<MapEvent>('/events', payload);
    return data;
  },
  async joinEvent(eventId: string): Promise<{ ok: boolean; attendeeCount: number; groupConversationId?: string }> {
    if (USE_MOCKS) { await delay(150); return { ok: true, attendeeCount: 1 }; }
    const { data } = await api.post(`/events/${eventId}/join`);
    return data;
  },
  async leaveEvent(eventId: string): Promise<{ ok: boolean; attendeeCount: number }> {
    if (USE_MOCKS) { await delay(150); return { ok: true, attendeeCount: 0 }; }
    const { data } = await api.post(`/events/${eventId}/leave`);
    return data;
  },
  async deleteEvent(eventId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(200); return { ok: true }; }
    const { data } = await api.delete(`/events/${eventId}`);
    return data;
  },
  async updateEvent(eventId: string, patch: Partial<{ title: string; description: string; startsAt: string; endsAt: string; maxAttendees: number }>): Promise<MapEvent> {
    if (USE_MOCKS) { await delay(200); return {} as MapEvent; }
    const { data } = await api.patch<MapEvent>(`/events/${eventId}`, patch);
    return data;
  },
  async getAttendees(eventId: string): Promise<EventAttendee[]> {
    if (USE_MOCKS) { await delay(150); return []; }
    const { data } = await api.get<EventAttendee[]>(`/events/${eventId}/attendees`);
    return data;
  },
  async reportEvent(eventId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.post(`/events/${eventId}/report`);
    return data;
  },
  async getGroupMessages(conversationId: string): Promise<GroupMessage[]> {
    if (USE_MOCKS) { await delay(150); return []; }
    const { data } = await api.get<GroupMessage[]>(`/group-chat/${conversationId}/messages`);
    return data;
  },
  async sendGroupMessage(conversationId: string, text: string): Promise<GroupMessage> {
    if (USE_MOCKS) { await delay(150); return {} as GroupMessage; }
    const { data } = await api.post<GroupMessage>(`/group-chat/${conversationId}/messages`, { text });
    return data;
  },
};

// ==========================================================================
// Admin service — all endpoints 403 unless adminRole is admin/super_admin
// The backend enforces this; the frontend just calls the endpoints.
// ==========================================================================
export const adminService = {
  async getStats(): Promise<PlatformStats> {
    if (USE_MOCKS) { await delay(300); return mockStats; }
    const { data } = await api.get<PlatformStats>('/admin/stats');
    return data;
  },
  async getUsers(params?: { search?: string; status?: string; verification?: string; page?: number }): Promise<UserProfile[]> {
    if (USE_MOCKS) {
      await delay(300);
      let users = [currentUser, ...mockProfiles];
      if (params?.search) {
        const q = params.search.toLowerCase();
        users = users.filter(u =>
          u.displayName.toLowerCase().includes(q) ||
          u.telegramUsername.toLowerCase().includes(q)
        );
      }
      if (params?.status) users = users.filter(u => u.accountStatus === params.status);
      if (params?.verification) users = users.filter(u => u.verification === params.verification);
      return users;
    }
    const { data } = await api.get<UserProfile[]>('/admin/users', { params });
    return data;
  },
  async getVerificationQueue(): Promise<VerificationRequest[]> {
    if (USE_MOCKS) { await delay(250); return mockVerificationRequests; }
    const { data } = await api.get<VerificationRequest[]>('/admin/verification/queue');
    return data;
  },
  async approveVerification(requestId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/verification/${requestId}/approve`);
    return data;
  },
  async rejectVerification(requestId: string, reason: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/verification/${requestId}/reject`, { reason });
    return data;
  },
  async getReports(): Promise<UserReport[]> {
    if (USE_MOCKS) { await delay(250); return mockReports; }
    const { data } = await api.get<UserReport[]>('/admin/reports');
    return data;
  },
  async dismissReport(reportId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(200); return { ok: true }; }
    const { data } = await api.post(`/admin/reports/${reportId}/dismiss`);
    return data;
  },
  async banUser(userId: string, reason: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/ban`, { reason });
    return data;
  },
  async suspendUser(userId: string, reason: string, durationDays?: number): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/suspend`, { reason, durationDays });
    return data;
  },
  async unsuspendUser(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/unsuspend`);
    return data;
  },
  async removeUser(userId: string, reason: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.delete(`/admin/users/${userId}`, { data: { reason } });
    return data;
  },
  async revokePremium(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/revoke-premium`);
    return data;
  },
  async grantPremium(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/grant-premium`);
    return data;
  },
  async removeVerification(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/remove-verification`);
    return data;
  },
  async grantVerification(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/grant-verification`);
    return data;
  },
  async sendAnnouncement(message: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(400); console.log('Announcement:', message); return { ok: true }; }
    const { data } = await api.post('/admin/announcements', { message });
    return data;
  },
  async getModerators(): Promise<UserProfile[]> {
    if (USE_MOCKS) { await delay(300); return []; }
    const { data } = await api.get<UserProfile[]>('/admin/moderators');
    return data;
  },
  async promoteModerator(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/promote-moderator`);
    return data;
  },
  async demoteModerator(userId: string): Promise<{ ok: true }> {
    if (USE_MOCKS) { await delay(300); return { ok: true }; }
    const { data } = await api.post(`/admin/users/${userId}/demote-moderator`);
    return data;
  },
  async getAuditLog(): Promise<AdminAction[]> {
    if (USE_MOCKS) { await delay(250); return mockAdminActions; }
    const { data } = await api.get<AdminAction[]>('/admin/audit-log');
    return data;
  },
};

// ==========================================================================
// Group Chat service
// ==========================================================================
export const groupService = {
  async getGroups(sort?: GroupSortOption, search?: string): Promise<CommunityGroup[]> {
    if (USE_MOCKS) { await delay(250); return []; }
    const { data } = await api.get<CommunityGroup[]>('/groups', { params: { sort, search } });
    return data;
  },
  async getGroup(groupId: string): Promise<CommunityGroup> {
    if (USE_MOCKS) { await delay(150); return {} as CommunityGroup; }
    const { data } = await api.get<CommunityGroup>(`/groups/${groupId}`);
    return data;
  },
  async createGroup(name: string, description: string, photo?: File, isPrivate?: boolean): Promise<CommunityGroup> {
    if (USE_MOCKS) {
      await delay(300);
      return { id: `g_${Date.now()}`, name, description, createdBy: currentUser.id,
        creatorName: currentUser.displayName, memberCount: 1, isMember: true,
        userRole: 'creator', isMuted: false, isPrivate: isPrivate || false,
        lastMessageAt: new Date().toISOString(), createdAt: new Date().toISOString(), status: 'active' };
    }
    const form = new FormData();
    form.append('name', name);
    form.append('description', description);
    if (photo) form.append('photo', photo);
    if (isPrivate !== undefined) form.append('isPrivate', String(isPrivate));
    const { data } = await api.post<CommunityGroup>('/groups', form);
    return data;
  },
  async updateGroup(groupId: string, patch: { name?: string; description?: string; isPrivate?: boolean; photo?: File }): Promise<CommunityGroup> {
    if (USE_MOCKS) { await delay(200); return {} as CommunityGroup; }
    const form = new FormData();
    if (patch.name) form.append('name', patch.name);
    if (patch.description !== undefined) form.append('description', patch.description);
    if (patch.isPrivate !== undefined) form.append('isPrivate', String(patch.isPrivate));
    if (patch.photo) form.append('photo', patch.photo);
    const { data } = await api.patch<CommunityGroup>(`/groups/${groupId}`, form);
    return data;
  },
  async joinGroup(groupId: string): Promise<{ ok: boolean; status: string; memberCount?: number }> {
    if (USE_MOCKS) { await delay(150); return { ok: true, status: 'joined', memberCount: 1 }; }
    const { data } = await api.post(`/groups/${groupId}/join`);
    return data;
  },
  async leaveGroup(groupId: string): Promise<{ ok: boolean; memberCount: number }> {
    if (USE_MOCKS) { await delay(150); return { ok: true, memberCount: 0 }; }
    const { data } = await api.post(`/groups/${groupId}/leave`);
    return data;
  },
  async deleteGroup(groupId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(200); return { ok: true }; }
    const { data } = await api.delete(`/groups/${groupId}`);
    return data;
  },
  async getGroupMembers(groupId: string): Promise<(EventAttendee & { groupRole: string })[]> {
    if (USE_MOCKS) { return []; }
    const { data } = await api.get<(EventAttendee & { groupRole: string })[]>(`/groups/${groupId}/members`);
    return data;
  },
  async getMessages(groupId: string): Promise<CommunityGroupMessage[]> {
    if (USE_MOCKS) { await delay(150); return []; }
    const { data } = await api.get<CommunityGroupMessage[]>(`/groups/${groupId}/messages`);
    return data;
  },
  async sendMessage(groupId: string, text: string): Promise<CommunityGroupMessage> {
    if (USE_MOCKS) { await delay(150); return {} as CommunityGroupMessage; }
    const { data } = await api.post<CommunityGroupMessage>(`/groups/${groupId}/messages`, { text });
    return data;
  },
  async addModerator(groupId: string, userId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.post(`/groups/${groupId}/moderators/${userId}`);
    return data;
  },
  async removeModerator(groupId: string, userId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.delete(`/groups/${groupId}/moderators/${userId}`);
    return data;
  },
  async getJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
    if (USE_MOCKS) { return []; }
    const { data } = await api.get<GroupJoinRequest[]>(`/groups/${groupId}/join-requests`);
    return data;
  },
  async approveJoinRequest(groupId: string, requestId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.post(`/groups/${groupId}/join-requests/${requestId}/approve`);
    return data;
  },
  async rejectJoinRequest(groupId: string, requestId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.post(`/groups/${groupId}/join-requests/${requestId}/reject`);
    return data;
  },
  async muteGroup(groupId: string): Promise<{ ok: boolean; muted: boolean }> {
    if (USE_MOCKS) { return { ok: true, muted: true }; }
    const { data } = await api.post(`/groups/${groupId}/mute`);
    return data;
  },
  async unmuteGroup(groupId: string): Promise<{ ok: boolean; muted: boolean }> {
    if (USE_MOCKS) { return { ok: true, muted: false }; }
    const { data } = await api.delete(`/groups/${groupId}/mute`);
    return data;
  },
  async kickMember(groupId: string, userId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.delete(`/groups/${groupId}/members/${userId}`);
    return data;
  },
  async deleteGroupMessage(groupId: string, messageId: string): Promise<{ ok: boolean }> {
    if (USE_MOCKS) { await delay(150); return { ok: true }; }
    const { data } = await api.delete(`/groups/${groupId}/messages/${messageId}`);
    return data;
  },
};

// ==========================================================================
// Stories service
// ==========================================================================
export const storyService = {
  async getStories(): Promise<{ myStory: MyStory | null; stories: Story[] }> {
    if (USE_MOCKS) { await delay(200); return { myStory: null, stories: [] }; }
    const { data } = await api.get<{ myStory: MyStory | null; stories: Story[] }>('/stories');
    return data;
  },
  async createStory(photo: File, caption?: string): Promise<MyStory> {
    if (USE_MOCKS) { await delay(300); return { id: `s_${Date.now()}`, photoUrl: URL.createObjectURL(photo), caption: caption || '', createdAt: new Date().toISOString(), allStories: [] }; }
    const form = new FormData();
    form.append('photo', photo);
    if (caption) form.append('caption', caption);
    const { data } = await api.post<MyStory>('/stories', form);
    return data;
  },
  async markViewed(storyId: string): Promise<void> {
    if (USE_MOCKS) { return; }
    await api.post(`/stories/${storyId}/view`);
  },
  async deleteStory(storyId: string): Promise<void> {
    if (USE_MOCKS) { return; }
    await api.delete(`/stories/${storyId}`);
  },
  async getViewers(storyId: string): Promise<StoryViewer[]> {
    if (USE_MOCKS) { return []; }
    const { data } = await api.get<StoryViewer[]>(`/stories/${storyId}/viewers`);
    return data;
  },
  async replyToStory(storyId: string, text: string): Promise<{ ok: boolean; conversationId: string }> {
    if (USE_MOCKS) { return { ok: true, conversationId: '' }; }
    const { data } = await api.post(`/stories/${storyId}/reply`, { text });
    return data;
  },
};
