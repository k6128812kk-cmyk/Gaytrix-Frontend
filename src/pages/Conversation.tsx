import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Mic, Image as ImageIcon, Check, CheckCheck, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { chatService } from '@/api/services';
import { useSessionStore } from '@/context/sessionStore';
import { wsClient } from '@/hooks/useGlobalWs';
import type { ChatMessage, Conversation } from '@/types';
import styles from './Conversation.module.css';

// ==========================================================================
// ConversationPage — real-time 1:1 chat using the shared global WebSocket.
//
// Previously this page opened its own private WebSocket connection in
// parallel with the global one, causing:
//   - duplicate auth handshakes
//   - message confirmations landing on the wrong socket
//   - missed messages when the per-page socket reconnected
//   - read receipts not reaching the correct listener
//
// Fix: all real-time events go through wsClient (the global singleton).
// Sending is done via wsClient.send(), receiving via wsClient.addHandler().
// The global socket is already authenticated by useGlobalWs() in App.tsx.
// ==========================================================================

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSessionStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ file: File; url: string } | null>(null);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Scroll to bottom when messages change ──────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // ── Load history via REST on mount ────────────────────────────────────
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

      // Tell the backend we've read all messages in this conversation
      wsClient.send({ type: 'mark_read', conversationId: id });

      // Refresh global unread count after marking read
      wsClient.send({ type: 'get_unread_count' });
    }).catch(() => setLoading(false));
  }, [id]);

  // ── Subscribe to real-time events via shared global WS ────────────────
  useEffect(() => {
    if (!id) return;

    // Incoming messages for this conversation
    const onMessage = (raw: Record<string, unknown>) => {
      const msg = raw.message as ChatMessage | undefined;
      if (!msg || msg.conversationId !== id) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setPartnerTyping(false);

      // Mark as read immediately since we're looking at the conversation
      wsClient.send({ type: 'mark_read', conversationId: id });
      wsClient.send({ type: 'get_unread_count' });
    };

    // Read receipts — update our sent messages to show double-tick
    const onReadReceipt = (raw: Record<string, unknown>) => {
      if (raw.conversationId !== id) return;
      const readAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === profile?.id && !m.readAt ? { ...m, readAt } : m
        )
      );
    };

    // Typing indicator from partner
    const onTyping = (raw: Record<string, unknown>) => {
      if (raw.conversationId !== id) return;
      if (raw.userId === profile?.id) return; // ignore our own typing events
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

  // ── Typing indicator — debounced ──────────────────────────────────────
  function handleDraftChange(value: string) {
    setDraft(value);
    if (id) {
      wsClient.send({ type: 'typing', conversationId: id });
    }
  }

  // ── Send text message ─────────────────────────────────────────────────
  async function handleSend() {
    if (!id || !draft.trim()) return;
    const text = draft.trim();
    setDraft('');

    // Try global WS first; fall back to REST if WS is not ready
    const sent = wsClient.send({ type: 'send_message', conversationId: id, text });
    if (!sent) {
      try {
        const message = await chatService.sendMessage(id, text);
        setMessages((prev) => [...prev, message]);
      } catch (err) {
        console.error('Failed to send message:', err);
        setDraft(text); // restore draft so user doesn't lose their text
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

  const title = conversation?.participant.displayName ?? 'Chat';
  const currentUserId = profile?.id ?? '';

  // ── Build message list with date separators ────────────────────────────
  let lastDateKey = '';
  const msgItems: Array<{ type: 'sep'; label: string } | { type: 'msg'; msg: (typeof messages)[0] }> = [];
  messages.forEach(msg => {
    const d = new Date(msg.sentAt);
    const key = format(d, 'yyyy-MM-dd');
    if (key !== lastDateKey) {
      const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
      msgItems.push({ type: 'sep', label });
      lastDateKey = key;
    }
    msgItems.push({ type: 'msg', msg });
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title={title}
        showBack
      />

      <div className={styles.messages} ref={scrollRef}>
        {loading && <div className={styles.loading}>Loading messages...</div>}

        {!loading && messages.length === 0 && (
          <div className={styles.requestNotice}>
            <p>{conversation?.isMessageRequest
              ? <><strong>{title}</strong> wants to message you. Reply to start.</>
              : 'No messages yet. Say hello!'
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
                    alt="Shared photo"
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
              <X size={16} style={{ verticalAlign: 'middle' }} /> Cancel
            </button>
            <button
              onClick={handleSendPhoto}
              disabled={sendingPhoto}
              style={{ padding: '10px 24px', borderRadius: 20, background: 'var(--color-accent)', color: '#1a1014', fontSize: 15, fontWeight: 700 }}
            >
              {sendingPhoto ? 'Sending...' : 'Send Photo'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.composer}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
        <button className={styles.composerIcon} aria-label="Attach photo" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={20} />
        </button>
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Message..."
          className={styles.composerInput}
        />
        {draft.trim() ? (
          <button className={styles.sendButton} onClick={handleSend} aria-label="Send">
            <Send size={18} />
          </button>
        ) : (
          <button className={styles.composerIcon} aria-label="Voice note">
            <Mic size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
