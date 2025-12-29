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

    // Create a unique channel name to avoid duplicates
    const channelName = `messages-${roomId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          // Directly add new message instead of refetching to avoid duplicates
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            // Fetch the full message with player info
            fetchMessages();
            return prev;
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
