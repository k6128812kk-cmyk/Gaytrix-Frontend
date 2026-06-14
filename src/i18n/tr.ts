import type { TranslationKey } from './en';

export const tr: Partial<Record<TranslationKey, string>> = {
  // Navigation
  discover: 'Keşfet',
  groups: 'Gruplar',
  chat: 'Sohbet',
  profile: 'Profil',

  // Discover
  newMembers: 'Yeni üyeler',
  verifiedMembers: 'Doğrulanmış üyeler',
  recentlyActive: 'Son aktif',
  allMembers: 'Tüm üyeler',
  noProfilesYet: 'Henüz profil yok',
  noProfilesMatchFilters: 'Filtrelere uyan profil bulunamadı',
  online: 'Çevrimiçi',
  offline: 'Çevrimdışı',

  // Filters
  filters: 'Filtreler',
  showMe: 'Bana göster',
  sexualOrientation: 'Cinsel yönelim',
  ageRange: 'Yaş aralığı',
  relationshipStatus: 'İlişki durumu',
  interests: 'İlgi alanları',
  languages: 'Diller',
  verifiedOnly: 'Yalnızca doğrulanmış',
  onlineNow: 'Şu an çevrimiçi',
  applyFilters: 'Filtreleri uygula',
  reset: 'Sıfırla',
  onlyShowVerified: 'Yalnızca doğrulanmış profilleri göster',
  onlyShowOnline: 'Yalnızca şu an çevrimiçi olanları göster',

  // Chat
  noConversationsYet: 'Henüz sohbet yok',
  startConversationHint: "Keşfet'ten birinin profili üzerinden sohbet başlatın.",
  messageRequests: 'Mesaj istekleri',
  wantsToMessage: 'Size mesaj göndermek istiyor',
  noMessagesYet: 'Henüz mesaj yok. Merhaba deyin!',
  message: 'Mesaj…',
  send: 'Gönder',
  today: 'Bugün',
  yesterday: 'Dün',
  live: 'Canlı',
  connecting: 'Bağlanıyor…',

  // Groups
  createGroup: 'Grup oluştur',
  groupName: 'Grup adı',
  groupDescription: 'Açıklama',
  addGroupPhoto: 'Grup fotoğrafı ekle',
  members: 'üye',
  join: 'Katıl',
  delete: 'Sil',
  noGroupsYet: 'Henüz grup yok',
  beFirstToCreate: 'İlk topluluk grubunu sen oluştur!',
  couldNotCreateGroup: 'Grup oluşturulamadı. Lütfen tekrar deneyin.',
  creating: 'Oluşturuluyor…',
  groupInfo: 'Grup Bilgisi',
  messageGroup: 'Mesaj…',

  // Stories
  addStory: 'Hikaye ekle',
  myStory: 'Hikayem',
  viewersCount: 'görüntülenme',
  replyToStory: 'Hikayeye yanıtla…',
  storyExpired: 'Bu hikaye sona erdi',
  noStoriesYet: 'Henüz hikaye yok',

  // Profile
  editProfile: 'Profili düzenle',
  displayName: 'Görünen ad',
  bio: 'Hakkımda',
  occupation: 'Meslek',
  genderIdentity: 'Cinsiyet kimliği',
  interestedIn: 'İlgilendiğim',
  orientation: 'Cinsel yönelim',
  lookingFor: 'Aradığım',
  languagesSpoken: 'Konuşulan diller',
  saveChanges: 'Değişiklikleri kaydet',
  saving: 'Kaydediliyor…',

  // Settings
  language: 'Dil',
  privacy: 'Gizlilik',
  notifications: 'Bildirimler',
  help: 'Yardım & Destek',
  premium: 'Premium',
  verification: 'Doğrulama al',

  // Privacy
  invisibleMode: 'Görünmez mod',
  invisibleModeDesc: 'Profilinizi Keşfet ve tüm üye listelerinden hemen gizler.',
  hideOnlineStatus: 'Çevrimiçi durumunu gizle',
  hideOnlineStatusDesc: 'Diğer kullanıcılara yeşil çevrimiçi göstergesini göstermeyi durdur.',
  approximateLocation: 'Yalnızca yaklaşık konum',
  approximateLocationDesc: 'Kesin konumunuz yerine genel bölgenizi gösterin.',
  blockedUsers: 'Engellenen kullanıcılar',
  noBlockedUsers: 'Hiçbir kişiyi engellememisiniz.',
  unblock: 'Engeli kaldır',

  // Errors
  somethingWentWrong: 'Bir şeyler ters gitti',
  tryAgain: 'Lütfen tekrar deneyin.',
  failedToLoad: 'Yüklenemedi. Lütfen tekrar deneyin.',

  // Admin
  adminPanel: 'Yönetici Paneli',
  moderatorPanel: 'Moderatör Paneli',
  allUsers: 'Tüm kullanıcılar',
  verificationQueue: 'Doğrulama kuyruğu',
  reports: 'Raporlar',
  auditLog: 'Denetim günlüğü',
  moderators: 'Moderatörler',
  announcements: 'Duyurular',

  // Common
  cancel: 'İptal',
  confirm: 'Onayla',
  close: 'Kapat',
  loading: 'Yükleniyor…',
  search: 'Ara',
  optional: 'İsteğe bağlı',
  required: 'gerekli',
  back: 'Geri',
  done: 'Tamam',
  yes: 'Evet',
  no: 'Hayır',
};
