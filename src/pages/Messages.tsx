import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react';


interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
}

export default function Messages() {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (data) {
        setConversations(data as Conversation[]);
        // Fetch names for other participants
        const otherIds = data.map((c: any) =>
          c.participant_1 === user.id ? c.participant_2 : c.participant_1
        );
        const uniqueIds = [...new Set(otherIds)];
        const nameMap: Record<string, string> = {};

        for (const id of uniqueIds) {
          const { data: sp } = await supabase
            .from('store_profiles')
            .select('store_name')
            .eq('user_id', id)
            .maybeSingle();
          if (sp) {
            nameMap[id] = sp.store_name;
          } else {
            const { data: dp } = await supabase
              .from('driver_profiles')
              .select('full_name')
              .eq('user_id', id)
              .maybeSingle();
            if (dp) nameMap[id] = dp.full_name;
            else nameMap[id] = t.chat?.unknown || 'Unknown';
          }
        }
        setNames(nameMap);
      }
    };

    fetchConversations();

    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const getOtherId = (c: Conversation) =>
    c.participant_1 === user?.id ? c.participant_2 : c.participant_1;

  return (
    <div className="min-h-screen bg-background safe-top">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1">
          <BackArrow className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold">{t.chat?.messages || 'Messages'}</h1>
      </div>

      {/* Conversations list */}
      <div className="divide-y divide-border">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{t.chat?.noMessages || 'No messages yet'}</p>
          </div>
        ) : (
          conversations.map((convo) => {
            const otherId = getOtherId(convo);
            const name = names[otherId] || '...';
            return (
              <button
                key={convo.id}
                onClick={() => navigate(`/messages/${convo.id}`)}
                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-start"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {convo.last_message_text || t.chat?.noMessages || 'No messages yet'}
                  </p>
                </div>
                {convo.last_message_at && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(convo.last_message_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
