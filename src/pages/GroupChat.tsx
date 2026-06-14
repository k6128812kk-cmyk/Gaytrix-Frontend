import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Users } from 'lucide-react';
import { format } from 'date-fns';
import { groupService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { wsClient, useGlobalWs } from '@/hooks/useGlobalWs';
import { useSessionStore } from '@/context/sessionStore';
import type { CommunityGroupMessage, CommunityGroup } from '@/types';
import styles from './Conversation.module.css';

export function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { profile } = useSessionStore();
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [messages, setMessages] = useState<CommunityGroupMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useGlobalWs();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!groupId) return;
    Promise.all([
      groupService.getMessages(groupId),
      groupService.getGroups(),
    ]).then(([msgs, groups]) => {
      setMessages(msgs);
      const g = groups.find(g => g.id === groupId);
      if (g) setGroup(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [groupId]);

  // Real-time: subscribe to community_group_message WS events
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

  function handleSend() {
    if (!groupId || !draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    // Optimistic add
    const optimistic: CommunityGroupMessage = {
      id: `opt_${Date.now()}`,
      groupId: groupId!,
      senderId: profile?.id ?? '',
      senderName: profile?.displayName ?? '',
      senderPhoto: profile?.photos?.[0],
      text,
      sentAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    // Send via API (WS broadcast handled on server)
    groupService.sendMessage(groupId, text).then(saved => {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    }).catch(() => {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const photoSrc = group?.photoUrl ? assetUrl(group.photoUrl) : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        {photoSrc && <img src={photoSrc} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />}
        <div className={styles.headerInfo}>
          <span className={styles.headerName}>{group?.name ?? 'Group'}</span>
          <span className={styles.headerStatus}>
            <Users size={11} style={{ verticalAlign: 'middle' }} /> {group?.memberCount ?? 0} members
          </span>
        </div>
      </div>

      <div ref={scrollRef} className={styles.messages}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 24 }}>Loading...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 32 }}>
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.senderId === profile?.id;
          return (
            <div key={msg.id} className={`${styles.msgRow} ${isMe ? styles.msgRowMe : ''}`}>
              {!isMe && (
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-secondary)', marginBottom: 2 }}>
                  {msg.senderName}
                </div>
              )}
              <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}>
                <span className={styles.msgText}>{msg.text}</span>
                <span className={styles.msgTime}>{format(new Date(msg.sentAt), 'HH:mm')}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.inputRow}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message the group..."
          rows={1}
          className={styles.input}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!draft.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
