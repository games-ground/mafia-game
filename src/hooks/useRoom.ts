import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode } from '@/lib/room-code';
import { Room, RoomPlayer, Player } from '@/types/game';

export function useRoom(roomCode: string | null, playerId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<(RoomPlayer & { player: Player })[]>([]);
  const [currentRoomPlayer, setCurrentRoomPlayer] = useState<RoomPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single();

    if (roomError) {
      setError('Room not found');
      setLoading(false);
      return;
    }

    setRoom(roomData as Room);
    await fetchRoomPlayers(roomData.id);
    setLoading(false);
  }, [roomCode]);

  const fetchRoomPlayers = async (roomId: string) => {
    const { data, error } = await supabase
      .from('room_players')
      .select(`
        *,
        player:players(*)
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching room players:', error);
      return;
    }

    const typedData = data as unknown as (RoomPlayer & { player: Player })[];
    setRoomPlayers(typedData);

    if (playerId) {
      const current = typedData.find(rp => rp.player_id === playerId);
      setCurrentRoomPlayer(current || null);
    }
  };

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        () => fetchRoomPlayers(room.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new as Room);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  async function createRoom(hostId: string): Promise<string | null> {
    const code = generateRoomCode();

    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({ code, host_id: hostId })
      .select()
      .single();

    if (roomError) {
      console.error('Error creating room:', roomError);
      return null;
    }

    // Join the room as host
    const { error: joinError } = await supabase
      .from('room_players')
      .insert({ room_id: roomData.id, player_id: hostId });

    if (joinError) {
      console.error('Error joining room:', joinError);
      return null;
    }

    return code;
  }

  async function joinRoom(code: string, joinPlayerId: string): Promise<boolean> {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (roomError || !roomData) {
      setError('Room not found');
      return false;
    }

    // Check if player is already in the room (rejoin scenario)
    const { data: existingPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', roomData.id)
      .eq('player_id', joinPlayerId)
      .single();

    // If already in room, allow rejoin regardless of status
    if (existingPlayer) {
      await fetchRoomPlayers(roomData.id);
      setRoom(roomData as Room);
      return true;
    }

    // Block new joins if game in progress
    if (roomData.status !== 'waiting') {
      setError('Game already in progress');
      return false;
    }

    // Check player count
    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomData.id);

    if (count && count >= roomData.max_players) {
      setError('Room is full');
      return false;
    }

    const { error: joinError } = await supabase
      .from('room_players')
      .insert({ room_id: roomData.id, player_id: joinPlayerId });

    if (joinError) {
      console.error('Error joining room:', joinError);
      return false;
    }

    // Refetch to get the newly created room_player entry
    await fetchRoomPlayers(roomData.id);
    setRoom(roomData as Room);
    return true;
  }

  async function leaveRoom() {
    if (!room || !playerId) return;

    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('player_id', playerId);
  }

  async function toggleReady() {
    if (!currentRoomPlayer || !room) {
      console.error('toggleReady: missing currentRoomPlayer or room', { currentRoomPlayer, room });
      return;
    }

    const newReadyState = !currentRoomPlayer.is_ready;
    const roomPlayerId = currentRoomPlayer.id;
    
    // Optimistically update local state
    setCurrentRoomPlayer({ ...currentRoomPlayer, is_ready: newReadyState });
    setRoomPlayers(prev => 
      prev.map(rp => 
        rp.id === roomPlayerId 
          ? { ...rp, is_ready: newReadyState } 
          : rp
      )
    );

    const { error } = await supabase
      .from('room_players')
      .update({ is_ready: newReadyState })
      .eq('id', roomPlayerId);

    if (error) {
      console.error('toggleReady: database update failed', error);
      // Revert on error
      setCurrentRoomPlayer({ ...currentRoomPlayer, is_ready: !newReadyState });
      setRoomPlayers(prev => 
        prev.map(rp => 
          rp.id === roomPlayerId 
            ? { ...rp, is_ready: !newReadyState } 
            : rp
        )
      );
    }
  }

  async function kickPlayer(roomPlayerId: string) {
    if (!room || room.host_id !== playerId) return;

    await supabase
      .from('room_players')
      .delete()
      .eq('id', roomPlayerId);
  }

  async function updateRoomConfig(config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count' | 'night_mode' | 'night_duration' | 'day_duration'>>) {
    if (!room || room.host_id !== playerId) return;

    const { error } = await supabase
      .from('rooms')
      .update(config)
      .eq('id', room.id);

    if (error) {
      console.error('Error updating room config:', error);
    }
  }

  return {
    room,
    roomPlayers,
    currentRoomPlayer,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    kickPlayer,
    updateRoomConfig,
    refetch: fetchRoom,
  };
}
