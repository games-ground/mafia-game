import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, RoomPlayer, RoleType, Vote, Player, Room } from '@/types/game';

const DEFAULT_PHASE_DURATIONS = {
  night: 30,
  day_discussion: 60,
  day_voting: 60,
};

export function useGameState(roomId: string | null, currentRoomPlayerId: string | null, room?: Room | null, roomPlayers?: (RoomPlayer & { player: Player })[]) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const advancingPhaseRef = useRef(false);

  const fetchGameState = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching game state:', error);
    }

    setGameState(data as GameState | null);
    setLoading(false);
  }, [roomId]);

  const fetchVotes = useCallback(async () => {
    if (!roomId || !gameState) return;

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('day_number', gameState.day_number);

    if (error) {
      console.error('Error fetching votes:', error);
      return;
    }

    setVotes(data as Vote[]);
  }, [roomId, gameState?.day_number]);

  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  useEffect(() => {
    if (gameState?.phase === 'day_voting') {
      fetchVotes();
    }
  }, [gameState?.phase, fetchVotes]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setGameState(payload.new as GameState);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` },
        () => fetchVotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchVotes]);

  // Check if all night actors have completed their actions (for action_complete mode)
  // This is called automatically by the game state updates (mafia/doctor/detective target IDs)
  const checkAllNightActionsComplete = useCallback(async () => {
    if (!gameState || !room || !roomId || room.night_mode !== 'action_complete') return false;
    if (gameState.phase !== 'night') return false;
    if (advancingPhaseRef.current) return false;

    // Fetch fresh player data with roles to check who needs to act
    const { data: freshPlayers, error } = await supabase
      .from('room_players')
      .select('id, is_alive, role')
      .eq('room_id', roomId);

    if (error || !freshPlayers) return false;

    const alivePlayers = freshPlayers.filter(p => p.is_alive);
    
    // Check if there's at least one alive mafia and they have acted
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const mafiaActed = aliveMafia.length === 0 || gameState.mafia_target_id !== null;

    // Check if there's at least one alive doctor and they have acted
    const aliveDoctors = alivePlayers.filter(p => p.role === 'doctor');
    const doctorActed = aliveDoctors.length === 0 || gameState.doctor_target_id !== null;

    // Check if there's at least one alive detective and they have acted
    const aliveDetectives = alivePlayers.filter(p => p.role === 'detective');
    const detectiveActed = aliveDetectives.length === 0 || gameState.detective_target_id !== null;

    return mafiaActed && doctorActed && detectiveActed;
  }, [gameState, room, roomId]);

  // Auto-advance when all actions complete in action_complete mode
  useEffect(() => {
    const checkAndAdvance = async () => {
      if (advancingPhaseRef.current) return;
      
      const allComplete = await checkAllNightActionsComplete();
      if (allComplete && roomPlayers && !advancingPhaseRef.current) {
        advancingPhaseRef.current = true;
        // Small delay to ensure all state updates are reflected
        setTimeout(() => {
          advancePhase(roomPlayers).finally(() => {
            advancingPhaseRef.current = false;
          });
        }, 500);
      }
    };
    
    checkAndAdvance();
  }, [gameState?.mafia_target_id, gameState?.doctor_target_id, gameState?.detective_target_id, checkAllNightActionsComplete, roomPlayers]);

  async function startGame(roomPlayers: (RoomPlayer & { player: Player })[], roomConfig: { mafia_count: number; doctor_count: number; detective_count: number; night_mode: string; night_duration?: number; day_duration?: number }) {
    if (!roomId) return;

    // Assign roles based on config
    const roles = assignRoles(roomPlayers.length, roomConfig);
    const shuffledPlayers = [...roomPlayers].sort(() => Math.random() - 0.5);

    // Update each player's role
    for (let i = 0; i < shuffledPlayers.length; i++) {
      await supabase
        .from('room_players')
        .update({ role: roles[i] })
        .eq('id', shuffledPlayers[i].id);
    }

    // Update room status
    await supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', roomId);

    // Create game state - use timed or null for action_complete mode
    const nightDuration = roomConfig.night_duration || DEFAULT_PHASE_DURATIONS.night;
    const phaseEndTime = roomConfig.night_mode === 'timed' 
      ? new Date(Date.now() + nightDuration * 1000).toISOString()
      : null;

    await supabase.from('game_state').insert({
      room_id: roomId,
      phase: 'night',
      day_number: 1,
      phase_end_time: phaseEndTime,
    });

    // Add system message
    await supabase.from('messages').insert({
      room_id: roomId,
      content: 'The game has begun! Night falls upon the town...',
      is_system: true,
    });
  }

  function assignRoles(playerCount: number, config: { mafia_count: number; doctor_count: number; detective_count: number }): RoleType[] {
    const roles: RoleType[] = [];
    
    // Use configured role counts
    const mafiaCount = Math.min(config.mafia_count, playerCount - 1);
    const doctorCount = Math.min(config.doctor_count, playerCount - mafiaCount);
    const detectiveCount = Math.min(config.detective_count, playerCount - mafiaCount - doctorCount);
    
    // Add mafia
    for (let i = 0; i < mafiaCount; i++) {
      roles.push('mafia');
    }
    
    // Add special roles
    for (let i = 0; i < doctorCount; i++) {
      roles.push('doctor');
    }
    for (let i = 0; i < detectiveCount; i++) {
      roles.push('detective');
    }
    
    // Fill rest with civilians
    while (roles.length < playerCount) {
      roles.push('civilian');
    }
    
    return roles;
  }

  async function submitNightAction(targetId: string, role: RoleType) {
    if (!gameState || !currentRoomPlayerId || !roomPlayers) return;

    const updateField = {
      mafia: 'mafia_target_id',
      doctor: 'doctor_target_id',
      detective: 'detective_target_id',
    }[role];

    if (!updateField) return;

    // Get target name for spectator mode
    const target = roomPlayers.find(p => p.id === targetId);
    const targetNameField = {
      mafia: 'last_mafia_target_name',
      doctor: 'last_doctor_target_name',
      detective: 'last_detective_target_name',
    }[role];

    // For detective, also set the result immediately for instant feedback
    // We need to fetch the actual role from the database since it's hidden in the safe view
    let additionalUpdates: Record<string, string | null> = {};
    if (role === 'detective') {
      const { data: targetPlayer } = await supabase
        .from('room_players')
        .select('role')
        .eq('id', targetId)
        .single();
      
      if (targetPlayer) {
        const isMafia = targetPlayer.role === 'mafia';
        additionalUpdates.detective_result = isMafia ? 'mafia' : 'not_mafia';
      }
    }

    // Add target name for spectator visibility
    if (targetNameField && target) {
      additionalUpdates[targetNameField] = target.player.nickname;
    }

    const { error } = await supabase
      .from('game_state')
      .update({ 
        [updateField]: targetId,
        ...additionalUpdates 
      })
      .eq('id', gameState.id);

    if (error) {
      console.error('Error submitting night action:', error);
    }

    // Log the action
    await supabase.from('game_actions').insert({
      room_id: gameState.room_id,
      actor_id: currentRoomPlayerId,
      action_type: `${role}_action`,
      target_id: targetId,
      day_number: gameState.day_number,
      phase: gameState.phase,
    });
  }

  async function submitVote(targetId: string | null) {
    if (!gameState || !currentRoomPlayerId) return;

    const { error } = await supabase
      .from('votes')
      .upsert({
        room_id: gameState.room_id,
        voter_id: currentRoomPlayerId,
        target_id: targetId,
        day_number: gameState.day_number,
      }, {
        onConflict: 'room_id,voter_id,day_number',
      });

    if (error) {
      console.error('Error submitting vote:', error);
    }
  }

  async function advancePhase(roomPlayers: (RoomPlayer & { player: Player })[]) {
    if (!gameState || !roomId) return;

    // Refetch room_players to get the latest is_alive status
    const { data: freshPlayers, error: fetchError } = await supabase
      .from('room_players')
      .select('id, is_alive, role')
      .eq('room_id', roomId);

    if (fetchError) {
      console.error('Error fetching players for win check:', fetchError);
      return;
    }

    const alivePlayers = freshPlayers?.filter(p => p.is_alive) || [];
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const aliveTown = alivePlayers.filter(p => p.role !== 'mafia');

    // Check win conditions - only based on actual eliminations
    if (aliveMafia.length === 0) {
      await endGame('civilians');
      return;
    }
    if (aliveMafia.length >= aliveTown.length) {
      await endGame('mafia');
      return;
    }

    let newPhase = gameState.phase;
    let newDayNumber = gameState.day_number;
    let updates: Partial<GameState> = {};

    if (gameState.phase === 'night') {
      // Resolve night actions
      await resolveNightActions(roomPlayers);
      // Skip day_discussion, go directly to voting
      newPhase = 'day_voting';
      updates = {
        mafia_target_id: null,
        doctor_target_id: null,
        detective_target_id: null,
        detective_result: null,
        // Keep the target names for spectator view during day
      };
    } else if (gameState.phase === 'day_voting') {
      // Resolve voting
      await resolveVoting(roomPlayers);
      newPhase = 'night';
      newDayNumber = gameState.day_number + 1;
      // Clear spectator names for new night
      updates = {
        last_mafia_target_name: null,
        last_doctor_target_name: null,
        last_detective_target_name: null,
      };
    }

    // Determine phase end time based on night mode and room config
    let phaseEndTime: string | null;
    if (newPhase === 'night' && room?.night_mode === 'action_complete') {
      phaseEndTime = null; // No timer for action-based night
    } else {
      let phaseDuration: number;
      if (newPhase === 'night') {
        phaseDuration = room?.night_duration || DEFAULT_PHASE_DURATIONS.night;
      } else if (newPhase === 'day_voting') {
        phaseDuration = room?.day_duration || DEFAULT_PHASE_DURATIONS.day_voting;
      } else {
        phaseDuration = DEFAULT_PHASE_DURATIONS[newPhase as keyof typeof DEFAULT_PHASE_DURATIONS] || 30;
      }
      phaseEndTime = new Date(Date.now() + phaseDuration * 1000).toISOString();
    }

    await supabase
      .from('game_state')
      .update({
        phase: newPhase,
        day_number: newDayNumber,
        phase_end_time: phaseEndTime,
        ...updates,
      })
      .eq('id', gameState.id);
  }

  async function resolveNightActions(roomPlayers: (RoomPlayer & { player: Player })[]) {
    if (!gameState || !roomId) return;

    const mafiaTarget = gameState.mafia_target_id;
    const doctorTarget = gameState.doctor_target_id;

    // Fetch fresh player data with roles for death messages
    const { data: freshPlayers, error } = await supabase
      .from('room_players')
      .select('id, role, player:players(nickname)')
      .eq('room_id', roomId);

    if (error) {
      console.error('Error fetching players for night resolution:', error);
      return;
    }

    // Handle mafia kill
    if (mafiaTarget && mafiaTarget !== doctorTarget) {
      await supabase
        .from('room_players')
        .update({ is_alive: false })
        .eq('id', mafiaTarget);

      const victim = freshPlayers?.find(p => p.id === mafiaTarget);
      if (victim) {
        // Check if roles should be revealed on death
        const revealRole = room?.reveal_roles_on_death !== false;
        const roleText = revealRole ? ` They were a ${victim.role}.` : '';
        const nickname = (victim.player as any)?.nickname || 'Unknown';
        
        await supabase.from('messages').insert({
          room_id: roomId,
          content: `☠️ ${nickname} was found dead this morning.${roleText}`,
          is_system: true,
        });
      }
    } else if (mafiaTarget && mafiaTarget === doctorTarget) {
      await supabase.from('messages').insert({
        room_id: roomId,
        content: `🏥 Someone was attacked last night, but the Doctor saved them!`,
        is_system: true,
      });
    } else {
      await supabase.from('messages').insert({
        room_id: roomId,
        content: `The night passes peacefully. No one was killed.`,
        is_system: true,
      });
    }

    // Detective investigation result is already set in submitNightAction
    // No need to update again here - it's just private info for the detective
  }

  async function resolveVoting(roomPlayers: (RoomPlayer & { player: Player })[]) {
    if (!gameState || !roomId) return;

    // Count votes
    const voteCounts: Record<string, number> = {};
    for (const vote of votes) {
      if (vote.target_id) {
        voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
      }
    }

    // Find player with most votes
    let maxVotes = 0;
    let eliminated: string | null = null;
    let tie = false;

    for (const [targetId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminated = targetId;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    }

    if (eliminated && !tie && maxVotes > 0) {
      await supabase
        .from('room_players')
        .update({ is_alive: false })
        .eq('id', eliminated);

      // Fetch fresh player data with roles for death message
      const { data: freshPlayers, error } = await supabase
        .from('room_players')
        .select('id, role, player:players(nickname)')
        .eq('room_id', roomId);

      const victim = freshPlayers?.find(p => p.id === eliminated);
      if (victim) {
        // Check if roles should be revealed on death
        const revealRole = room?.reveal_roles_on_death !== false;
        const roleText = revealRole ? ` They were a ${victim.role}.` : '';
        const nickname = (victim.player as any)?.nickname || 'Unknown';
        
        await supabase.from('messages').insert({
          room_id: roomId,
          content: `⚖️ The town has spoken. ${nickname} has been eliminated.${roleText}`,
          is_system: true,
        });
      }
    } else {
      await supabase.from('messages').insert({
        room_id: roomId,
        content: `The vote was inconclusive. No one was eliminated.`,
        is_system: true,
      });
    }
  }

  async function endGame(winner: 'mafia' | 'civilians') {
    if (!gameState || !roomId) return;

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
      .eq('id', roomId);

    const winMessage = winner === 'mafia'
      ? '🔪 The Mafia has taken over the town! Mafia wins!'
      : '🎉 The town has eliminated all the Mafia! Civilians win!';

    await supabase.from('messages').insert({
      room_id: roomId,
      content: winMessage,
      is_system: true,
    });
  }

  return {
    gameState,
    votes,
    loading,
    startGame,
    submitNightAction,
    submitVote,
    advancePhase,
    refetch: fetchGameState,
  };
}
