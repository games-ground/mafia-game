import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, RoomPlayer, Player } from '@/types/game';

export function useMessages(roomId: string | null, isMafia: boolean) {
  const [messages, setMessages] = useState<(Message & { room_player?: RoomPlayer & { player: Player } })[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;

    let query = supabase
      .from('messages')
      .select(`
        *,
        room_player:room_players(
          *,
          player:players(*)
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    // If not mafia, filter out mafia-only messages
    if (!isMafia) {
      query = query.eq('is_mafia_only', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Update seen IDs and set messages
    seenIds.current = new Set((data || []).map(m => m.id));
    setMessages(data as any);
  }, [roomId, isMafia]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Skip if already seen
          if (seenIds.current.has(newMessage.id)) {
            return;
          }
          
          // Skip mafia messages if user is not mafia
          if (!isMafia && newMessage.is_mafia_only) {
            return;
          }
          
          seenIds.current.add(newMessage.id);
          
          // Fetch full message with player info
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              room_player:room_players(
                *,
                player:players(*)
              )
            `)
            .eq('id', newMessage.id)
            .single();
          
          if (error || !data) return;
          
          setMessages(prev => {
            // Double-check for duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, data as any];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isMafia]);

  async function sendMessage(content: string, playerId: string, isMafiaOnly: boolean = false) {
    if (!roomId || !content.trim()) return;

    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      player_id: playerId,
      content: content.trim(),
      is_mafia_only: isMafiaOnly,
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  }

  return { messages, sendMessage, refetch: fetchMessages };
}
