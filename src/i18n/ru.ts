import type { TranslationKey } from './en';

export const ru: Partial<Record<TranslationKey, string>> = {
  // Navigation
  discover: 'Открыть',
  groups: 'Группы',
  chat: 'Чат',
  profile: 'Профиль',

  // Discover
  newMembers: 'Новые участники',
  verifiedMembers: 'Проверенные участники',
  recentlyActive: 'Недавно активные',
  allMembers: 'Все участники',
  noProfilesYet: 'Профилей пока нет',
  noProfilesMatchFilters: 'Профили по фильтрам не найдены',
  online: 'Онлайн',
  offline: 'Офлайн',

  // Filters
  filters: 'Фильтры',
  showMe: 'Показывать мне',
  sexualOrientation: 'Сексуальная ориентация',
  ageRange: 'Возраст',
  relationshipStatus: 'Статус отношений',
  interests: 'Интересы',
  languages: 'Языки',
  verifiedOnly: 'Только проверенные',
  onlineNow: 'Онлайн сейчас',
  applyFilters: 'Применить фильтры',
  reset: 'Сбросить',
  onlyShowVerified: 'Показывать только проверенные профили',
  onlyShowOnline: 'Показывать только тех, кто онлайн',

  // Chat
  noConversationsYet: 'Чатов пока нет',
  startConversationHint: 'Начните разговор с чьего-либо профиля в разделе Открыть.',
  messageRequests: 'Запросы сообщений',
  wantsToMessage: 'Хочет отправить вам сообщение',
  noMessagesYet: 'Сообщений пока нет. Поздоровайтесь!',
  message: 'Сообщение…',
  send: 'Отправить',
  today: 'Сегодня',
  yesterday: 'Вчера',
  live: 'Онлайн',
  connecting: 'Подключение…',

  // Groups
  createGroup: 'Создать группу',
  groupName: 'Название группы',
  groupDescription: 'Описание',
  addGroupPhoto: 'Добавить фото группы',
  members: 'участников',
  join: 'Вступить',
  delete: 'Удалить',
  noGroupsYet: 'Групп пока нет',
  beFirstToCreate: 'Создайте первую группу сообщества!',
  couldNotCreateGroup: 'Не удалось создать группу. Попробуйте ещё раз.',
  creating: 'Создание…',
  groupInfo: 'Информация о группе',
  messageGroup: 'Сообщение…',

  // Stories
  addStory: 'Добавить историю',
  myStory: 'Моя история',
  viewersCount: 'просмотров',
  replyToStory: 'Ответить на историю…',
  storyExpired: 'Эта история истекла',
  noStoriesYet: 'Историй пока нет',

  // Profile
  editProfile: 'Редактировать профиль',
  displayName: 'Отображаемое имя',
  bio: 'О себе',
  occupation: 'Профессия',
  genderIdentity: 'Гендерная идентичность',
  interestedIn: 'Интересуюсь',
  orientation: 'Сексуальная ориентация',
  lookingFor: 'Ищу',
  languagesSpoken: 'Языки',
  saveChanges: 'Сохранить изменения',
  saving: 'Сохранение…',

  // Settings
  language: 'Язык',
  privacy: 'Конфиденциальность',
  notifications: 'Уведомления',
  help: 'Помощь и поддержка',
  premium: 'Премиум',
  verification: 'Получить верификацию',

  // Privacy
  invisibleMode: 'Режим невидимки',
  invisibleModeDesc: 'Немедленно скрывает ваш профиль из раздела Открыть и всех списков.',
  hideOnlineStatus: 'Скрыть статус онлайн',
  hideOnlineStatusDesc: 'Не показывать зелёный индикатор онлайн другим пользователям.',
  approximateLocation: 'Только приблизительное местоположение',
  approximateLocationDesc: 'Показывать общий район, а не точное местоположение.',
  blockedUsers: 'Заблокированные пользователи',
  noBlockedUsers: 'Вы никого не заблокировали.',
  unblock: 'Разблокировать',

  // Errors
  somethingWentWrong: 'Что-то пошло не так',
  tryAgain: 'Пожалуйста, попробуйте ещё раз.',
  failedToLoad: 'Не удалось загрузить. Попробуйте ещё раз.',

  // Admin
  adminPanel: 'Панель администратора',
  moderatorPanel: 'Панель модератора',
  allUsers: 'Все пользователи',
  verificationQueue: 'Очередь верификации',
  reports: 'Жалобы',
  auditLog: 'Журнал действий',
  moderators: 'Модераторы',
  announcements: 'Объявления',

  // Common
  cancel: 'Отмена',
  confirm: 'Подтвердить',
  close: 'Закрыть',
  loading: 'Загрузка…',
  search: 'Поиск',
  optional: 'Необязательно',
  required: 'обязательно',
  back: 'Назад',
  done: 'Готово',
  yes: 'Да',
  no: 'Нет',
};
