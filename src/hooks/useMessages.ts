import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, RoomPlayer, Player } from '@/types/game';

export function useMessages(roomId: string | null, isMafia: boolean) {
  const [messages, setMessages] = useState<(Message & { room_player?: RoomPlayer & { player: Player } })[]>([]);

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
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMessages]);

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
