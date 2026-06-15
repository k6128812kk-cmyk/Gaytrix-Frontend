import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Users, Info, BellOff, Bell } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { groupService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { wsClient, useGlobalWs } from '@/hooks/useGlobalWs';
import { useSessionStore } from '@/context/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import type { CommunityGroupMessage, CommunityGroup } from '@/types';
import styles from './GroupChat.module.css';

export function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { profile } = useSessionStore();
  const { t } = useTranslation();
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [messages, setMessages] = useState<CommunityGroupMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useGlobalWs();

  function dateSeparatorLabel(date: Date): string {
    if (isToday(date)) return t('today');
    if (isYesterday(date)) return t('yesterday');
    return format(date, 'MMMM d, yyyy');
  }

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!groupId) return;
    Promise.all([
      groupService.getGroup(groupId),
      groupService.getMessages(groupId),
    ]).then(([g, msgs]) => {
      setGroup(g);
      setIsMuted(g.isMuted || false);
      setMessages(msgs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    const handler = (msg: Record<string, unknown>) => {
      const gm = msg.message as CommunityGroupMessage;
      if (gm?.groupId === groupId) {
        setMessages(prev => prev.some(m => m.id === gm.id) ? prev : [...prev, gm]);
      }
    };
    wsClient.addHandler('community_group_message', handler);
    return () => wsClient.removeHandler('community_group_message', handler);
  }, [groupId]);

  async function handleToggleMute() {
    if (!groupId) return;
    try {
      if (isMuted) {
        await groupService.unmuteGroup(groupId);
        setIsMuted(false);
      } else {
        await groupService.muteGroup(groupId);
        setIsMuted(true);
      }
    } catch { /* fail silently */ }
  }

  function handleSend() {
    if (!groupId || !draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    const optimistic: CommunityGroupMessage = {
      id: `opt_${Date.now()}`,
      groupId: groupId!,
      senderId: profile?.id ?? '',
      senderName: profile?.displayName ?? '',
      senderPhoto: profile?.photos?.[0],
      text,
      contentType: 'text',
      sentAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    groupService.sendMessage(groupId, text)
      .then(saved => setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m)))
      .catch(() => setMessages(prev => prev.filter(m => m.id !== optimistic.id)));
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  const photoSrc = group?.photoUrl ? assetUrl(group.photoUrl) : null;

  const rendered: Array<{ type: 'separator'; label: string } | { type: 'msg'; msg: CommunityGroupMessage; showAvatar: boolean; showName: boolean }> = [];
  let lastDate = '';
  let lastSender = '';

  messages.forEach((msg, i) => {
    const d = new Date(msg.sentAt);
    const dateKey = format(d, 'yyyy-MM-dd');
    if (dateKey !== lastDate) {
      rendered.push({ type: 'separator', label: dateSeparatorLabel(d) });
      lastDate = dateKey;
      lastSender = '';
    }
    const nextMsg = messages[i + 1];
    const sameNext = nextMsg?.senderId === msg.senderId &&
      format(new Date(nextMsg.sentAt), 'yyyy-MM-dd') === dateKey;
    rendered.push({ type: 'msg', msg, showAvatar: !sameNext, showName: lastSender !== msg.senderId });
    lastSender = msg.senderId;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label={t('back')}>
          <ArrowLeft size={20} />
        </button>
        {photoSrc
          ? <img src={photoSrc} alt="" className={styles.headerPhoto} />
          : <div className={styles.headerPhotoPlaceholder}><Users size={18} /></div>
        }
        <button className={styles.headerInfo} onClick={() => navigate(`/groups/${groupId}/info`)} aria-label={t('groupInfo')}>
          <span className={styles.headerName}>{group?.name ?? t('groups')}</span>
          <span className={styles.headerSub}>{group?.memberCount ?? 0} {t('members')}</span>
        </button>
        <button
          className={styles.muteBtn}
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
          aria-label={isMuted ? 'Unmute notifications' : 'Mute notifications'}
        >
          {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
        </button>
        <button className={styles.infoBtn} onClick={() => navigate(`/groups/${groupId}/info`)} aria-label={t('groupInfo')}>
          <Info size={18} />
        </button>
      </div>

      <div ref={scrollRef} className={styles.messages}>
        {loading && <div className={styles.loading}>{t('loading')}</div>}
        {!loading && messages.length === 0 && (
          <div className={styles.empty}>{t('noMessagesYet')} 👋</div>
        )}
        {rendered.map((item, i) => {
          if (item.type === 'separator') {
            return <div key={`sep-${i}`} className={styles.dateSep}><span>{item.label}</span></div>;
          }
          const { msg, showAvatar, showName } = item;
          const isMe = msg.senderId === profile?.id;
          const senderSrc = msg.senderPhoto ? assetUrl(msg.senderPhoto) : null;
          return (
            <div key={msg.id} className={`${styles.row} ${isMe ? styles.rowMe : styles.rowThem}`}>
              {!isMe && (
                <div className={styles.avatarWrap}>
                  {showAvatar ? (
                    <button className={styles.avatar} onClick={() => navigate(`/u/${msg.senderId}`)}>
                      {senderSrc
                        ? <img src={senderSrc} alt={msg.senderName} className={styles.avatarImg} />
                        : <div className={styles.avatarFallback}>{(msg.senderName?.[0] ?? '?').toUpperCase()}</div>
                      }
                    </button>
                  ) : <div className={styles.avatarGhost} />}
                </div>
              )}
              <div className={styles.bubbleGroup}>
                {!isMe && showName && <span className={styles.senderName}>{msg.senderName}</span>}
                <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}>
                  {msg.contentType === 'image' && msg.mediaUrl ? (
                    <img src={assetUrl(msg.mediaUrl)} alt="Photo" style={{ maxWidth: 200, borderRadius: 10, display: 'block' }} />
                  ) : (
                    <span className={styles.msgText}>{msg.text}</span>
                  )}
                  <span className={styles.msgTime}>{format(new Date(msg.sentAt), 'HH:mm')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.composer}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={handleDraftChange}
          onKeyDown={handleKey}
          placeholder={t('message')}
          rows={1}
          className={styles.composerInput}
        />
        <button className={styles.sendBtn} onClick={handleSend} disabled={!draft.trim()} aria-label={t('send')}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
