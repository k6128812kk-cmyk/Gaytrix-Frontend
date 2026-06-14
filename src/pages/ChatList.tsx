import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { chatService } from '@/api/services';
import { wsClient } from '@/hooks/useGlobalWs';
import { useTranslation } from '@/i18n/useTranslation';
import type { Conversation } from '@/types';
import styles from './ChatList.module.css';

// ==========================================================================
// ChatList — list of conversations with real-time unread indicators.
// ==========================================================================

export function ChatListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chatService.getConversations()
      .then(data => { setConversations(data); setLoading(false); })
      .catch(err => {
        console.error('Failed to load conversations:', err);
        setError(t('failedToLoadConversations'));
        setLoading(false);
      });
  }, []);

  // Listen for new incoming messages to update unread counts live
  useEffect(() => {
    const handler = (_msg: Record<string, unknown>) => {
      const m = _msg.message as { conversationId: string; senderId: string };
      if (!m?.conversationId) return;
      setConversations(prev => prev.map(c => {
        if (c.id !== m.conversationId) return c;
        if (m.senderId !== c.participant.id) return c;
        return { ...c, unreadCount: c.unreadCount + 1, lastMessage: _msg.message as any };
      }));
    };
    wsClient.addHandler('message', handler);
    return () => wsClient.removeHandler('message', handler);
  }, []);

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
            <h2 className={styles.sectionTitle}>{t('messageRequests')} ({requests.length})</h2>
            {requests.map(conv => (
              <ConversationRow key={conv.id} conversation={conv}
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
                  onClick={() => {
                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
                    navigate(`/chat/${conv.id}`);
                  }} />
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conversation, onClick }: { conversation: Conversation; onClick: () => void }) {
  const { t } = useTranslation();
  const { participant, lastMessage, unreadCount, isMessageRequest } = conversation;
  const hasUnread = unreadCount > 0;

  return (
    <button className={`${styles.row} ${hasUnread ? styles.rowUnread : ''}`} onClick={onClick}>
      <Avatar
        src={participant.photos[0]}
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
  );
}
