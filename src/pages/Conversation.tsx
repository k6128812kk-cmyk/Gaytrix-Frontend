import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Mic, Image as ImageIcon, Check, CheckCheck, X, Trash2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { chatService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { wsClient } from '@/hooks/useGlobalWs';
import type { ChatMessage, Conversation } from '@/types';
import styles from './Conversation.module.css';

// ==========================================================================
// ConversationPage — real-time 1:1 chat using the shared global WebSocket.
// All real-time events go through wsClient (the global singleton).
// ==========================================================================

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSessionStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ file: File; url: string } | null>(null);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // Load history via REST on mount
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      chatService.getConversations(),
      chatService.getMessages(id),
    ]).then(([convos, msgs]) => {
      setConversation(convos.find((c) => c.id === id) ?? null);
      setMessages(msgs);
      setLoading(false);

      wsClient.send({ type: 'mark_read', conversationId: id });
      wsClient.send({ type: 'get_unread_count' });
    }).catch(() => setLoading(false));
  }, [id]);

  // Subscribe to real-time events via shared global WS
  useEffect(() => {
    if (!id) return;

    const onMessage = (raw: Record<string, unknown>) => {
      const msg = raw.message as ChatMessage | undefined;
      if (!msg || msg.conversationId !== id) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setPartnerTyping(false);

      wsClient.send({ type: 'mark_read', conversationId: id });
      wsClient.send({ type: 'get_unread_count' });
    };

    const onReadReceipt = (raw: Record<string, unknown>) => {
      if (raw.conversationId !== id) return;
      const readAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === profile?.id && !m.readAt ? { ...m, readAt } : m
        )
      );
    };

    const onTyping = (raw: Record<string, unknown>) => {
      if (raw.conversationId !== id) return;
      if (raw.userId === profile?.id) return;
      setPartnerTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPartnerTyping(false), 3000);
    };

    wsClient.addHandler('message', onMessage);
    wsClient.addHandler('read_receipt', onReadReceipt);
    wsClient.addHandler('typing', onTyping);

    return () => {
      wsClient.removeHandler('message', onMessage);
      wsClient.removeHandler('read_receipt', onReadReceipt);
      wsClient.removeHandler('typing', onTyping);
      clearTimeout(typingTimer.current);
    };
  }, [id, profile?.id]);

  function handleDraftChange(value: string) {
    setDraft(value);
    if (id) {
      wsClient.send({ type: 'typing', conversationId: id });
    }
  }

  async function handleSend() {
    if (!id || !draft.trim()) return;
    const text = draft.trim();
    setDraft('');

    const sent = wsClient.send({ type: 'send_message', conversationId: id, text });
    if (!sent) {
      try {
        const message = await chatService.sendMessage(id, text);
        setMessages((prev) => [...prev, message]);
      } catch (err) {
        console.error('Failed to send message:', err);
        setDraft(text);
      }
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  }

  async function handleSendPhoto() {
    if (!id || !photoPreview) return;
    setSendingPhoto(true);
    try {
      const message = await chatService.sendPhotoMessage(id, photoPreview.file);
      setMessages((prev) => [...prev, message]);
      setPhotoPreview(null);
    } catch (err) {
      console.error('Failed to send photo:', err);
    } finally {
      setSendingPhoto(false);
    }
  }

  async function handleDeleteConversation() {
    if (!id) return;
    try {
      await chatService.deleteConversation(id);
      navigate('/chat', { replace: true });
    } catch { /* fail silently */ }
    setShowDeleteConfirm(false);
  }

  const participant = conversation?.participant;
  const title = participant?.displayName ?? t('chat');
  const currentUserId = profile?.id ?? '';

  const participantPhotoSrc = participant?.photos?.[0]
    ? (participant.photos[0].startsWith('http') ? participant.photos[0] : assetUrl(participant.photos[0]))
    : null;

  function goToProfile() {
    if (participant?.id) navigate(`/u/${participant.id}`);
  }

  // Build message list with date separators
  let lastDateKey = '';
  const msgItems: Array<{ type: 'sep'; label: string } | { type: 'msg'; msg: (typeof messages)[0] }> = [];
  messages.forEach(msg => {
    const d = new Date(msg.sentAt);
    const key = format(d, 'yyyy-MM-dd');
    if (key !== lastDateKey) {
      const label = isToday(d) ? t('today') : isYesterday(d) ? t('yesterday') : format(d, 'MMMM d, yyyy');
      msgItems.push({ type: 'sep', label });
      lastDateKey = key;
    }
    msgItems.push({ type: 'msg', msg });
  });

  // Custom header with avatar
  const headerTitle = (
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}
      onClick={goToProfile}
    >
      {participantPhotoSrc && (
        <img
          src={participantPhotoSrc}
          alt={title}
          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>{title}</span>
    </button>
  );

  return (
    <div className={styles.page}>
      <PageHeader title={title} showBack customTitleElement={headerTitle}
        action={
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: 'var(--color-text-muted)' }}
            aria-label={t('deleteConversation')}
          >
            <Trash2 size={18} />
          </button>
        }
      />

      <div className={styles.messages} ref={scrollRef}>
        {loading && <div className={styles.loading}>{t('loading')}</div>}

        {!loading && messages.length === 0 && (
          <div className={styles.requestNotice}>
            <p>{conversation?.isMessageRequest
              ? <><strong>{title}</strong> {t('wantsToMessage')}. {t('replyToStart')}</>
              : t('noMessagesYet')
            }</p>
          </div>
        )}

        {msgItems.map((item, idx) => {
          if (item.type === 'sep') {
            return (
              <div key={`sep-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                <span style={{ background: 'var(--color-surface)', color: 'var(--color-text-faint)', fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-pill)' }}>
                  {item.label}
                </span>
              </div>
            );
          }
          const msg = item.msg;
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`${styles.bubbleRow} ${isMine ? styles.bubbleRowMine : ''}`}>
              {/* Show partner avatar next to their messages */}
              {!isMine && participantPhotoSrc && (
                <img
                  src={participantPhotoSrc}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 4, cursor: 'pointer' }}
                  onClick={goToProfile}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                {msg.type === 'text' && <p>{msg.text}</p>}
                {msg.type === 'voice' && (
                  <div className={styles.voiceNote}>
                    <Mic size={16} />
                    <div className={styles.voiceBar} />
                    <span>{msg.durationSec}s</span>
                  </div>
                )}
                {msg.type === 'image' && msg.mediaUrl && (
                  <img
                    src={msg.mediaUrl}
                    alt={t('sharedPhoto')}
                    className={styles.mediaImage}
                    style={{ maxWidth: 220, borderRadius: 12, display: 'block' }}
                  />
                )}
                <div className={styles.bubbleMeta}>
                  <span>{format(new Date(msg.sentAt), 'HH:mm')}</span>
                  {isMine && (msg.readAt ? <CheckCheck size={13} /> : <Check size={13} />)}
                </div>
              </div>
            </div>
          );
        })}

        {partnerTyping && (
          <div className={styles.bubbleRow}>
            <div className={`${styles.bubble} ${styles.bubbleTheirs}`}>
              <span style={{ fontSize: 20, letterSpacing: 2 }}>···</span>
            </div>
          </div>
        )}
      </div>

      {/* Photo preview overlay */}
      {photoPreview && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16, zIndex: 200,
        }}>
          <img src={photoPreview.url} alt="Preview" style={{ maxWidth: '80%', maxHeight: '60vh', borderRadius: 12 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setPhotoPreview(null)} style={{ padding: '10px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 15 }}>
              <X size={16} style={{ verticalAlign: 'middle' }} /> {t('cancel')}
            </button>
            <button
              onClick={handleSendPhoto}
              disabled={sendingPhoto}
              style={{ padding: '10px 24px', borderRadius: 20, background: 'var(--color-accent)', color: '#1a1014', fontSize: 15, fontWeight: 700 }}
            >
              {sendingPhoto ? t('sending') : t('sendPhoto')}
            </button>
          </div>
        </div>
      )}

      <div className={styles.composer}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
        <button className={styles.composerIcon} aria-label={t('attachPhoto')} onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={20} />
        </button>
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={t('typeAMessage')}
          className={styles.composerInput}
        />
        {draft.trim() ? (
          <button className={styles.sendButton} onClick={handleSend} aria-label={t('send')}>
            <Send size={18} />
          </button>
        ) : (
          <button className={styles.composerIcon} aria-label={t('voiceNote')}>
            <Mic size={20} />
          </button>
        )}
      </div>

      {/* Delete conversation confirmation */}
      {showDeleteConfirm && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', zIndex: 500,
        }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{
            background: 'var(--color-bg-elevated)', borderRadius: '20px 20px 0 0',
            padding: '12px 20px 32px', width: '100%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: 'var(--color-border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-text)' }}>Delete conversation?</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
              This conversation will be removed from your list. The other person can still see it unless they also delete it.
            </p>
            <button onClick={handleDeleteConversation} style={{
              width: '100%', padding: 14, borderRadius: 12,
              background: 'var(--color-danger)', color: '#fff',
              border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Trash2 size={16} /> Delete
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} style={{
              width: '100%', padding: 14, borderRadius: 12,
              background: 'var(--color-surface)', color: 'var(--color-text-muted)',
              border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
