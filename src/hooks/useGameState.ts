import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, RoomPlayer, RoleType, Vote, Player, Room } from '@/types/game';

export function useGameState(roomId: string | null, currentRoomPlayerId: string | null, room?: Room | null, roomPlayers?: (RoomPlayer & { player: Player })[]) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const [showVotingCountdown, setShowVotingCountdown] = useState(false);
  const [showNightCountdown, setShowNightCountdown] = useState(false);

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

  // Check if all night actions are complete based on game_state targets
  // We determine which roles SHOULD act by checking if their targets are set
  // The game_state fields tell us which actions are needed and which are done
  const checkNightActionsComplete = useCallback(async (): Promise<boolean> => {
    if (!gameState || gameState.phase !== 'night' || !roomId) return false;

    // Fetch fresh role status from database to check which roles are alive
    const { data: alivePlayers, error } = await supabase
      .from('room_players')
      .select('role')
      .eq('room_id', roomId)
      .eq('is_alive', true);

    if (error || !alivePlayers) return false;

    const hasMafia = alivePlayers.some(p => p.role === 'mafia');
    const hasDoctor = alivePlayers.some(p => p.role === 'doctor');
    const hasDetective = alivePlayers.some(p => p.role === 'detective');

    const mafiaActed = !hasMafia || gameState.mafia_target_id !== null;
    const doctorActed = !hasDoctor || gameState.doctor_target_id !== null;
    const detectiveActed = !hasDetective || gameState.detective_target_id !== null;

    return mafiaActed && doctorActed && detectiveActed;
  }, [gameState, roomId]);

  // Track whether we've already triggered the night countdown for this phase
  const nightCountdownTriggeredRef = useRef(false);

  // Reset the trigger ref when phase changes
  useEffect(() => {
    nightCountdownTriggeredRef.current = false;
  }, [gameState?.phase, gameState?.day_number]);

  // Check night actions complete whenever game state changes (targets are set)
  useEffect(() => {
    if (gameState?.phase !== 'night' || showNightCountdown || advancingPhaseRef.current || nightCountdownTriggeredRef.current) {
      return;
    }

    // Only check when a target is actually set (not on initial load)
    const hasAnyTarget = gameState.mafia_target_id !== null || 
                         gameState.doctor_target_id !== null || 
                         gameState.detective_target_id !== null;
    
    if (!hasAnyTarget) return;

    checkNightActionsComplete().then(allComplete => {
      if (allComplete && !nightCountdownTriggeredRef.current) {
        nightCountdownTriggeredRef.current = true;
        setShowNightCountdown(true);
      }
    });
  }, [gameState?.phase, gameState?.mafia_target_id, gameState?.doctor_target_id, gameState?.detective_target_id, showNightCountdown, checkNightActionsComplete]);

  async function startGame(roomPlayers: (RoomPlayer & { player: Player })[], roomConfig: { mafia_count: number; doctor_count: number; detective_count: number }) {
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

    // Create game state - no phase_end_time since we're action-based only
    await supabase.from('game_state').insert({
      room_id: roomId,
      phase: 'night',
      day_number: 1,
      phase_end_time: null,
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
    
    // Prevent concurrent phase advances
    if (advancingPhaseRef.current) {
      console.log('Already advancing phase, skipping');
      return;
    }
    advancingPhaseRef.current = true;

    try {
      let newPhase = gameState.phase;
      let newDayNumber = gameState.day_number;
      let updates: Partial<GameState> = {};

      if (gameState.phase === 'night') {
        // Resolve night actions FIRST
        await resolveNightActions(roomPlayers);
        newPhase = 'day_voting';
        updates = {
          mafia_target_id: null,
          doctor_target_id: null,
          detective_target_id: null,
          detective_result: null,
        };
      } else if (gameState.phase === 'day_voting') {
        // Resolve voting FIRST
        await resolveVoting(roomPlayers);
        newPhase = 'night';
        newDayNumber = gameState.day_number + 1;
        updates = {
          last_mafia_target_name: null,
          last_doctor_target_name: null,
          last_detective_target_name: null,
        };
      }

      // AFTER resolving actions, check win conditions with fresh data
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

      // Check win conditions after actions resolved
      if (aliveMafia.length === 0) {
        await endGame('civilians');
        return;
      }
      if (aliveMafia.length >= aliveTown.length) {
        await endGame('mafia');
        return;
      }

      // No phase_end_time since we're action-based only
      await supabase
        .from('game_state')
        .update({
          phase: newPhase,
          day_number: newDayNumber,
          phase_end_time: null,
          ...updates,
        })
        .eq('id', gameState.id);
    } finally {
      advancingPhaseRef.current = false;
    }
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
        // Always reveal role on death - show Mafia or Civilian
        const displayRole = victim.role === 'mafia' ? 'Mafia' : 'Civilian';
        const nickname = (victim.player as any)?.nickname || 'Unknown';
        
        await supabase.from('messages').insert({
          room_id: roomId,
          content: `☠️ ${nickname} was found dead this morning. They were a ${displayRole}.`,
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
  }

  async function resolveVoting(roomPlayers: (RoomPlayer & { player: Player })[]) {
    if (!gameState || !roomId) return;

    // Fetch fresh votes from database instead of using stale state
    const { data: freshVotes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('day_number', gameState.day_number);

    if (votesError) {
      console.error('Error fetching votes for resolution:', votesError);
      return;
    }

    // Count votes
    const voteCounts: Record<string, number> = {};
    for (const vote of (freshVotes || [])) {
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
        // Always reveal role on elimination - show Mafia or Civilian
        const displayRole = victim.role === 'mafia' ? 'Mafia' : 'Civilian';
        const nickname = (victim.player as any)?.nickname || 'Unknown';
        
        await supabase.from('messages').insert({
          room_id: roomId,
          content: `⚖️ The town has spoken. ${nickname} has been eliminated. They were a ${displayRole}.`,
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

  async function restartGame(roomPlayers: (RoomPlayer & { player: Player })[], roomConfig: { mafia_count: number; doctor_count: number; detective_count: number }) {
    if (!roomId) return;

    // First update room status to waiting - this ensures all clients see lobby
    await supabase
      .from('rooms')
      .update({ status: 'waiting' })
      .eq('id', roomId);

    // Delete old game state
    await supabase
      .from('game_state')
      .delete()
      .eq('room_id', roomId);

    // Delete old votes
    await supabase
      .from('votes')
      .delete()
      .eq('room_id', roomId);

    // Delete old game actions
    await supabase
      .from('game_actions')
      .delete()
      .eq('room_id', roomId);

    // Reset all players: make alive, remove roles, set not ready (batch update)
    await supabase
      .from('room_players')
      .update({ is_alive: true, role: null, is_ready: false })
      .eq('room_id', roomId);

    // Add system message
    await supabase.from('messages').insert({
      room_id: roomId,
      content: '🔄 Game has been reset. Waiting for players to ready up...',
      is_system: true,
    });

    // Clear local state immediately
    setGameState(null);
    setVotes([]);
    setShowVotingCountdown(false);
    setShowNightCountdown(false);
    advancingPhaseRef.current = false;
    nightCountdownTriggeredRef.current = false;
  }

  // Check if all alive players have voted
  const allVotesIn = useMemo(() => {
    if (!gameState || gameState.phase !== 'day_voting' || !roomPlayers) return false;
    const alivePlayers = roomPlayers.filter(p => p.is_alive);
    return votes.length >= alivePlayers.length;
  }, [gameState, roomPlayers, votes]);

  // Trigger countdown when all votes are in
  useEffect(() => {
    if (allVotesIn && gameState?.phase === 'day_voting' && !showVotingCountdown && !advancingPhaseRef.current) {
      setShowVotingCountdown(true);
    }
  }, [allVotesIn, gameState?.phase, showVotingCountdown]);

  // Reset countdowns on phase change
  useEffect(() => {
    setShowVotingCountdown(false);
    setShowNightCountdown(false);
  }, [gameState?.phase, gameState?.day_number]);

  const handleVotingCountdownComplete = useCallback(async (shouldAdvance: boolean) => {
    setShowVotingCountdown(false);
    if (!shouldAdvance) return;
    if (!roomPlayers || advancingPhaseRef.current) return;
    await advancePhase(roomPlayers);
  }, [roomPlayers, advancePhase]);

  const handleNightCountdownComplete = useCallback(async (shouldAdvance: boolean) => {
    setShowNightCountdown(false);
    if (!shouldAdvance) return;
    if (!roomPlayers || advancingPhaseRef.current) return;
    await advancePhase(roomPlayers);
  }, [roomPlayers, advancePhase]);

  return {
    gameState,
    votes,
    loading,
    showVotingCountdown,
    showNightCountdown,
    allVotesIn,
    startGame,
    restartGame,
    submitNightAction,
    submitVote,
    advancePhase,
    handleVotingCountdownComplete,
    handleNightCountdownComplete,
    refetch: fetchGameState,
  };
}
