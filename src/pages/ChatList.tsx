import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { chatService } from '@/api/services';
import { wsClient } from '@/hooks/useGlobalWs';
import { useTranslation } from '@/i18n/useTranslation';
import type { Conversation } from '@/types';
import styles from './ChatList.module.css';
import { assetUrl } from '@/api/client';

// ==========================================================================
// ChatList — list of conversations sorted by most recent activity.
// Real-time updates move active conversations to the top instantly.
// Long-press or swipe reveals delete option (soft-delete for requester only).
// ==========================================================================

function sortByRecent(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => {
    const aTime = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0;
    const bTime = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function ChatListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    chatService.getConversations()
      .then(data => { setConversations(sortByRecent(data)); setLoading(false); })
      .catch(err => {
        console.error('Failed to load conversations:', err);
        setError(t('failedToLoadConversations'));
        setLoading(false);
      });
  }, []);

  // Live updates: update last message, increment unread, move conversation to top
  useEffect(() => {
    const handler = (_msg: Record<string, unknown>) => {
      const m = _msg.message as { conversationId: string; senderId: string; text?: string; sentAt?: string; type?: string };
      if (!m?.conversationId) return;
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id !== m.conversationId) return c;
          const isIncoming = m.senderId !== undefined && m.senderId !== c.participant?.id ? false : true;
          const newUnread = isIncoming ? c.unreadCount + 1 : c.unreadCount;
          return {
            ...c,
            unreadCount: newUnread,
            lastMessage: _msg.message as any,
          };
        });
        // Re-sort after update so the active conversation rises to the top
        return sortByRecent(updated);
      });
    };
    wsClient.addHandler('message', handler);
    return () => wsClient.removeHandler('message', handler);
  }, []);

  async function handleDeleteConversation(conversationId: string) {
    try {
      await chatService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch { /* fail silently */ }
    setConfirmDeleteId(null);
  }

  const requests = conversations.filter(c => c.isMessageRequest);
  const active = conversations.filter(c => !c.isMessageRequest);

  return (
    <div className={styles.page}>
      <PageHeader title={t('chat')} />
      <div className={styles.content}>
        {loading && (
          <div className={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}
          </div>
        )}

        {!loading && error && (
          <div className={styles.empty}>
            <h3>{t('somethingWentWrong')}</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <section className={styles.section}>
            {/* "Messages" replaces "Message Requests" per spec */}
            <h2 className={styles.sectionTitle}>{t('messageRequests')} ({requests.length})</h2>
            {requests.map(conv => (
              <ConversationRow key={conv.id} conversation={conv}
                onDelete={() => setConfirmDeleteId(conv.id)}
                onClick={() => {
                  setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
                  navigate(`/chat/${conv.id}`);
                }} />
            ))}
          </section>
        )}

        {!loading && !error && (
          <section className={styles.section}>
            {active.length === 0 ? (
              <div className={styles.empty}>
                <h3>{t('noConversationsYet')}</h3>
                <p>{t('startConversationHint')}</p>
              </div>
            ) : (
              active.map(conv => (
                <ConversationRow key={conv.id} conversation={conv}
                  onDelete={() => setConfirmDeleteId(conv.id)}
                  onClick={() => {
                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
                    navigate(`/chat/${conv.id}`);
                  }} />
              ))
            )}
          </section>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className={styles.deleteOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.deleteSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.deleteSheetHandle} />
            <h3 className={styles.deleteSheetTitle}>{t('deleteConversation')}?</h3>
            <p className={styles.deleteSheetDesc}>
              This conversation will be removed from your list. The other person can still see it unless they also delete it.
            </p>
            <button className={styles.deleteConfirmBtn} onClick={() => handleDeleteConversation(confirmDeleteId)}>
              <Trash2 size={16} /> {t('deleteConversation')}
            </button>
            <button className={styles.deleteCancelBtn} onClick={() => setConfirmDeleteId(null)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationRow({ conversation, onClick, onDelete }: {
  conversation: Conversation;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { participant, lastMessage, unreadCount, isMessageRequest } = conversation;
  const hasUnread = unreadCount > 0;
  const [showDelete, setShowDelete] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => setShowDelete(true), 600);
  }
  function handleTouchEnd() {
    clearTimeout(longPressTimer.current);
  }

  return (
    <div
      className={`${styles.rowWrap} ${showDelete ? styles.rowWrapSlid : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <button className={`${styles.row} ${hasUnread ? styles.rowUnread : ''}`} onClick={() => { setShowDelete(false); onClick(); }}>
        <Avatar
          src={participant.photos[0] ? assetUrl(participant.photos[0]) : ''}
          alt={participant.displayName}
          size={52}
          isOnline={participant.isOnline}
          verification={participant.verification}
          membership={participant.membership}
          adminRole={participant.adminRole}
        />
        <div className={styles.rowText}>
          <div className={styles.rowTop}>
            <span className={`${styles.rowName} ${hasUnread ? styles.rowNameBold : ''}`}>
              {participant.displayName}
            </span>
            {lastMessage && (
              <span className={styles.rowTime}>
                {formatDistanceToNowStrict(new Date(lastMessage.sentAt))} ago
              </span>
            )}
          </div>
          <div className={styles.rowBottom}>
            <span className={`${styles.rowPreview} ${hasUnread ? styles.rowPreviewBold : ''}`}>
              {isMessageRequest
                ? t('wantsToMessage')
                : lastMessage?.text ?? (lastMessage?.type === 'image' ? '📷 Photo' : t('noMessagesYet'))}
            </span>
            {hasUnread && (
              <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </div>
      </button>
      <button className={styles.deleteSlideBtn} onClick={e => { e.stopPropagation(); setShowDelete(false); onDelete(); }}>
        <Trash2 size={18} />
      </button>
    </div>
  );
}
