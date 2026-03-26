import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  delivery_id: string;
  sender_user_id: string;
  message: string;
  is_quick_message: boolean;
  created_at: string;
}

interface ChatSheetProps {
  deliveryId: string;
  otherUserName?: string;
}

export function ChatSheet({ deliveryId, otherUserName }: ChatSheetProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickMessages = [
    t.chat?.arrived || 'I arrived',
    t.chat?.callMe || 'Please call me',
    t.chat?.waiting || 'I am waiting',
    t.chat?.trafficDelay || 'Traffic delay',
    t.chat?.orderPickedUp || 'Order picked up',
    t.chat?.imNear || 'I am near',
  ];

  useEffect(() => {
    if (!open || !deliveryId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as ChatMessage[]);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat-${deliveryId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `delivery_id=eq.${deliveryId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, deliveryId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string, isQuick = false) => {
    if (!text.trim() || !user) return;
    await supabase.from('chat_messages').insert({
      delivery_id: deliveryId,
      sender_user_id: user.id,
      message: text.trim(),
      is_quick_message: isQuick,
    });
    setNewMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(newMessage);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="rounded-full">
          <MessageCircle className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle className="text-base">
            {t.chat?.chatWith || 'Chat with'} {otherUserName || ''}
          </SheetTitle>
        </SheetHeader>

        {/* Quick messages */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-border">
          {quickMessages.map((msg) => (
            <button
              key={msg}
              onClick={() => sendMessage(msg, true)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium hover:bg-secondary/80"
            >
              {msg}
            </button>
          ))}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 h-[calc(85vh-180px)]" ref={scrollRef}>
          <div className="p-4 space-y-2">
            {messages.map((msg) => {
              const isMine = msg.sender_user_id === user?.id;
              return (
                <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[75%] px-3 py-2 rounded-2xl text-sm',
                    isMine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary rounded-bl-md'
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
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 pt-2 border-t border-border flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t.chat?.typePlaceholder || 'Type a message...'}
            className="flex-1 h-10 rounded-full"
          />
          <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
