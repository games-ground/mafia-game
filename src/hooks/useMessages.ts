import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, RoomPlayer, Player, RoleType } from '@/types/game';

export function useMessages(roomId: string | null, currentRole: RoleType | null, isNight: boolean) {
  const [messages, setMessages] = useState<(Message & { room_player?: RoomPlayer & { player: Player } })[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;

    const { data, error } = await supabase
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

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Update seen IDs and set messages
    seenIds.current = new Set((data || []).map(m => m.id));
    setMessages(data as any);
  }, [roomId]);

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
  }, [roomId]);

  // Filter messages based on current role and phase
  const filteredMessages = messages.filter(msg => {
    // Role-specific messages (system or player): only visible to that role
    if (msg.role_type) {
      return msg.role_type === currentRole;
    }
    
    // Legacy mafia-only messages (for backward compatibility)
    if (msg.is_mafia_only) {
      return currentRole === 'mafia';
    }
    
    // Public messages (no role_type and not mafia_only) are always visible
    return true;
  });

  async function sendMessage(content: string, playerId: string, roleType: RoleType | null = null) {
    if (!roomId || !content.trim()) return;

    // Determine if this is a role-specific message
    // Only set role_type during night phase for special roles
    const isMafiaOnly = roleType === 'mafia';

    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      player_id: playerId,
      content: content.trim(),
      is_mafia_only: isMafiaOnly,
      role_type: roleType,
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  }

  async function sendSystemMessage(content: string, roleType: RoleType | null = null) {
    if (!roomId || !content.trim()) return;

    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      content: content.trim(),
      is_system: true,
      is_mafia_only: false,
      role_type: roleType,
    });

    if (error) {
      console.error('Error sending system message:', error);
    }
  }

  return { messages: filteredMessages, sendMessage, sendSystemMessage, refetch: fetchMessages };
}
