import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function ChatRoom() {
  const { id: conversationId } = useParams<{ id: string }>();
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherName, setOtherName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  // Fetch messages + other user name
  useEffect(() => {
    if (!conversationId || !user) return;

    const init = async () => {
      // Get conversation
      const { data: convo } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      
      if (convo) {
        const otherId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
        const { data: sp } = await supabase.from('store_profiles').select('store_name').eq('user_id', otherId).maybeSingle();
        if (sp) setOtherName(sp.store_name);
        else {
          const { data: dp } = await supabase.from('driver_profiles').select('full_name').eq('user_id', otherId).maybeSingle();
          if (dp) setOtherName(dp.full_name);
        }
      }

      // Fetch messages
      const { data: msgs } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (msgs) setMessages(msgs as Message[]);

      // Mark as read
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    };

    init();

    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        // Mark as read if from other user
        if (newMsg.sender_id !== user.id) {
          await supabase.from('direct_messages').update({ is_read: true }).eq('id', newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !conversationId) return;
    const text = newMessage.trim();
    setNewMessage('');

    await supabase.from('direct_messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: text,
    });

    // Update conversation last message
    await supabase.from('conversations').update({
      last_message_text: text,
      last_message_at: new Date().toISOString(),
    }).eq('id', conversationId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Quick messages
  const quickMessages = [
    t.chat?.arrived || 'وصلت',
    t.chat?.callMe || 'اتصل بي',
    t.chat?.waiting || 'أنا في الانتظار',
    t.chat?.imNear || 'أنا قريب',
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col safe-top">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate('/messages')} className="p-1">
          <BackArrow className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold truncate">{otherName}</h1>
      </div>

      {/* Quick messages */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-border">
        {quickMessages.map((msg) => (
          <button
            key={msg}
            onClick={() => {
              setNewMessage(msg);
              setTimeout(() => sendMessage(), 0);
            }}
            className="shrink-0 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium hover:bg-secondary/80"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={cn('flex', isMine ? 'justify-start' : 'justify-end')}>
              <div className={cn(
                'max-w-[75%] px-3 py-2 rounded-2xl text-sm',
                isMine
                  ? 'bg-primary text-primary-foreground rounded-bl-md'
                  : 'bg-secondary rounded-br-md'
              )}>
                <p>{msg.message}</p>
                <p className={cn('text-[9px] mt-0.5', isMine ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 pt-2 border-t border-border flex gap-2 safe-bottom">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t.chat?.typePlaceholder || 'اكتب رسالة...'}
          className="flex-1 h-10 rounded-full"
        />
        <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!newMessage.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
