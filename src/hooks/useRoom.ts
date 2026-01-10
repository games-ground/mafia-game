import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode } from '@/lib/room-code';
import { Room, RoomPlayer, Player } from '@/types/game';
import { toast } from 'sonner';

export function useRoom(roomCode: string | null, playerId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<(RoomPlayer & { player: Player })[]>([]);
  const [currentRoomPlayer, setCurrentRoomPlayer] = useState<RoomPlayer | null>(null);
  const [mafiaPartnerIds, setMafiaPartnerIds] = useState<Set<string>>(new Set());
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
    // Use the safe view that hides roles appropriately
    const { data, error } = await supabase
      .from('room_players_safe')
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
    
    // For the current player, fetch their own role and mafia partners using secure RPCs
    if (playerId) {
      // CRITICAL: Always fetch fresh role from database
      const [roleResult, partnersResult] = await Promise.all([
        supabase.rpc('get_own_role', { p_player_id: playerId, p_room_id: roomId }),
        supabase.rpc('get_mafia_partners', { p_player_id: playerId, p_room_id: roomId }),
      ]);
      
      const ownRole = roleResult.data;
      const partners = partnersResult.data as { room_player_id: string; partner_player_id: string; nickname: string }[] | null;
      
      // Store mafia partner IDs
      const partnerIds = new Set<string>(partners?.map(p => p.room_player_id) || []);
      setMafiaPartnerIds(partnerIds);
      
      // Update the current player's role in the data
      // For mafia partners, also set their role so they show correctly
      const updatedData = typedData.map(rp => {
        if (rp.player_id === playerId && ownRole) {
          return { ...rp, role: ownRole as RoomPlayer['role'] };
        }
        // Mark mafia partners with their role for display purposes
        if (partnerIds.has(rp.id)) {
          return { ...rp, role: 'mafia' as RoomPlayer['role'] };
        }
        return rp;
      });
      
      setRoomPlayers(updatedData);
      const current = updatedData.find(rp => rp.player_id === playerId);
      setCurrentRoomPlayer(current || null);
    } else {
      setRoomPlayers(typedData);
    }
  };

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Refetch room players when playerId changes (needed for getting roles after game start)
  useEffect(() => {
    if (room && playerId) {
      fetchRoomPlayers(room.id);
    }
  }, [room?.id, playerId]);

  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        () => {
          // Refetch to get updated player data including roles
          fetchRoomPlayers(room.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new as Room);
            // When room status changes (e.g., game starts), refetch players to get roles
            fetchRoomPlayers(room.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, playerId]);

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

    // Check if player was kicked from this room
    const { data: kickedData } = await supabase
      .from('kicked_players')
      .select('id')
      .eq('room_id', roomData.id)
      .eq('player_id', joinPlayerId)
      .single();

    if (kickedData) {
      setError('You were kicked from this room');
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

    // Just remove player - database trigger handles cleanup when room becomes empty
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
    if (!room || !playerId) return;

    // Find the player being kicked
    const kickedPlayer = roomPlayers.find(rp => rp.id === roomPlayerId);
    if (!kickedPlayer) return;

    // Use the secure RPC to kick player (server validates host)
    const { error: kickError } = await supabase
      .rpc('kick_player', {
        p_host_player_id: playerId,
        p_room_id: room.id,
        p_target_room_player_id: roomPlayerId,
      });

    if (kickError) {
      console.error('Error kicking player:', kickError);
      toast.error('Failed to kick player');
      return;
    }

    // Add system message about the kick
    await supabase.from('messages').insert({
      room_id: room.id,
      content: `🚪 ${kickedPlayer.player.nickname} was kicked from the game.`,
      is_system: true,
    });

    // If game is in progress and kicked player was alive, recalculate win conditions
    if (room.status === 'playing' && kickedPlayer.is_alive) {
      // Get remaining alive players
      const remainingPlayers = roomPlayers.filter(
        rp => rp.id !== roomPlayerId && rp.is_alive
      );
      
      const aliveMafia = remainingPlayers.filter(p => p.role === 'mafia');
      const aliveTown = remainingPlayers.filter(p => p.role !== 'mafia');

      // Check win conditions
      if (aliveMafia.length === 0) {
        // Civilians win
        await endGameDueToKick('civilians');
      } else if (aliveMafia.length >= aliveTown.length) {
        // Mafia wins
        await endGameDueToKick('mafia');
      }
    }

    toast.success(`${kickedPlayer.player.nickname} was kicked`);
  }

  async function endGameDueToKick(winner: 'mafia' | 'civilians') {
    if (!room) return;

    // Get game state
    const { data: gameState } = await supabase
      .from('game_state')
      .select('id')
      .eq('room_id', room.id)
      .single();

    if (!gameState) return;

    await supabase
      .from('game_state')
      .update({
        phase: 'game_over',
        winner,
        phase_end_time: null,
      })
      .eq('id', gameState.id);

    await supabase
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', room.id);

    const winMessage = winner === 'mafia'
      ? '🔪 The Mafia has taken over the town! Mafia wins!'
      : '🎉 The town has eliminated all the Mafia! Civilians win!';

    await supabase.from('messages').insert({
      room_id: room.id,
      content: winMessage,
      is_system: true,
    });
  }

  async function updateRoomConfig(config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count' | 'night_mode' | 'night_duration' | 'day_duration' | 'show_vote_counts' | 'reveal_roles_on_death'>>) {
    if (!room || !playerId) return;

    // Use the secure RPC to update config (server validates host)
    const { error } = await supabase
      .rpc('update_room_config', {
        p_host_player_id: playerId,
        p_room_id: room.id,
        p_mafia_count: config.mafia_count ?? null,
        p_doctor_count: config.doctor_count ?? null,
        p_detective_count: config.detective_count ?? null,
        p_night_mode: config.night_mode ?? null,
        p_day_duration: config.day_duration ?? null,
        p_night_duration: config.night_duration ?? null,
        p_show_vote_counts: config.show_vote_counts ?? null,
        p_reveal_roles_on_death: config.reveal_roles_on_death ?? null,
      });

    if (error) {
      console.error('Error updating room config:', error);
    }
  }

  return {
    room,
    roomPlayers,
    currentRoomPlayer,
    mafiaPartnerIds,
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